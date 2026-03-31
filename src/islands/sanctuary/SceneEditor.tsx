import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import {
  Copy,
  Download,
  Eraser,
  Grid3x3,
  Import,
  Layers2,
  MousePointer2,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
} from "lucide-react";
import {
  sceneAtlasCatalog,
  sceneAtlasEntries,
  type SceneAtlasId,
} from "@/lib/sanctuary/canvas/atlasCatalog";
import { drawPixelAvatar } from "@/lib/sanctuary/canvas/avatarPainter";
import {
  drawSceneBackground,
  drawSceneProp,
} from "@/lib/sanctuary/canvas/renderer";
import {
  publishSceneMaps,
  publishSceneMapsToServer,
  sceneMaps,
  syncPublishedSceneMapsFromServer,
} from "@/lib/sanctuary/canvas/sceneMaps";
import {
  sceneLayerOrder,
  type Facing,
  type SceneKind,
  type SceneLayer,
  type SceneMap,
  type SceneProp,
  type TilePoint,
} from "@/lib/sanctuary/canvas/types";
import {
  getCurrentProfileSummary,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const STORAGE_KEY = "scholars-sanctuary-scene-editor-v1";
const ATLAS_VIEW_STORAGE_KEY = "scholars-sanctuary-scene-editor-atlas-view-v1";
const ATLAS_PREVIEW_ZOOM_STORAGE_KEY =
  "scholars-sanctuary-scene-editor-atlas-preview-zoom-v1";
const TILE_SNAP = 2;
const MIN_ATLAS_PREVIEW_ZOOM = 0.1;
const MIN_PROP_SCALE = 0.05;
const MIN_PROP_SIZE = 4;
const MAX_HISTORY_STEPS = 80;
const ATLAS_PREVIEW_MODAL_WIDTH = 720;
const ATLAS_PREVIEW_MODAL_HEIGHT = 460;

type EditorTool =
  | "select"
  | "prop"
  | "spawnLocal"
  | "seatLocal"
  | "wanderNodes"
  | "remoteSlots";

type Selection =
  | { kind: "prop"; id: string }
  | { kind: "spawnLocal" }
  | { kind: "seatLocal"; index: number }
  | { kind: "wanderNodes"; index: number }
  | { kind: "remoteSlots"; index: number }
  | null;

interface PropCatalogItem {
  key: string;
  label: string;
  category: "atlas" | "atlas-sheet" | "garden";
  template: Omit<SceneProp, "id" | "x" | "y">;
}

interface EditorDrafts {
  "solo-library": SceneMap;
  "shared-library": SceneMap;
  "public-library": SceneMap;
  garden: SceneMap;
}

interface DragState {
  selection: Exclude<Selection, null>;
  offsetX: number;
  offsetY: number;
}

interface PropPreviewCanvasProps {
  prop: Omit<SceneProp, "id">;
  atlasImages: Partial<Record<string, HTMLImageElement>>;
  size?: number;
  className?: string;
}

interface AtlasViewportOrigin {
  x: number;
  y: number;
}

const sceneLabels: Record<SceneKind, string> = {
  "solo-library": "Santuario silencioso",
  "shared-library": "Biblioteca compartida",
  "public-library": "Biblioteca pública",
  garden: "Jardín",
};

const toolLabels: Record<EditorTool, string> = {
  select: "Seleccionar",
  prop: "Colocar prop",
  spawnLocal: "Spawn local",
  seatLocal: "Asientos",
  wanderNodes: "Ruta de paseo",
  remoteSlots: "Slots remotos",
};

const sceneLayerLabels: Record<SceneLayer, string> = {
  back: "Fondo",
  "mid-back": "Medio detrás",
  "mid-front": "Medio delante",
  front: "Frente",
};

const facingLabels: Record<Facing, string> = {
  down: "Frente",
  left: "Izquierda",
  up: "Espalda",
  right: "Derecha",
};

const facingPresets: Array<{ value: Facing; rotation: number; label: string }> =
  [
    { value: "down", rotation: 0, label: "Frente" },
    { value: "right", rotation: 90, label: "Derecha" },
    { value: "up", rotation: 180, label: "Espalda" },
    { value: "left", rotation: -90, label: "Izquierda" },
  ];

function normalizeFacing(value: unknown, fallback: Facing): Facing {
  return value === "up" ||
    value === "down" ||
    value === "left" ||
    value === "right"
    ? value
    : fallback;
}

function getFacingRotation(facing: Facing) {
  return facingPresets.find((preset) => preset.value === facing)?.rotation ?? 0;
}

function clonePoint(point: TilePoint) {
  return { x: point.x, y: point.y };
}

function cloneProp(prop: SceneProp): SceneProp {
  return {
    ...prop,
    source: prop.source ? { ...prop.source } : undefined,
    hidden: prop.hidden,
    blocksMovement: prop.blocksMovement,
  };
}

function cloneSceneMap(map: SceneMap): SceneMap {
  return {
    ...map,
    spawnLocal: clonePoint(map.spawnLocal),
    spawnFacing: map.spawnFacing,
    seatLocal: map.seatLocal ? clonePoint(map.seatLocal) : undefined,
    seatSlots: map.seatSlots?.map(clonePoint),
    seatFacings: map.seatFacings ? [...map.seatFacings] : undefined,
    wanderNodes: map.wanderNodes.map(clonePoint),
    remoteSlots: map.remoteSlots.map(clonePoint),
    remoteSlotFacings: map.remoteSlotFacings
      ? [...map.remoteSlotFacings]
      : undefined,
    props: map.props.map(cloneProp),
    theme: { ...map.theme },
  };
}

function getSeatPoints(scene: SceneMap) {
  if (scene.seatSlots?.length) {
    return scene.seatSlots;
  }

  return scene.seatLocal ? [scene.seatLocal] : [];
}

function setSeatPoints(scene: SceneMap, points: TilePoint[]) {
  const nextPoints = points.map(clonePoint);
  scene.seatSlots = nextPoints.length > 0 ? nextPoints : undefined;
  scene.seatLocal = nextPoints[0] ? clonePoint(nextPoints[0]) : undefined;
  scene.seatFacings = nextPoints.length
    ? nextPoints.map(
        (_point, index) =>
          scene.seatFacings?.[index] ?? scene.spawnFacing ?? "up",
      )
    : undefined;
}

function setSeatFacing(scene: SceneMap, index: number, facing: Facing) {
  const seatPoints = getSeatPoints(scene);
  if (!seatPoints[index]) {
    return;
  }

  const nextFacings = seatPoints.map((_point, currentIndex) =>
    currentIndex === index
      ? facing
      : (scene.seatFacings?.[currentIndex] ?? scene.spawnFacing ?? "up"),
  );
  scene.seatFacings = nextFacings;
}

function getSeatFacing(scene: SceneMap, index: number) {
  return scene.seatFacings?.[index] ?? scene.spawnFacing ?? "up";
}

function setRemoteSlotFacing(scene: SceneMap, index: number, facing: Facing) {
  if (!scene.remoteSlots[index]) {
    return;
  }

  scene.remoteSlotFacings = scene.remoteSlots.map((_slot, currentIndex) =>
    currentIndex === index
      ? facing
      : (scene.remoteSlotFacings?.[currentIndex] ?? "up"),
  );
}

function getRemoteSlotFacing(scene: SceneMap, index: number) {
  return scene.remoteSlotFacings?.[index] ?? "up";
}

function createDefaultDrafts(): EditorDrafts {
  return {
    "solo-library": cloneSceneMap(sceneMaps["solo-library"]),
    "shared-library": cloneSceneMap(sceneMaps["shared-library"]),
    "public-library": cloneSceneMap(sceneMaps["public-library"]),
    garden: cloneSceneMap(sceneMaps.garden),
  };
}

function cloneDrafts(drafts: EditorDrafts): EditorDrafts {
  return {
    "solo-library": cloneSceneMap(drafts["solo-library"]),
    "shared-library": cloneSceneMap(drafts["shared-library"]),
    "public-library": cloneSceneMap(drafts["public-library"]),
    garden: cloneSceneMap(drafts.garden),
  };
}

function prettifyLabel(input: string) {
  return input
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildCatalog(): PropCatalogItem[] {
  const seen = new Set<string>();
  const catalog: PropCatalogItem[] = [];

  (Object.values(sceneMaps) as SceneMap[]).forEach((scene) => {
    scene.props.forEach((prop) => {
      const key = prop.shape
        ? `shape:${prop.shape}`
        : `atlas:${prop.source?.x ?? 0}:${prop.source?.y ?? 0}:${prop.source?.w ?? 0}:${prop.source?.h ?? 0}:${prop.w}:${prop.h}`;

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      catalog.push({
        key,
        label: prettifyLabel(prop.id),
        category: prop.shape ? "garden" : "atlas",
        template: {
          atlas: prop.atlas,
          source: prop.source ? { ...prop.source } : undefined,
          w: prop.w,
          h: prop.h,
          rotation: prop.rotation,
          layer: prop.layer,
          alpha: prop.alpha,
          tint: prop.tint,
          shape: prop.shape,
          hidden: prop.hidden,
          blocksMovement: prop.blocksMovement ?? prop.shape !== "path",
        },
      });
    });
  });

  sceneAtlasEntries.forEach((entry) => {
    const key = `atlas-sheet:${entry.id}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    const defaultRenderScale =
      "defaultRenderScale" in entry ? entry.defaultRenderScale : 1;
    catalog.push({
      key,
      label: `Nuevo recorte · ${entry.label}`,
      category: "atlas-sheet",
      template: {
        atlas: entry.id,
        source: {
          x: 0,
          y: 0,
          w: entry.defaultSlice.w,
          h: entry.defaultSlice.h,
        },
        w: Math.max(
          MIN_PROP_SIZE,
          Math.round(entry.defaultSlice.w * defaultRenderScale),
        ),
        h: Math.max(
          MIN_PROP_SIZE,
          Math.round(entry.defaultSlice.h * defaultRenderScale),
        ),
        rotation: 0,
        layer: "back",
        blocksMovement: true,
      },
    });
  });

  return catalog.sort((left, right) => {
    if (left.category === right.category) {
      return left.label.localeCompare(right.label, "es");
    }
    const order = { "atlas-sheet": 0, atlas: 1, garden: 2 } as const;
    return order[left.category] - order[right.category];
  });
}

function snapPixel(value: number) {
  return Math.round(value / TILE_SNAP) * TILE_SNAP;
}

function snapTile(value: number) {
  return Math.round(value * 2) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getLayerOrder(layer: SceneLayer) {
  const index = sceneLayerOrder.indexOf(layer);
  return index === -1 ? 0 : index;
}

function isFormFieldTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function getPropScaleValue(prop: SceneProp) {
  if (!prop.source) {
    return 1;
  }

  const scaleX = prop.w / Math.max(1, prop.source.w);
  const scaleY = prop.h / Math.max(1, prop.source.h);
  return Math.max(
    MIN_PROP_SCALE,
    Number(((scaleX + scaleY) / 2 || 1).toFixed(2)),
  );
}

function applyPropScale(prop: SceneProp, scale: number) {
  const safeScale = Math.max(MIN_PROP_SCALE, scale);
  if (prop.source) {
    prop.w = Math.max(MIN_PROP_SIZE, Math.round(prop.source.w * safeScale));
    prop.h = Math.max(MIN_PROP_SIZE, Math.round(prop.source.h * safeScale));
    return;
  }

  prop.w = Math.max(MIN_PROP_SIZE, Math.round(prop.w * safeScale));
  prop.h = Math.max(MIN_PROP_SIZE, Math.round(prop.h * safeScale));
}

function normalizeRotation(value?: number) {
  const safe = Number.isFinite(value) ? (value as number) : 0;
  const normalized = ((safe % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

function getPropRotationRadians(prop: SceneProp) {
  return (normalizeRotation(prop.rotation) * Math.PI) / 180;
}

function getRotatedBounds(prop: SceneProp) {
  const radians = getPropRotationRadians(prop);
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    width: prop.w * cos + prop.h * sin,
    height: prop.w * sin + prop.h * cos,
  };
}

function getAtlasViewportWindow(
  atlasImage: HTMLImageElement,
  zoom: number,
  previewWidth: number,
  previewHeight: number,
) {
  const safeZoom = clamp(zoom, MIN_ATLAS_PREVIEW_ZOOM, 6);
  return {
    viewportW: Math.max(
      32,
      Math.min(atlasImage.width, Math.round((previewWidth - 16) / safeZoom)),
    ),
    viewportH: Math.max(
      32,
      Math.min(atlasImage.height, Math.round((previewHeight - 16) / safeZoom)),
    ),
  };
}

function getCenteredAtlasViewport(
  source: NonNullable<SceneProp["source"]>,
  atlasImage: HTMLImageElement,
  zoom: number,
  previewWidth = ATLAS_PREVIEW_MODAL_WIDTH,
  previewHeight = ATLAS_PREVIEW_MODAL_HEIGHT,
) {
  const { viewportW, viewportH } = getAtlasViewportWindow(
    atlasImage,
    zoom,
    previewWidth,
    previewHeight,
  );
  const centerX = source.x + source.w / 2;
  const centerY = source.y + source.h / 2;
  return {
    x: clamp(
      Math.round(centerX - viewportW / 2),
      0,
      Math.max(0, atlasImage.width - viewportW),
    ),
    y: clamp(
      Math.round(centerY - viewportH / 2),
      0,
      Math.max(0, atlasImage.height - viewportH),
    ),
  };
}

function clampPropPosition(
  prop: SceneProp,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const bounds = getRotatedBounds(prop);
  const minX = Math.ceil(bounds.width / 2 - prop.w / 2);
  const minY = Math.ceil(bounds.height / 2 - prop.h / 2);
  const maxX = Math.floor(maxWidth - bounds.width / 2 - prop.w / 2);
  const maxY = Math.floor(maxHeight - bounds.height / 2 - prop.h / 2);
  return {
    x: clamp(snapPixel(x), Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(snapPixel(y), Math.min(minY, maxY), Math.max(minY, maxY)),
  };
}

function buildPreviewProp(
  prop: Omit<SceneProp, "id">,
  previewSize: number,
): SceneProp {
  const padding = 8;
  const bounds = getRotatedBounds({
    ...prop,
    id: "preview-bounds",
    x: 0,
    y: 0,
  });
  const scale = Math.min(
    (previewSize - padding * 2) / bounds.width,
    (previewSize - padding * 2) / bounds.height,
    1.75,
  );
  const width = Math.max(8, Math.round(prop.w * scale));
  const height = Math.max(8, Math.round(prop.h * scale));
  const scaledBounds = getRotatedBounds({
    ...prop,
    id: "preview-bounds",
    x: 0,
    y: 0,
    w: width,
    h: height,
  });

  return {
    ...prop,
    id: "preview",
    x: Math.round((previewSize - width) / 2 - (scaledBounds.width - width) / 2),
    y: Math.round(
      (previewSize - height) / 2 - (scaledBounds.height - height) / 2,
    ),
    w: width,
    h: height,
  };
}

function createPropId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeTilePoint(value: unknown, fallback: TilePoint): TilePoint {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const point = value as Record<string, unknown>;
  return {
    x: typeof point.x === "number" ? point.x : fallback.x,
    y: typeof point.y === "number" ? point.y : fallback.y,
  };
}

function normalizeSceneMap(value: unknown, sceneKind: SceneKind): SceneMap {
  const fallback = cloneSceneMap(sceneMaps[sceneKind]);

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Record<string, unknown>;
  const props = Array.isArray(candidate.props)
    ? candidate.props
        .filter((entry) => entry && typeof entry === "object")
        .map((entry, index) => {
          const prop = entry as Record<string, unknown>;
          return {
            id:
              typeof prop.id === "string"
                ? prop.id
                : createPropId(`prop-${index}`),
            atlas: typeof prop.atlas === "string" ? prop.atlas : undefined,
            source:
              prop.source && typeof prop.source === "object"
                ? {
                    x:
                      typeof (prop.source as Record<string, unknown>).x ===
                      "number"
                        ? ((prop.source as Record<string, unknown>).x as number)
                        : 0,
                    y:
                      typeof (prop.source as Record<string, unknown>).y ===
                      "number"
                        ? ((prop.source as Record<string, unknown>).y as number)
                        : 0,
                    w:
                      typeof (prop.source as Record<string, unknown>).w ===
                      "number"
                        ? ((prop.source as Record<string, unknown>).w as number)
                        : 0,
                    h:
                      typeof (prop.source as Record<string, unknown>).h ===
                      "number"
                        ? ((prop.source as Record<string, unknown>).h as number)
                        : 0,
                  }
                : undefined,
            x: typeof prop.x === "number" ? prop.x : 0,
            y: typeof prop.y === "number" ? prop.y : 0,
            w: typeof prop.w === "number" ? prop.w : 32,
            h: typeof prop.h === "number" ? prop.h : 32,
            rotation:
              typeof prop.rotation === "number"
                ? normalizeRotation(prop.rotation)
                : 0,
            layer:
              prop.layer === "mid-back" ||
              prop.layer === "mid-front" ||
              prop.layer === "front"
                ? prop.layer
                : "back",
            alpha: typeof prop.alpha === "number" ? prop.alpha : undefined,
            tint: typeof prop.tint === "string" ? prop.tint : undefined,
            hidden: typeof prop.hidden === "boolean" ? prop.hidden : undefined,
            blocksMovement:
              typeof prop.blocksMovement === "boolean"
                ? prop.blocksMovement
                : prop.shape === "path"
                  ? false
                  : undefined,
            shape:
              prop.shape === "tree" ||
              prop.shape === "column" ||
              prop.shape === "bench" ||
              prop.shape === "path"
                ? prop.shape
                : undefined,
          } satisfies SceneProp;
        })
    : fallback.props;

  const normalizedSeatLocal =
    candidate.seatLocal === null
      ? undefined
      : normalizeTilePoint(
          candidate.seatLocal,
          fallback.seatLocal ?? fallback.spawnLocal,
        );
  const normalizedSeatSlots = Array.isArray(candidate.seatSlots)
    ? candidate.seatSlots.map((point) =>
        normalizeTilePoint(point, fallback.seatLocal ?? fallback.spawnLocal),
      )
    : candidate.seatLocal
      ? [
          normalizedSeatLocal ??
            normalizeTilePoint(
              candidate.seatLocal,
              fallback.seatLocal ?? fallback.spawnLocal,
            ),
        ]
      : fallback.seatSlots;
  const primarySeat = normalizedSeatSlots?.[0] ?? normalizedSeatLocal;

  return {
    name: sceneKind,
    width:
      typeof candidate.width === "number" ? candidate.width : fallback.width,
    height:
      typeof candidate.height === "number" ? candidate.height : fallback.height,
    tileSize:
      typeof candidate.tileSize === "number"
        ? candidate.tileSize
        : fallback.tileSize,
    spawnLocal: normalizeTilePoint(candidate.spawnLocal, fallback.spawnLocal),
    spawnFacing: normalizeFacing(
      candidate.spawnFacing,
      fallback.spawnFacing ?? "down",
    ),
    seatLocal: primarySeat,
    seatSlots: normalizedSeatSlots,
    seatFacings: Array.isArray(candidate.seatFacings)
      ? candidate.seatFacings.map((facing, index) =>
          normalizeFacing(
            facing,
            fallback.seatFacings?.[index] ?? fallback.spawnFacing ?? "up",
          ),
        )
      : normalizedSeatSlots?.map(
          (_point, index) =>
            fallback.seatFacings?.[index] ?? fallback.spawnFacing ?? "up",
        ),
    wanderNodes: Array.isArray(candidate.wanderNodes)
      ? candidate.wanderNodes.map((point) =>
          normalizeTilePoint(point, fallback.spawnLocal),
        )
      : fallback.wanderNodes,
    remoteSlots: Array.isArray(candidate.remoteSlots)
      ? candidate.remoteSlots.map((point) =>
          normalizeTilePoint(point, fallback.spawnLocal),
        )
      : fallback.remoteSlots,
    remoteSlotFacings: Array.isArray(candidate.remoteSlotFacings)
      ? candidate.remoteSlotFacings.map((facing, index) =>
          normalizeFacing(facing, fallback.remoteSlotFacings?.[index] ?? "up"),
        )
      : fallback.remoteSlots.map(
          (_point, index) => fallback.remoteSlotFacings?.[index] ?? "up",
        ),
    props,
    theme: {
      skyTop:
        candidate.theme &&
        typeof candidate.theme === "object" &&
        typeof (candidate.theme as Record<string, unknown>).skyTop === "string"
          ? ((candidate.theme as Record<string, unknown>).skyTop as string)
          : fallback.theme.skyTop,
      skyBottom:
        candidate.theme &&
        typeof candidate.theme === "object" &&
        typeof (candidate.theme as Record<string, unknown>).skyBottom ===
          "string"
          ? ((candidate.theme as Record<string, unknown>).skyBottom as string)
          : fallback.theme.skyBottom,
      floorA:
        candidate.theme &&
        typeof candidate.theme === "object" &&
        typeof (candidate.theme as Record<string, unknown>).floorA === "string"
          ? ((candidate.theme as Record<string, unknown>).floorA as string)
          : fallback.theme.floorA,
      floorB:
        candidate.theme &&
        typeof candidate.theme === "object" &&
        typeof (candidate.theme as Record<string, unknown>).floorB === "string"
          ? ((candidate.theme as Record<string, unknown>).floorB as string)
          : fallback.theme.floorB,
      border:
        candidate.theme &&
        typeof candidate.theme === "object" &&
        typeof (candidate.theme as Record<string, unknown>).border === "string"
          ? ((candidate.theme as Record<string, unknown>).border as string)
          : fallback.theme.border,
      glow:
        candidate.theme &&
        typeof candidate.theme === "object" &&
        typeof (candidate.theme as Record<string, unknown>).glow === "string"
          ? ((candidate.theme as Record<string, unknown>).glow as string)
          : fallback.theme.glow,
    },
  };
}

function loadDrafts(): EditorDrafts {
  if (typeof window === "undefined") {
    return createDefaultDrafts();
  }

  const defaults = createDefaultDrafts();
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<SceneKind, unknown>>;
    return {
      "solo-library": parsed["solo-library"]
        ? normalizeSceneMap(parsed["solo-library"], "solo-library")
        : defaults["solo-library"],
      "shared-library": parsed["shared-library"]
        ? normalizeSceneMap(parsed["shared-library"], "shared-library")
        : defaults["shared-library"],
      "public-library": parsed["public-library"]
        ? normalizeSceneMap(parsed["public-library"], "public-library")
        : defaults["public-library"],
      garden: parsed.garden
        ? normalizeSceneMap(parsed.garden, "garden")
        : defaults.garden,
    };
  } catch {
    return defaults;
  }
}

function loadAtlasViewPositions() {
  if (typeof window === "undefined") {
    return {} as Record<string, AtlasViewportOrigin>;
  }

  try {
    const raw = window.localStorage.getItem(ATLAS_VIEW_STORAGE_KEY);
    if (!raw) {
      return {} as Record<string, AtlasViewportOrigin>;
    }
    const parsed = JSON.parse(raw) as Record<string, AtlasViewportOrigin>;
    return parsed ?? {};
  } catch {
    return {} as Record<string, AtlasViewportOrigin>;
  }
}

function loadAtlasPreviewZooms() {
  if (typeof window === "undefined") {
    return {} as Record<string, number>;
  }

  try {
    const raw = window.localStorage.getItem(ATLAS_PREVIEW_ZOOM_STORAGE_KEY);
    if (!raw) {
      return {} as Record<string, number>;
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed ?? {};
  } catch {
    return {} as Record<string, number>;
  }
}

function findProp(scene: SceneMap, id: string) {
  return scene.props.find((prop) => prop.id === id) ?? null;
}

function sanitizeSelection(scene: SceneMap, selection: Selection): Selection {
  if (!selection) {
    return null;
  }

  if (selection.kind === "prop") {
    return findProp(scene, selection.id) ? selection : null;
  }

  if (selection.kind === "spawnLocal") {
    return selection;
  }

  if (selection.kind === "seatLocal") {
    return getSeatPoints(scene)[selection.index] ? selection : null;
  }

  if (selection.kind === "wanderNodes") {
    return scene.wanderNodes[selection.index] ? selection : null;
  }

  return scene.remoteSlots[selection.index] ? selection : null;
}

function findSelectionAt(scene: SceneMap, x: number, y: number): Selection {
  const markerRadius = 8;

  const checkMarker = (
    point: TilePoint,
    selection: Exclude<Selection, null>,
  ) => {
    const markerX = point.x * scene.tileSize;
    const markerY = point.y * scene.tileSize;
    return Math.hypot(markerX - x, markerY - y) <= markerRadius
      ? selection
      : null;
  };

  const spawnHit = checkMarker(scene.spawnLocal, { kind: "spawnLocal" });
  if (spawnHit) {
    return spawnHit;
  }

  const seatPoints = getSeatPoints(scene);
  for (let index = 0; index < seatPoints.length; index += 1) {
    const seatHit = checkMarker(seatPoints[index], {
      kind: "seatLocal",
      index,
    });
    if (seatHit) {
      return seatHit;
    }
  }

  for (let index = 0; index < scene.wanderNodes.length; index += 1) {
    const hit = checkMarker(scene.wanderNodes[index], {
      kind: "wanderNodes",
      index,
    });
    if (hit) {
      return hit;
    }
  }

  for (let index = 0; index < scene.remoteSlots.length; index += 1) {
    const hit = checkMarker(scene.remoteSlots[index], {
      kind: "remoteSlots",
      index,
    });
    if (hit) {
      return hit;
    }
  }

  const orderedProps = [...scene.props].sort(
    (left, right) => getLayerOrder(left.layer) - getLayerOrder(right.layer),
  );

  for (let index = orderedProps.length - 1; index >= 0; index -= 1) {
    const prop = orderedProps[index];
    const centerX = prop.x + prop.w / 2;
    const centerY = prop.y + prop.h / 2;
    const radians = -getPropRotationRadians(prop);
    const localX =
      (x - centerX) * Math.cos(radians) - (y - centerY) * Math.sin(radians);
    const localY =
      (x - centerX) * Math.sin(radians) + (y - centerY) * Math.cos(radians);
    if (Math.abs(localX) <= prop.w / 2 && Math.abs(localY) <= prop.h / 2) {
      return { kind: "prop", id: prop.id };
    }
  }

  return null;
}

function drawGrid(ctx: CanvasRenderingContext2D, scene: SceneMap) {
  const width = scene.width * scene.tileSize;
  const height = scene.height * scene.tileSize;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += scene.tileSize) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += scene.tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  scene: SceneMap,
  point: TilePoint,
  label: string,
  color: string,
  selected: boolean,
) {
  const x = point.x * scene.tileSize;
  const y = point.y * scene.tileSize;

  ctx.save();
  ctx.fillStyle = selected ? "#fff3d4" : color;
  ctx.fillRect(x - 3, y - 3, 6, 6);
  ctx.strokeStyle = selected ? "#ffb961" : "#171311";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 3.5, y - 3.5, 7, 7);
  ctx.fillStyle = "#171311";
  ctx.font = "bold 7px monospace";
  ctx.fillText(label, x + 6, y - 5);
  ctx.restore();
}

function getAtlasMeta(atlasId?: string) {
  if (!atlasId) {
    return null;
  }
  return sceneAtlasCatalog[atlasId as SceneAtlasId] ?? null;
}

function PropPreviewCanvas({
  prop,
  atlasImages,
  size = 72,
  className = "",
}: PropPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#17110f";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < size; x += 8) {
      for (let y = 0; y < size; y += 8) {
        if (((x + y) / 8) % 2 === 0) {
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }

    const previewProp = buildPreviewProp(prop, size);
    drawSceneProp(
      ctx,
      {
        ...previewProp,
        hidden: false,
        alpha:
          previewProp.hidden && (previewProp.alpha ?? 1) > 0
            ? Math.min(0.32, previewProp.alpha ?? 1)
            : previewProp.alpha,
      },
      atlasImages,
    );

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [atlasImages, prop, size]);

  return (
    <canvas
      ref={canvasRef}
      className={`block border border-outline-variant bg-surface-variant ${className}`}
      style={{
        imageRendering: "pixelated",
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
}

function AtlasSheetPreview({
  atlasImage,
  size = 72,
  className = "",
}: {
  atlasImage: HTMLImageElement | null;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#17110f";
    ctx.fillRect(0, 0, size, size);

    if (!atlasImage) {
      ctx.fillStyle = "#f0d6b0";
      ctx.font = "bold 9px monospace";
      ctx.fillText("...", Math.floor(size / 2) - 8, Math.floor(size / 2));
    } else {
      const padding = 6;
      const scale = Math.min(
        (size - padding * 2) / atlasImage.width,
        (size - padding * 2) / atlasImage.height,
      );
      const drawW = Math.max(8, Math.floor(atlasImage.width * scale));
      const drawH = Math.max(8, Math.floor(atlasImage.height * scale));
      const drawX = Math.floor((size - drawW) / 2);
      const drawY = Math.floor((size - drawH) / 2);
      ctx.drawImage(
        atlasImage,
        0,
        0,
        atlasImage.width,
        atlasImage.height,
        drawX,
        drawY,
        drawW,
        drawH,
      );
    }

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [atlasImage, size]);

  return (
    <canvas
      ref={canvasRef}
      className={`block border border-outline-variant bg-surface-variant ${className}`}
      style={{
        imageRendering: "pixelated",
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
}

function AtlasSourcePreview({
  source,
  atlasImage,
  viewportOrigin,
  onViewportChange,
  onSourceChange,
  zoom = 1,
  width = 220,
  height = 136,
}: {
  source: NonNullable<SceneProp["source"]>;
  atlasImage: HTMLImageElement | null;
  viewportOrigin?: AtlasViewportOrigin | null;
  onViewportChange?: (next: AtlasViewportOrigin) => void;
  onSourceChange?: (next: NonNullable<SceneProp["source"]>) => void;
  zoom?: number;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOriginX: number;
    startOriginY: number;
    scale: number;
    viewportW: number;
    viewportH: number;
  } | null>(null);
  const renderStateRef = useRef<{
    scale: number;
    viewportW: number;
    viewportH: number;
    originX: number;
    originY: number;
    drawX: number;
    drawY: number;
    drawW: number;
    drawH: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#17110f";
    ctx.fillRect(0, 0, width, height);

    if (!atlasImage) {
      ctx.fillStyle = "#f0d6b0";
      ctx.font = "bold 11px monospace";
      ctx.fillText("Cargando atlas...", 16, 24);
      renderStateRef.current = null;
      return;
    }

    const { viewportW, viewportH } = getAtlasViewportWindow(
      atlasImage,
      zoom,
      width,
      height,
    );
    const maxX = Math.max(0, atlasImage.width - viewportW);
    const maxY = Math.max(0, atlasImage.height - viewportH);
    const originX = clamp(
      viewportOrigin?.x ??
        getCenteredAtlasViewport(source, atlasImage, zoom, width, height).x,
      0,
      maxX,
    );
    const originY = clamp(
      viewportOrigin?.y ??
        getCenteredAtlasViewport(source, atlasImage, zoom, width, height).y,
      0,
      maxY,
    );
    const scale = Math.min((width - 16) / viewportW, (height - 16) / viewportH);
    const drawW = Math.floor(viewportW * scale);
    const drawH = Math.floor(viewportH * scale);
    const drawX = Math.floor((width - drawW) / 2);
    const drawY = Math.floor((height - drawH) / 2);

    ctx.drawImage(
      atlasImage,
      originX,
      originY,
      viewportW,
      viewportH,
      drawX,
      drawY,
      drawW,
      drawH,
    );

    ctx.strokeStyle = "#ffb961";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      drawX + (source.x - originX) * scale,
      drawY + (source.y - originY) * scale,
      source.w * scale,
      source.h * scale,
    );

    ctx.fillStyle = "rgba(23,17,15,0.84)";
    ctx.fillRect(8, height - 26, width - 16, 18);
    ctx.fillStyle = "#ede0dc";
    ctx.font = "bold 10px monospace";
    ctx.fillText(
      `x:${source.x} y:${source.y} w:${source.w} h:${source.h}`,
      14,
      height - 14,
    );

    renderStateRef.current = {
      scale,
      viewportW,
      viewportH,
      originX,
      originY,
      drawX,
      drawY,
      drawW,
      drawH,
    };
  }, [atlasImage, source, viewportOrigin, zoom, width, height]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!atlasImage || !renderStateRef.current || !onViewportChange) {
      return;
    }

    const state = renderStateRef.current;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOriginX: state.originX,
      startOriginY: state.originY,
      scale: state.scale,
      viewportW: state.viewportW,
      viewportH: state.viewportH,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (
      !atlasImage ||
      !dragStateRef.current ||
      dragStateRef.current.pointerId !== event.pointerId ||
      !onViewportChange
    ) {
      return;
    }

    const drag = dragStateRef.current;
    const deltaX = (event.clientX - drag.startClientX) / drag.scale;
    const deltaY = (event.clientY - drag.startClientY) / drag.scale;
    const maxX = Math.max(0, atlasImage.width - drag.viewportW);
    const maxY = Math.max(0, atlasImage.height - drag.viewportH);

    onViewportChange({
      x: clamp(Math.round(drag.startOriginX - deltaX), 0, maxX),
      y: clamp(Math.round(drag.startOriginY - deltaY), 0, maxY),
    });
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!atlasImage || !renderStateRef.current || !onSourceChange) {
      return;
    }

    const state = renderStateRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasX = ((event.clientX - rect.left) / rect.width) * width;
    const canvasY = ((event.clientY - rect.top) / rect.height) * height;

    if (
      canvasX < state.drawX ||
      canvasY < state.drawY ||
      canvasX > state.drawX + state.drawW ||
      canvasY > state.drawY + state.drawH
    ) {
      return;
    }

    const atlasPointX =
      state.originX + ((canvasX - state.drawX) / state.drawW) * state.viewportW;
    const atlasPointY =
      state.originY + ((canvasY - state.drawY) / state.drawH) * state.viewportH;
    const nextSource = {
      ...source,
      x: clamp(
        Math.round(atlasPointX - source.w / 2),
        0,
        Math.max(0, atlasImage.width - source.w),
      ),
      y: clamp(
        Math.round(atlasPointY - source.h / 2),
        0,
        Math.max(0, atlasImage.height - source.h),
      ),
    };

    onSourceChange(nextSource);

    if (onViewportChange) {
      onViewportChange(
        getCenteredAtlasViewport(nextSource, atlasImage, zoom, width, height),
      );
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="block w-full cursor-grab border border-outline-variant bg-surface-variant active:cursor-grabbing"
      style={{ imageRendering: "pixelated" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDoubleClick={handleDoubleClick}
    />
  );
}

export function SceneEditor() {
  const sanctuary = useSanctuaryStore();
  const { profile } = getCurrentProfileSummary(sanctuary);
  const currentAvatar = profile.avatar;
  const catalog = useRef(buildCatalog()).current;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportShellRef = useRef<HTMLDivElement | null>(null);
  const applyDraftsRef = useRef(((_: EditorDrafts, __?: Selection) => {}) as (
    nextDrafts: EditorDrafts,
    nextSelection?: Selection,
  ) => void);
  const renderCanvasRef = useRef(() => {});
  const undoRef = useRef(() => {});
  const redoRef = useRef(() => {});
  const removeSelectionRef = useRef(() => {});
  const dragRef = useRef<DragState | null>(null);
  const lastNonEmptySelectionRef = useRef<Exclude<Selection, null> | null>(
    null,
  );
  const copyButtonRef = useRef<HTMLButtonElement | null>(null);
  const copyButtonFillRef = useRef<HTMLSpanElement | null>(null);
  const copyButtonLabelRef = useRef<HTMLSpanElement | null>(null);
  const copyButtonTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const applyButtonRef = useRef<HTMLButtonElement | null>(null);
  const applyButtonFillRef = useRef<HTMLSpanElement | null>(null);
  const applyButtonLabelRef = useRef<HTMLSpanElement | null>(null);
  const applyButtonTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const undoStackRef = useRef<EditorDrafts[]>([]);
  const redoStackRef = useRef<EditorDrafts[]>([]);
  const draftsRef = useRef<EditorDrafts>(loadDrafts());
  const sceneKindRef = useRef<SceneKind>("solo-library");
  const selectionRef = useRef<Selection>(null);
  const dragHistorySnapshotRef = useRef<EditorDrafts | null>(null);
  const dragHistoryWasRecordedRef = useRef(false);
  const [atlasImages, setAtlasImages] = useState<
    Partial<Record<string, HTMLImageElement>>
  >({});
  const [atlasViewPositions, setAtlasViewPositions] = useState<
    Record<string, AtlasViewportOrigin>
  >(() => loadAtlasViewPositions());
  const [atlasPreviewZooms, setAtlasPreviewZooms] = useState<
    Record<string, number>
  >(() => loadAtlasPreviewZooms());
  const [drafts, setDrafts] = useState<EditorDrafts>(() => draftsRef.current);
  const [sceneKind, setSceneKind] = useState<SceneKind>("solo-library");
  const [tool, setTool] = useState<EditorTool>("select");
  const [selectedCatalogKey, setSelectedCatalogKey] = useState<string>(
    catalog[0]?.key ?? "",
  );
  const [placementFacing, setPlacementFacing] = useState<Facing>("down");
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoom] = useState(3);
  const [displayZoom, setDisplayZoom] = useState(3);
  const [showGrid, setShowGrid] = useState(true);
  const [importBuffer, setImportBuffer] = useState("");
  const [flash, setFlash] = useState("");
  const [copyButtonText, setCopyButtonText] = useState("Copiar JSON");
  const [applyButtonText, setApplyButtonText] = useState("Aplicar en la VPS");
  const [isAtlasInspectorOpen, setIsAtlasInspectorOpen] = useState(false);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });
  const scene = drafts[sceneKind];
  const selectedProp =
    selection?.kind === "prop" ? findProp(scene, selection.id) : null;
  const selectedCatalog =
    catalog.find((item) => item.key === selectedCatalogKey) ?? null;
  const selectedPropAtlasViewKey = selectedProp
    ? `${sceneKind}:${selectedProp.id}`
    : null;
  const selectedPropAtlasView = selectedPropAtlasViewKey
    ? (atlasViewPositions[selectedPropAtlasViewKey] ?? null)
    : null;
  const selectedPropAtlasPreviewZoom = selectedPropAtlasViewKey
    ? (atlasPreviewZooms[selectedPropAtlasViewKey] ?? 1)
    : 1;
  const selectedPropAtlasImage = selectedProp?.atlas
    ? (atlasImages[selectedProp.atlas] ?? null)
    : null;

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    sceneKindRef.current = sceneKind;
  }, [sceneKind]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    let cancelled = false;

    async function loadAtlases() {
      const loadedEntries = await Promise.all(
        sceneAtlasEntries.map(
          (entry) =>
            new Promise<readonly [string, HTMLImageElement]>((resolve) => {
              const image = new Image();
              image.onload = () => resolve([entry.id, image] as const);
              image.onerror = () => resolve([entry.id, image] as const);
              image.src = entry.url;
            }),
        ),
      );

      if (!cancelled) {
        setAtlasImages(Object.fromEntries(loadedEntries));
      }
    }

    void loadAtlases();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDraftsFromServer() {
      try {
        const published = await syncPublishedSceneMapsFromServer();
        if (cancelled) {
          return;
        }

        const nextDrafts = cloneDrafts(draftsRef.current);
        (Object.keys(published) as SceneKind[]).forEach((kind) => {
          const scene = published[kind];
          if (scene) {
            nextDrafts[kind] = cloneSceneMap(scene);
          }
        });

        applyDraftsRef.current(
          nextDrafts,
          sanitizeSelection(
            nextDrafts[sceneKindRef.current],
            selectionRef.current,
          ),
        );
      } catch {
        if (!cancelled) {
          setFlash("No se pudo cargar la escena publicada de la VPS");
        }
      }
    }

    void hydrateDraftsFromServer();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      ATLAS_VIEW_STORAGE_KEY,
      JSON.stringify(atlasViewPositions),
    );
  }, [atlasViewPositions]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      ATLAS_PREVIEW_ZOOM_STORAGE_KEY,
      JSON.stringify(atlasPreviewZooms),
    );
  }, [atlasPreviewZooms]);

  useEffect(() => {
    renderCanvasRef.current();
  }, [
    drafts,
    sceneKind,
    selection,
    showGrid,
    displayZoom,
    currentAvatar,
    atlasImages,
  ]);

  useEffect(() => {
    const shell = viewportShellRef.current;
    if (!shell) {
      setDisplayZoom(zoom);
      return;
    }

    const syncZoom = () => {
      const availableWidth = shell.clientWidth - 24;
      const baseWidth = scene.width * scene.tileSize;
      const fittedZoom = Math.max(1, Math.floor(availableWidth / baseWidth));
      setDisplayZoom(Math.max(1, Math.min(zoom, fittedZoom || 1)));
    };

    syncZoom();
    const observer = new ResizeObserver(syncZoom);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [scene.width, scene.tileSize, zoom, sceneKind]);

  useEffect(() => {
    if (!flash) {
      return;
    }
    const timeout = window.setTimeout(() => setFlash(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  useEffect(() => {
    if (!selectedProp?.source) {
      setIsAtlasInspectorOpen(false);
    }
  }, [selectedProp]);

  useEffect(() => {
    if (selection) {
      lastNonEmptySelectionRef.current = selection;
    }
  }, [selection]);

  useEffect(() => {
    return () => {
      copyButtonTimelineRef.current?.kill();
      applyButtonTimelineRef.current?.kill();
    };
  }, []);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        mode: "editor-escenas",
        coordinateSystem:
          "pixeles lógicos en canvas; origen arriba-izquierda, x hacia la derecha, y hacia abajo",
        scene: scene.name,
        tool,
        selection,
        props: scene.props.length,
        spawnLocal: scene.spawnLocal,
        seatLocal: scene.seatLocal ?? null,
        seatSlots: getSeatPoints(scene).length,
        wanderNodes: scene.wanderNodes.length,
        remoteSlots: scene.remoteSlots.length,
        atlasInspectorOpen: isAtlasInspectorOpen,
        history: historyState,
        atlasPreviewZoom: selectedPropAtlasPreviewZoom,
        atlasView:
          selectedPropAtlasViewKey &&
          atlasViewPositions[selectedPropAtlasViewKey]
            ? atlasViewPositions[selectedPropAtlasViewKey]
            : null,
        selectedProp:
          selectedProp && selectedProp.source
            ? {
                id: selectedProp.id,
                atlas: selectedProp.atlas ?? null,
                layer: selectedProp.layer,
                w: selectedProp.w,
                h: selectedProp.h,
                rotation: normalizeRotation(selectedProp.rotation),
                source: selectedProp.source,
                scale: getPropScaleValue(selectedProp),
              }
            : selectedProp
              ? {
                  id: selectedProp.id,
                  layer: selectedProp.layer,
                  w: selectedProp.w,
                  h: selectedProp.h,
                  rotation: normalizeRotation(selectedProp.rotation),
                  scale: 1,
                }
              : null,
      });
    window.advanceTime = () => undefined;

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [
    scene,
    tool,
    selection,
    atlasViewPositions,
    selectedPropAtlasViewKey,
    isAtlasInspectorOpen,
    selectedPropAtlasPreviewZoom,
    historyState,
    selectedProp,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isAtlasInspectorOpen) {
        event.preventDefault();
        setIsAtlasInspectorOpen(false);
        return;
      }

      if (isFormFieldTarget(event.target)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoRef.current();
        } else {
          undoRef.current();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoRef.current();
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        const hotkey = event.key.toLowerCase();
        if (hotkey === "v") {
          event.preventDefault();
          setTool("select");
          return;
        }

        if (hotkey === "c") {
          event.preventDefault();
          setTool("prop");
          return;
        }
      }

      if (
        isAtlasInspectorOpen &&
        (event.code === "Space" || event.key === " ")
      ) {
        const activeSource = selectedProp?.source;
        if (
          activeSource &&
          selectedPropAtlasImage &&
          selectedPropAtlasViewKey
        ) {
          event.preventDefault();
          setAtlasViewPositions((current) => ({
            ...current,
            [selectedPropAtlasViewKey]: getCenteredAtlasViewport(
              activeSource,
              selectedPropAtlasImage,
              selectedPropAtlasPreviewZoom,
            ),
          }));
          setFlash("Atlas centrado en la selección");
        }
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (!selection) {
        return;
      }

      event.preventDefault();
      removeSelectionRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isAtlasInspectorOpen,
    selection,
    scene,
    selectedProp,
    selectedPropAtlasImage,
    selectedPropAtlasPreviewZoom,
    selectedPropAtlasViewKey,
  ]);

  function animateActionButton({
    buttonRef,
    fillRef,
    labelRef,
    timelineRef,
    setText,
    idleText,
    successText,
    failureText,
    success,
  }: {
    buttonRef: RefObject<HTMLButtonElement | null>;
    fillRef: RefObject<HTMLSpanElement | null>;
    labelRef: RefObject<HTMLSpanElement | null>;
    timelineRef: RefObject<gsap.core.Timeline | null>;
    setText: Dispatch<SetStateAction<string>>;
    idleText: string;
    successText: string;
    failureText: string;
    success: boolean;
  }) {
    const button = buttonRef.current;
    const fill = fillRef.current;
    const label = labelRef.current;
    if (!button || !fill || !label) {
      return;
    }

    timelineRef.current?.kill();
    const fillColor = success ? "#ffb961" : "#c46a6a";
    const textColor = success ? "#1b1412" : "#fff3f1";

    gsap.set(fill, {
      scaleX: 0,
      transformOrigin: "left center",
      backgroundColor: fillColor,
    });
    gsap.set(label, { color: "" });
    setText(success ? successText : failureText);

    timelineRef.current = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        setText(idleText);
        gsap.set(fill, {
          scaleX: 0,
          clearProps: "transformOrigin,backgroundColor",
        });
        gsap.set(label, { clearProps: "color" });
      },
    });

    timelineRef.current
      .to(fill, { scaleX: 1, duration: 0.28 })
      .to(label, { color: textColor, duration: 0.18 }, 0)
      .to({}, { duration: 0.45 })
      .set(fill, { transformOrigin: "right center" })
      .to(fill, { scaleX: 0, duration: 0.34, ease: "power2.inOut" })
      .to(label, { color: "", duration: 0.2 }, "<");
  }

  function animateCopyButton(success: boolean) {
    animateActionButton({
      buttonRef: copyButtonRef,
      fillRef: copyButtonFillRef,
      labelRef: copyButtonLabelRef,
      timelineRef: copyButtonTimelineRef,
      setText: setCopyButtonText,
      idleText: "Copiar JSON",
      successText: "Copiado",
      failureText: "No copiado",
      success,
    });
  }

  function animateApplyButton(success: boolean) {
    animateActionButton({
      buttonRef: applyButtonRef,
      fillRef: applyButtonFillRef,
      labelRef: applyButtonLabelRef,
      timelineRef: applyButtonTimelineRef,
      setText: setApplyButtonText,
      idleText: "Aplicar en la VPS",
      successText: "Aplicado",
      failureText: "No aplicado",
      success,
    });
  }

  function renderCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const pixelWidth = scene.width * scene.tileSize;
    const pixelHeight = scene.height * scene.tileSize;

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${pixelWidth * displayZoom}px`;
    canvas.style.height = `${pixelHeight * displayZoom}px`;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);

    drawSceneBackground(ctx, scene);
    scene.props
      .filter((prop) => prop.layer === "back" || prop.layer === "mid-back")
      .sort(
        (left, right) => getLayerOrder(left.layer) - getLayerOrder(right.layer),
      )
      .forEach((prop) =>
        drawSceneProp(
          ctx,
          prop.hidden
            ? {
                ...prop,
                hidden: false,
                alpha: Math.min(0.18, prop.alpha ?? 1),
              }
            : prop,
          atlasImages,
        ),
      );

    if (showGrid) {
      drawGrid(ctx, scene);
    }

    const selectedSeatIndex =
      selection?.kind === "seatLocal" ? selection.index : null;
    const previewSeat =
      selectedSeatIndex !== null
        ? (getSeatPoints(scene)[selectedSeatIndex] ?? null)
        : null;
    const previewPoint = previewSeat ?? scene.spawnLocal;
    const previewFacing = previewSeat
      ? getSeatFacing(scene, selectedSeatIndex ?? 0)
      : (scene.spawnFacing ?? "down");

    drawPixelAvatar(ctx, {
      avatar: currentAvatar,
      state: "idle",
      pose: previewSeat ? "sitting" : "idle",
      facing: previewFacing,
      x: Math.round(previewPoint.x * scene.tileSize),
      y: Math.round(previewPoint.y * scene.tileSize),
      tick: 0,
      highlighted: true,
    });

    scene.props
      .filter((prop) => prop.layer === "mid-front" || prop.layer === "front")
      .sort(
        (left, right) => getLayerOrder(left.layer) - getLayerOrder(right.layer),
      )
      .forEach((prop) =>
        drawSceneProp(
          ctx,
          prop.hidden
            ? {
                ...prop,
                hidden: false,
                alpha: Math.min(0.18, prop.alpha ?? 1),
              }
            : prop,
          atlasImages,
        ),
      );

    drawMarker(
      ctx,
      scene,
      scene.spawnLocal,
      "SP",
      "#ffb961",
      selection?.kind === "spawnLocal",
    );
    getSeatPoints(scene).forEach((point, index) => {
      drawMarker(
        ctx,
        scene,
        point,
        `AS${index + 1}`,
        "#e7bdb1",
        selection?.kind === "seatLocal" && selection.index === index,
      );
    });
    scene.wanderNodes.forEach((point, index) => {
      drawMarker(
        ctx,
        scene,
        point,
        `W${index + 1}`,
        "#add0a8",
        selection?.kind === "wanderNodes" && selection.index === index,
      );
    });
    scene.remoteSlots.forEach((point, index) => {
      drawMarker(
        ctx,
        scene,
        point,
        `R${index + 1}`,
        "#7bd2ff",
        selection?.kind === "remoteSlots" && selection.index === index,
      );
    });

    if (selection?.kind === "prop") {
      const prop = findProp(scene, selection.id);
      if (prop) {
        ctx.save();
        ctx.strokeStyle = "#ffb961";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.translate(prop.x + prop.w / 2, prop.y + prop.h / 2);
        ctx.rotate(getPropRotationRadians(prop));
        ctx.strokeRect(
          -prop.w / 2 + 1,
          -prop.h / 2 + 1,
          prop.w - 2,
          prop.h - 2,
        );
        ctx.restore();
      }
    }
  }

  renderCanvasRef.current = renderCanvas;

  function syncHistoryState() {
    setHistoryState({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
  }

  function pushUndoSnapshot(snapshot: EditorDrafts) {
    undoStackRef.current.push(cloneDrafts(snapshot));
    if (undoStackRef.current.length > MAX_HISTORY_STEPS) {
      undoStackRef.current.splice(
        0,
        undoStackRef.current.length - MAX_HISTORY_STEPS,
      );
    }
    redoStackRef.current = [];
    syncHistoryState();
  }

  function applyDrafts(nextDrafts: EditorDrafts, nextSelection?: Selection) {
    const sanitizedSelection = sanitizeSelection(
      nextDrafts[sceneKind],
      nextSelection ?? selection,
    );
    draftsRef.current = nextDrafts;
    setDrafts(nextDrafts);
    setSelection(sanitizedSelection);
    if (sanitizedSelection) {
      lastNonEmptySelectionRef.current = sanitizedSelection;
    }
  }

  applyDraftsRef.current = applyDrafts;

  function updateScene(
    mutator: (draft: SceneMap) => void,
    options?: { recordHistory?: boolean; snapshot?: EditorDrafts },
  ) {
    const currentDrafts = draftsRef.current;
    const nextDrafts = cloneDrafts(currentDrafts);
    mutator(nextDrafts[sceneKind]);
    if (options?.recordHistory !== false) {
      pushUndoSnapshot(options?.snapshot ?? currentDrafts);
    }
    applyDrafts(nextDrafts);
  }

  function undo() {
    const previous = undoStackRef.current.pop();
    if (!previous) {
      return;
    }

    redoStackRef.current.push(cloneDrafts(draftsRef.current));
    syncHistoryState();
    applyDrafts(cloneDrafts(previous));
  }

  undoRef.current = undo;

  function redo() {
    const next = redoStackRef.current.pop();
    if (!next) {
      return;
    }

    undoStackRef.current.push(cloneDrafts(draftsRef.current));
    if (undoStackRef.current.length > MAX_HISTORY_STEPS) {
      undoStackRef.current.splice(
        0,
        undoStackRef.current.length - MAX_HISTORY_STEPS,
      );
    }
    syncHistoryState();
    applyDrafts(cloneDrafts(next));
  }

  redoRef.current = redo;

  function toSceneCoordinates(
    event:
      | React.PointerEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function updateMarkerPoint(
    target: Exclude<Selection, null>,
    point: TilePoint,
  ) {
    updateScene((draft) => {
      if (target.kind === "spawnLocal") {
        draft.spawnLocal = point;
      } else if (target.kind === "seatLocal") {
        const seatPoints = getSeatPoints(draft);
        seatPoints[target.index] = point;
        setSeatPoints(draft, seatPoints);
      } else if (target.kind === "wanderNodes") {
        draft.wanderNodes[target.index] = point;
      } else if (target.kind === "remoteSlots") {
        draft.remoteSlots[target.index] = point;
      }
    });
  }

  function moveSelectionToPointer(
    target: Exclude<Selection, null> | null,
    pointerX: number,
    pointerY: number,
  ) {
    if (!target) {
      return;
    }

    if (target.kind === "prop") {
      updateScene((draft) => {
        const prop = draft.props.find((entry) => entry.id === target.id);
        if (!prop) {
          return;
        }

        const next = clampPropPosition(
          prop,
          pointerX - prop.w / 2,
          pointerY - prop.h / 2,
          draft.width * draft.tileSize,
          draft.height * draft.tileSize,
        );
        prop.x = next.x;
        prop.y = next.y;
      });
      return;
    }

    updateMarkerPoint(target, {
      x: clamp(snapTile(pointerX / scene.tileSize), 0, scene.width),
      y: clamp(snapTile(pointerY / scene.tileSize), 0, scene.height),
    });
  }

  function addPropAt(x: number, y: number) {
    const template = catalog.find((entry) => entry.key === selectedCatalogKey);
    if (!template) {
      return;
    }

    const prop: SceneProp = {
      id: createPropId(template.label.toLowerCase().replace(/\s+/g, "-")),
      ...template.template,
      rotation: getFacingRotation(placementFacing),
      hidden: false,
      blocksMovement:
        template.template.blocksMovement ?? template.template.shape !== "path",
      x: 0,
      y: 0,
    };

    const next = clampPropPosition(
      prop,
      x - template.template.w / 2,
      y - template.template.h / 2,
      scene.width * scene.tileSize,
      scene.height * scene.tileSize,
    );
    prop.x = next.x;
    prop.y = next.y;

    updateScene((draft) => {
      draft.props.push(prop);
    });
    setSelection({ kind: "prop", id: prop.id });
  }

  function removeSelection() {
    if (!selection) {
      return;
    }

    updateScene((draft) => {
      if (selection.kind === "prop") {
        draft.props = draft.props.filter((prop) => prop.id !== selection.id);
      }
      if (selection.kind === "seatLocal") {
        const seatPoints = getSeatPoints(draft);
        seatPoints.splice(selection.index, 1);
        setSeatPoints(draft, seatPoints);
      }
      if (selection.kind === "wanderNodes") {
        draft.wanderNodes.splice(selection.index, 1);
      }
      if (selection.kind === "remoteSlots") {
        draft.remoteSlots.splice(selection.index, 1);
        if (draft.remoteSlotFacings) {
          draft.remoteSlotFacings.splice(selection.index, 1);
        }
      }
    });

    setSelection(null);
  }

  removeSelectionRef.current = removeSelection;

  function handleCanvasPointerDown(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const { x, y } = toSceneCoordinates(event);
    const hit = findSelectionAt(scene, x, y);

    if (tool === "select") {
      setSelection(hit);

      if (hit?.kind === "prop") {
        const prop = findProp(scene, hit.id);
        if (prop) {
          dragHistorySnapshotRef.current = cloneDrafts(draftsRef.current);
          dragHistoryWasRecordedRef.current = false;
          dragRef.current = {
            selection: hit,
            offsetX: x - prop.x,
            offsetY: y - prop.y,
          };
        }
      } else if (hit) {
        const point =
          hit.kind === "spawnLocal"
            ? scene.spawnLocal
            : hit.kind === "seatLocal"
              ? getSeatPoints(scene)[hit.index]
              : hit.kind === "wanderNodes"
                ? scene.wanderNodes[hit.index]
                : scene.remoteSlots[hit.index];

        if (point) {
          dragHistorySnapshotRef.current = cloneDrafts(draftsRef.current);
          dragHistoryWasRecordedRef.current = false;
          dragRef.current = {
            selection: hit,
            offsetX: x - point.x * scene.tileSize,
            offsetY: y - point.y * scene.tileSize,
          };
        }
      }
      return;
    }

    if (tool === "prop") {
      addPropAt(x, y);
      return;
    }

    const point = {
      x: snapTile(x / scene.tileSize),
      y: snapTile(y / scene.tileSize),
    };

    if (tool === "spawnLocal") {
      updateMarkerPoint({ kind: "spawnLocal" }, point);
      setSelection({ kind: "spawnLocal" });
      return;
    }

    if (tool === "seatLocal") {
      updateScene((draft) => {
        const seatPoints = getSeatPoints(draft);
        seatPoints.push(point);
        setSeatPoints(draft, seatPoints);
      });
      setSelection({ kind: "seatLocal", index: getSeatPoints(scene).length });
      return;
    }

    if (tool === "wanderNodes") {
      updateScene((draft) => {
        draft.wanderNodes.push(point);
      });
      setSelection({ kind: "wanderNodes", index: scene.wanderNodes.length });
      return;
    }

    if (tool === "remoteSlots") {
      updateScene((draft) => {
        draft.remoteSlots.push(point);
        draft.remoteSlotFacings = [
          ...(draft.remoteSlotFacings ??
            draft.remoteSlots.slice(0, -1).map(() => "up")),
          "up",
        ];
      });
      setSelection({ kind: "remoteSlots", index: scene.remoteSlots.length });
    }
  }

  function handleCanvasPointerMove(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    if (!dragRef.current) {
      return;
    }

    if (!dragHistoryWasRecordedRef.current && dragHistorySnapshotRef.current) {
      pushUndoSnapshot(dragHistorySnapshotRef.current);
      dragHistoryWasRecordedRef.current = true;
    }

    const { x, y } = toSceneCoordinates(event);
    const activeDrag = dragRef.current;

    if (activeDrag.selection.kind === "prop") {
      const propSelection = activeDrag.selection;
      updateScene(
        (draft) => {
          const prop = draft.props.find(
            (entry) => entry.id === propSelection.id,
          );
          if (!prop) {
            return;
          }
          const next = clampPropPosition(
            prop,
            x - activeDrag.offsetX,
            y - activeDrag.offsetY,
            draft.width * draft.tileSize,
            draft.height * draft.tileSize,
          );
          prop.x = next.x;
          prop.y = next.y;
        },
        { recordHistory: false },
      );
      return;
    }

    const point = {
      x: clamp(
        snapTile((x - activeDrag.offsetX) / scene.tileSize),
        0,
        scene.width,
      ),
      y: clamp(
        snapTile((y - activeDrag.offsetY) / scene.tileSize),
        0,
        scene.height,
      ),
    };
    updateScene(
      (draft) => {
        if (activeDrag.selection.kind === "spawnLocal") {
          draft.spawnLocal = point;
        } else if (activeDrag.selection.kind === "seatLocal") {
          const seatPoints = getSeatPoints(draft);
          seatPoints[activeDrag.selection.index] = point;
          setSeatPoints(draft, seatPoints);
        } else if (activeDrag.selection.kind === "wanderNodes") {
          draft.wanderNodes[activeDrag.selection.index] = point;
        } else if (activeDrag.selection.kind === "remoteSlots") {
          draft.remoteSlots[activeDrag.selection.index] = point;
        }
      },
      { recordHistory: false },
    );
  }

  function handleCanvasPointerUp() {
    dragRef.current = null;
    dragHistorySnapshotRef.current = null;
    dragHistoryWasRecordedRef.current = false;
  }

  function handleCanvasDoubleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const target = selection ?? lastNonEmptySelectionRef.current;
    if (!target) {
      return;
    }

    const { x, y } = toSceneCoordinates(event);
    moveSelectionToPointer(target, x, y);
  }

  function updateSelectedProp(mutator: (prop: SceneProp) => void) {
    if (!selection || selection.kind !== "prop") {
      return;
    }
    updateScene((draft) => {
      const prop = draft.props.find((entry) => entry.id === selection.id);
      if (!prop) {
        return;
      }
      mutator(prop);
    });
  }

  function updateSelectedMarker(mutator: (point: TilePoint) => void) {
    if (!selection || selection.kind === "prop") {
      return;
    }

    updateScene((draft) => {
      if (selection.kind === "spawnLocal") {
        mutator(draft.spawnLocal);
        return;
      }

      if (selection.kind === "seatLocal") {
        const seatPoints = getSeatPoints(draft);
        seatPoints[selection.index] =
          seatPoints[selection.index] ?? clonePoint(draft.spawnLocal);
        mutator(seatPoints[selection.index]);
        setSeatPoints(draft, seatPoints);
        return;
      }

      if (selection.kind === "wanderNodes") {
        mutator(draft.wanderNodes[selection.index]);
        return;
      }

      mutator(draft.remoteSlots[selection.index]);
    });
  }

  function updateSelectedMarkerFacing(facing: Facing) {
    if (
      !selection ||
      selection.kind === "prop" ||
      selection.kind === "wanderNodes"
    ) {
      return;
    }

    updateScene((draft) => {
      if (selection.kind === "spawnLocal") {
        draft.spawnFacing = facing;
        return;
      }

      if (selection.kind === "seatLocal") {
        setSeatFacing(draft, selection.index, facing);
        return;
      }

      setRemoteSlotFacing(draft, selection.index, facing);
    });
  }

  function setSelectedPropLayer(layer: SceneLayer) {
    if (!selection || selection.kind !== "prop") {
      return;
    }

    updateSelectedProp((prop) => {
      prop.layer = layer;
    });
  }

  function nudgeSelectedPropLayer(direction: "up" | "down") {
    if (!selection || selection.kind !== "prop") {
      return;
    }

    updateSelectedProp((prop) => {
      const currentIndex = getLayerOrder(prop.layer);
      const nextIndex = clamp(
        currentIndex + (direction === "up" ? 1 : -1),
        0,
        sceneLayerOrder.length - 1,
      );
      prop.layer = sceneLayerOrder[nextIndex];
    });
  }

  function duplicateSelectedProp() {
    if (!selection || selection.kind !== "prop") {
      return;
    }

    const prop = findProp(scene, selection.id);
    if (!prop) {
      return;
    }

    const duplicate: SceneProp = {
      ...cloneProp(prop),
      id: createPropId(`${prop.id}-copy`),
      x: clamp(prop.x + 8, 0, scene.width * scene.tileSize - prop.w),
      y: clamp(prop.y + 8, 0, scene.height * scene.tileSize - prop.h),
    };

    updateScene((draft) => {
      draft.props.push(duplicate);
    });
    setSelection({ kind: "prop", id: duplicate.id });
  }

  async function copyJson() {
    const payload = JSON.stringify(scene, null, 2);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        animateCopyButton(true);
        return;
      }
    } catch {
      // Fallback below
    }

    window.prompt("Copia el JSON de la escena", payload);
    setFlash(
      "Tu navegador no permite copiarlo solo. Copialo desde la ventana.",
    );
    animateCopyButton(false);
  }

  function downloadJson() {
    downloadText(`${sceneKind}.scene.json`, JSON.stringify(scene, null, 2));
    setFlash("JSON descargado");
  }

  async function applyToWeb() {
    try {
      await publishSceneMapsToServer(draftsRef.current);
      setFlash("Cambios aplicados en la web");
      animateApplyButton(true);
    } catch {
      publishSceneMaps(draftsRef.current);
      setFlash("No se pudo guardar la escena en la VPS");
      animateApplyButton(false);
    }
  }

  function importJson() {
    try {
      const parsed = JSON.parse(importBuffer);
      const next = normalizeSceneMap(parsed, sceneKind);
      const currentDrafts = draftsRef.current;
      const nextDrafts = cloneDrafts(currentDrafts);
      nextDrafts[sceneKind] = next;
      pushUndoSnapshot(currentDrafts);
      applyDrafts(nextDrafts, null);
      setFlash("JSON importado");
    } catch {
      setFlash("El JSON no es válido");
    }
  }

  function resetScene() {
    const currentDrafts = draftsRef.current;
    const nextDrafts = cloneDrafts(currentDrafts);
    nextDrafts[sceneKind] = cloneSceneMap(sceneMaps[sceneKind]);
    pushUndoSnapshot(currentDrafts);
    applyDrafts(nextDrafts, null);
    setFlash("Escena restaurada");
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden bg-surface-container-lowest pixel-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,185,97,0.18),transparent_24%),radial-gradient(circle_at_78%_30%,rgba(173,208,168,0.12),transparent_20%)]" />
        <div className="relative flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 border-l-4 border-primary bg-secondary-container px-3 py-1">
              <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-primary-fixed">
                Herramienta interna
              </span>
            </div>
            <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-on-surface md:text-5xl">
              Editor de escenas del santuario
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Esta ruta no toca la navegación principal. Sirve para montar tus
              fondos, colocar props, definir spawn, asiento, nodos y exportar un
              JSON listo para exportarlo o aplicarlo en la web real sin tocar
              código.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={undo}
              disabled={historyState.undo === 0}
              className="inline-flex items-center gap-2 border-2 border-outline-variant bg-surface px-4 py-3 font-headline text-xs font-bold uppercase tracking-[0.18em] text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 size={14} /> Deshacer
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={historyState.redo === 0}
              className="inline-flex items-center gap-2 border-2 border-outline-variant bg-surface px-4 py-3 font-headline text-xs font-bold uppercase tracking-[0.18em] text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Redo2 size={14} /> Rehacer
            </button>
            <button
              ref={applyButtonRef}
              type="button"
              onClick={applyToWeb}
              className="relative inline-flex items-center gap-2 overflow-hidden border-2 border-tertiary bg-tertiary/12 px-4 py-3 font-headline text-xs font-bold uppercase tracking-[0.18em] text-tertiary hover:border-tertiary"
            >
              <span
                ref={applyButtonFillRef}
                aria-hidden="true"
                className="absolute inset-0 z-0 origin-left scale-x-0 bg-primary"
              />
              <span
                ref={applyButtonLabelRef}
                className="relative z-10 inline-flex items-center gap-2"
              >
                <Save size={14} /> {applyButtonText}
              </span>
            </button>
            <button
              ref={copyButtonRef}
              type="button"
              onClick={copyJson}
              className="relative inline-flex items-center gap-2 overflow-hidden border-2 border-outline-variant bg-surface px-4 py-3 font-headline text-xs font-bold uppercase tracking-[0.18em] text-on-surface hover:border-primary"
            >
              <span
                ref={copyButtonFillRef}
                aria-hidden="true"
                className="absolute inset-0 z-0 origin-left scale-x-0 bg-primary"
              />
              <span
                ref={copyButtonLabelRef}
                className="relative z-10 inline-flex items-center gap-2"
              >
                <Copy size={14} /> {copyButtonText}
              </span>
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="inline-flex items-center gap-2 border-2 border-primary bg-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-[0.18em] text-on-primary"
            >
              <Download size={14} /> Descargar
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_20rem] xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside className="space-y-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <div className="bg-surface-container-lowest pixel-border p-4">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
              Escena activa
            </p>
            <div className="mt-3 grid gap-2">
              {(Object.keys(sceneLabels) as SceneKind[]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setSceneKind(entry);
                    setSelection(null);
                  }}
                  className={`border-2 px-3 py-3 text-left font-headline text-xs font-bold uppercase tracking-[0.16em] ${
                    entry === sceneKind
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline-variant bg-surface text-on-surface"
                  }`}
                >
                  {sceneLabels[entry]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest pixel-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                Herramientas
              </p>
              <button
                type="button"
                onClick={() => setShowGrid((current) => !current)}
                className={`inline-flex items-center gap-2 border px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.16em] ${
                  showGrid
                    ? "border-primary text-primary"
                    : "border-outline-variant text-outline"
                }`}
              >
                <Grid3x3 size={12} /> Grid
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(toolLabels) as EditorTool[]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setTool(entry)}
                  className={`border px-3 py-3 text-left font-headline text-[10px] font-bold uppercase tracking-[0.16em] ${
                    entry === tool
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-outline-variant bg-surface text-on-surface"
                  }`}
                >
                  {entry === "select" ? (
                    <MousePointer2 size={14} className="mb-2" />
                  ) : (
                    <Plus size={14} className="mb-2" />
                  )}
                  <span className="block">{toolLabels[entry]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest pixel-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                Paleta
              </p>
              <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                {catalog.length} elementos
              </span>
            </div>

            <div className="space-y-2 max-h-[28rem] overflow-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
              {catalog.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelectedCatalogKey(item.key);
                    setTool("prop");
                  }}
                  className={`w-full border px-3 py-3 text-left ${
                    selectedCatalogKey === item.key
                      ? "border-primary bg-primary/15"
                      : "border-outline-variant bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PropPreviewCanvas
                      prop={{ ...item.template, x: 0, y: 0 }}
                      atlasImages={atlasImages}
                      size={56}
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block font-headline text-xs font-bold uppercase tracking-[0.16em] text-on-surface">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-outline">
                        {item.category === "atlas-sheet"
                          ? "Atlas base"
                          : item.category === "atlas"
                            ? "Prop curado"
                            : "Forma jardín"}{" "}
                        · {item.template.w}×{item.template.h}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 border border-outline-variant bg-surface px-3 py-3">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                Orientacion al colocar
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {facingPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setPlacementFacing(preset.value)}
                    className={`border px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] ${
                      placementFacing === preset.value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-outline-variant bg-surface-container-low text-on-surface"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedCatalog ? (
              <div className="mt-4 border border-outline-variant bg-surface px-3 py-3">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                  Pieza activa
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <PropPreviewCanvas
                    prop={{
                      ...selectedCatalog.template,
                      rotation: getFacingRotation(placementFacing),
                      x: 0,
                      y: 0,
                    }}
                    atlasImages={atlasImages}
                    size={72}
                    className="shrink-0"
                  />
                  <div>
                    <p className="font-headline text-sm font-black uppercase tracking-[0.14em] text-on-surface">
                      {selectedCatalog.label}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-outline">
                      {selectedCatalog.category === "atlas-sheet"
                        ? "Recorte editable"
                        : selectedCatalog.category === "atlas"
                          ? "Atlas curado"
                          : "Forma procedural"}{" "}
                      · {selectedCatalog.template.w}×
                      {selectedCatalog.template.h}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-secondary">
                      Se colocara mirando a {facingLabels[placementFacing]}.
                    </p>
                    {selectedCatalog.template.atlas ? (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-primary">
                        {getAtlasMeta(selectedCatalog.template.atlas)?.label ??
                          selectedCatalog.template.atlas}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 border border-outline-variant bg-surface px-3 py-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                    Atlases cargados
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                    Aquí tienes `Top-Down_Retro_Interior`, `Interiors_free`,
                    `lpc-walls`, `wall_puerta`, el atlas de biblioteca y el
                    nuevo pack `Tiny Garden`.
                  </p>
                </div>
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                  {sceneAtlasEntries.length} hojas
                </span>
              </div>

              <div className="space-y-2 max-h-[20rem] overflow-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
                {sceneAtlasEntries.map((entry) => {
                  const catalogKey = `atlas-sheet:${entry.id}`;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setSelectedCatalogKey(catalogKey);
                        setTool("prop");
                      }}
                      className={`w-full border px-3 py-3 text-left ${
                        selectedCatalogKey === catalogKey
                          ? "border-primary bg-primary/15"
                          : "border-outline-variant bg-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AtlasSheetPreview
                          atlasImage={atlasImages[entry.id] ?? null}
                          size={56}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="block font-headline text-xs font-bold uppercase tracking-[0.16em] text-on-surface">
                            {entry.label}
                          </span>
                          <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-outline">
                            Slice inicial {entry.defaultSlice.w}×
                            {entry.defaultSlice.h}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest pixel-border px-4 py-3">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                Viewport
              </p>
              <h2 className="font-headline text-2xl font-black uppercase tracking-tighter text-on-surface">
                {sceneLabels[sceneKind]}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                Zoom
              </label>
              <input
                type="range"
                min="2"
                max="5"
                step="1"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
              <span className="min-w-[5rem] font-headline text-xs font-bold uppercase tracking-[0.16em] text-on-surface">
                {displayZoom}x{displayZoom < zoom ? " auto" : ""}
              </span>
            </div>
          </div>

          <div className="overflow-auto bg-surface-container-lowest pixel-border p-4">
            <div
              ref={viewportShellRef}
              className="mx-auto max-w-full overflow-auto border border-outline-variant bg-black/10 p-2 shadow-[0_18px_36px_rgba(0,0,0,0.28)]"
            >
              <canvas
                ref={canvasRef}
                className="mx-auto block cursor-crosshair"
                style={{ imageRendering: "pixelated" }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
                onDoubleClick={handleCanvasDoubleClick}
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest pixel-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                  Flujo
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  1. Elige escena. 2. Cambia rápido entre `V` para seleccionar y
                  `C` para colocar props. 3. Ajusta propiedades. 4. Haz doble
                  clic en el canvas para mandar la selección al ratón. 5. Usa
                  deshacer y rehacer si pruebas una variante. 6. Pulsa `Aplicar
                  en la VPS` cuando quieras que el visor use esa versión.
                </p>
              </div>
              {flash ? (
                <div className="border border-primary bg-primary/15 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {flash}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <div className="bg-surface-container-lowest pixel-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Layers2 size={16} className="text-primary" />
              <p className="font-headline text-sm font-black uppercase tracking-[0.16em] text-on-surface">
                Inspector
              </p>
            </div>

            {selectedProp ? (
              <div className="space-y-4">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                  {selectedProp.id}
                </p>

                <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)]">
                  <PropPreviewCanvas
                    prop={{ ...selectedProp, x: 0, y: 0 }}
                    atlasImages={atlasImages}
                    size={88}
                    className="shrink-0"
                  />
                  <div className="space-y-2">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Vista previa
                    </p>
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      Aquí ves la pieza tal como se renderiza. Si el recorte
                      sale mal, ajusta el bloque de atlas de abajo.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      X
                    </span>
                    <input
                      type="number"
                      value={selectedProp.x}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          prop.x = Number(event.target.value);
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Y
                    </span>
                    <input
                      type="number"
                      value={selectedProp.y}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          prop.y = Number(event.target.value);
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Render W
                    </span>
                    <input
                      type="number"
                      value={selectedProp.w}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          prop.w = Math.max(
                            MIN_PROP_SIZE,
                            Number(event.target.value),
                          );
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Render H
                    </span>
                    <input
                      type="number"
                      value={selectedProp.h}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          prop.h = Math.max(
                            MIN_PROP_SIZE,
                            Number(event.target.value),
                          );
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                </div>

                <div className="space-y-3 border border-outline-variant bg-surface px-3 py-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                        Rotación
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                        Gira la pieza sobre su centro sin cambiar el recorte ni
                        la escala guardada.
                      </p>
                    </div>
                    <span className="font-headline text-sm font-black uppercase tracking-[0.14em] text-primary">
                      {normalizeRotation(selectedProp.rotation)}°
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_5rem] gap-3">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="15"
                      value={normalizeRotation(selectedProp.rotation)}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          prop.rotation = normalizeRotation(
                            Number(event.target.value),
                          );
                        })
                      }
                    />
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      step="15"
                      value={normalizeRotation(selectedProp.rotation)}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          prop.rotation = normalizeRotation(
                            Number(event.target.value),
                          );
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {facingPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() =>
                          updateSelectedProp((prop) => {
                            prop.rotation = preset.rotation;
                          })
                        }
                        className="border border-outline-variant bg-surface px-2 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedProp.source ? (
                  <div className="space-y-3 border border-outline-variant bg-surface px-3 py-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                          Escala en escena
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                          Cambia el tamaño final con el que la pieza se guarda y
                          se verá en la biblioteca.
                        </p>
                      </div>
                      <span className="font-headline text-sm font-black uppercase tracking-[0.14em] text-primary">
                        {getPropScaleValue(selectedProp)}x
                      </span>
                    </div>

                    <div className="grid grid-cols-[1fr_5rem] gap-3">
                      <input
                        type="range"
                        min={String(MIN_PROP_SCALE)}
                        max="6"
                        step="0.05"
                        value={getPropScaleValue(selectedProp)}
                        onChange={(event) =>
                          updateSelectedProp((prop) => {
                            applyPropScale(prop, Number(event.target.value));
                          })
                        }
                      />
                      <input
                        type="number"
                        min={String(MIN_PROP_SCALE)}
                        max="6"
                        step="0.05"
                        value={getPropScaleValue(selectedProp)}
                        onChange={(event) =>
                          updateSelectedProp((prop) => {
                            applyPropScale(prop, Number(event.target.value));
                          })
                        }
                        className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Capa
                    </span>
                    <select
                      value={selectedProp.layer}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          prop.layer =
                            event.target.value === "mid-back" ||
                            event.target.value === "mid-front" ||
                            event.target.value === "front"
                              ? event.target.value
                              : "back";
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    >
                      {sceneLayerOrder.map((layer) => (
                        <option key={layer} value={layer}>
                          {sceneLayerLabels[layer]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Opacidad
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedProp.alpha ?? 1}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          prop.alpha = clamp(Number(event.target.value), 0, 1);
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Visible
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedProp((prop) => {
                          prop.hidden = !prop.hidden;
                        })
                      }
                      className={`w-full border px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] ${
                        selectedProp.hidden
                          ? "border-outline-variant bg-surface text-outline"
                          : "border-primary bg-primary/12 text-primary"
                      }`}
                    >
                      {selectedProp.hidden ? "Oculto en runtime" : "Visible"}
                    </button>
                  </label>
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Colision
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedProp((prop) => {
                          prop.blocksMovement = !(prop.blocksMovement ?? true);
                        })
                      }
                      className={`w-full border px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] ${
                        (selectedProp.blocksMovement ?? true)
                          ? "border-primary bg-primary/12 text-primary"
                          : "border-outline-variant bg-surface text-outline"
                      }`}
                    >
                      {(selectedProp.blocksMovement ?? true)
                        ? "Bloquea paso"
                        : "No bloquea"}
                    </button>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPropLayer("back")}
                    className="border border-outline-variant bg-surface px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em]"
                  >
                    Mandar al fondo
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPropLayer("front")}
                    className="border border-outline-variant bg-surface px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em]"
                  >
                    Traer al frente
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeSelectedPropLayer("down")}
                    className="border border-outline-variant bg-surface px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em]"
                  >
                    Bajar capa
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeSelectedPropLayer("up")}
                    className="border border-outline-variant bg-surface px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em]"
                  >
                    Subir capa
                  </button>
                  <button
                    type="button"
                    onClick={duplicateSelectedProp}
                    className="border border-primary bg-primary/10 px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-primary"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={removeSelection}
                    className="border border-error bg-error/10 px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-error"
                  >
                    Eliminar
                  </button>
                </div>

                {selectedProp.source ? (
                  <div className="space-y-4 border border-outline-variant bg-surface px-3 py-3">
                    <div>
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                        Recorte del atlas
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                        Ajusta `x`, `y`, `w` y `h` del sprite original si el
                        recorte viene mal o se está comiendo parte del elemento.
                        La vista grande del atlas ahora se abre fuera del flujo
                        para que no apriete el inspector.
                      </p>
                    </div>

                    <label className="space-y-1">
                      <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                        Atlas
                      </span>
                      <select
                        value={selectedProp.atlas ?? "library"}
                        onChange={(event) =>
                          updateSelectedProp((prop) => {
                            const nextAtlas = event.target.value;
                            const nextMeta = getAtlasMeta(nextAtlas);
                            if (!nextMeta) {
                              return;
                            }
                            const scale = prop.source
                              ? getPropScaleValue(prop)
                              : 1;
                            prop.atlas = nextAtlas;
                            prop.source = {
                              x: 0,
                              y: 0,
                              w: nextMeta.defaultSlice.w,
                              h: nextMeta.defaultSlice.h,
                            };
                            applyPropScale(prop, scale);
                          })
                        }
                        className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                      >
                        {sceneAtlasEntries.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-3 border border-outline-variant bg-surface-variant px-3 py-3">
                      <div className="space-y-1">
                        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                          Vista del atlas
                        </p>
                        <p className="text-xs leading-relaxed text-on-surface-variant">
                          Ábrela en grande para moverte mejor por la hoja y
                          ajustar el recorte con más aire.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAtlasInspectorOpen(true)}
                        className="w-full border border-primary bg-primary/12 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-primary"
                      >
                        Abrir atlas grande
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : selection && selection.kind !== "prop" ? (
              <div className="space-y-4">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                  {selection.kind === "spawnLocal"
                    ? "Spawn local"
                    : selection.kind === "seatLocal"
                      ? `Asiento ${selection.index + 1}`
                      : selection.kind === "wanderNodes"
                        ? `Wander ${selection.index + 1}`
                        : `Remote ${selection.index + 1}`}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Tile X
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={
                        selection.kind === "spawnLocal"
                          ? scene.spawnLocal.x
                          : selection.kind === "seatLocal"
                            ? (getSeatPoints(scene)[selection.index]?.x ?? 0)
                            : selection.kind === "wanderNodes"
                              ? (scene.wanderNodes[selection.index]?.x ?? 0)
                              : (scene.remoteSlots[selection.index]?.x ?? 0)
                      }
                      onChange={(event) =>
                        updateSelectedMarker((point) => {
                          point.x = Number(event.target.value);
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Tile Y
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={
                        selection.kind === "spawnLocal"
                          ? scene.spawnLocal.y
                          : selection.kind === "seatLocal"
                            ? (getSeatPoints(scene)[selection.index]?.y ?? 0)
                            : selection.kind === "wanderNodes"
                              ? (scene.wanderNodes[selection.index]?.y ?? 0)
                              : (scene.remoteSlots[selection.index]?.y ?? 0)
                      }
                      onChange={(event) =>
                        updateSelectedMarker((point) => {
                          point.y = Number(event.target.value);
                        })
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                </div>

                {selection.kind !== "wanderNodes" ? (
                  <label className="space-y-1">
                    <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Direccion
                    </span>
                    <select
                      value={
                        selection.kind === "spawnLocal"
                          ? (scene.spawnFacing ?? "down")
                          : selection.kind === "seatLocal"
                            ? getSeatFacing(scene, selection.index)
                            : getRemoteSlotFacing(scene, selection.index)
                      }
                      onChange={(event) =>
                        updateSelectedMarkerFacing(event.target.value as Facing)
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                    >
                      {facingPresets.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {selection.kind !== "spawnLocal" ? (
                  <button
                    type="button"
                    onClick={removeSelection}
                    className="w-full border border-error bg-error/10 px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-error"
                  >
                    Eliminar marker
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Selecciona un prop o un marker dentro del canvas para ajustar su
                posición, tamaño o capa.
              </p>
            )}
          </div>

          <div className="bg-surface-container-lowest pixel-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Save size={16} className="text-tertiary" />
              <p className="font-headline text-sm font-black uppercase tracking-[0.16em] text-on-surface">
                Tema
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                ["skyTop", "skyBottom", "floorA", "floorB", "border"] as const
              ).map((key) => (
                <label key={key} className="space-y-1">
                  <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                    {key}
                  </span>
                  <input
                    type="color"
                    value={scene.theme[key]}
                    onChange={(event) =>
                      updateScene((draft) => {
                        draft.theme[key] = event.target.value;
                      })
                    }
                    className="h-10 w-full border border-outline-variant bg-surface"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest pixel-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Import size={16} className="text-primary" />
              <p className="font-headline text-sm font-black uppercase tracking-[0.16em] text-on-surface">
                Importar JSON
              </p>
            </div>
            <textarea
              value={importBuffer}
              onChange={(event) => setImportBuffer(event.target.value)}
              placeholder="Pega aquí un JSON de escena para reemplazar la actual."
              className="min-h-[10rem] w-full border border-outline-variant bg-surface px-3 py-3 text-xs leading-relaxed text-on-surface"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={importJson}
                className="flex-1 border border-primary bg-primary/12 px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-primary"
              >
                Importar
              </button>
              <button
                type="button"
                onClick={resetScene}
                className="flex-1 border border-outline-variant bg-surface px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface"
              >
                <RotateCcw size={14} className="mr-2 inline" />
                Restaurar preset
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest pixel-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Eraser size={16} className="text-secondary" />
              <p className="font-headline text-sm font-black uppercase tracking-[0.16em] text-on-surface">
                Notas
              </p>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-on-surface-variant">
              <li>
                El editor guarda cada escena en borrador local automáticamente.
              </li>
              <li>
                `Aplicar en la VPS` publica esos cambios para que el visor 2D
                use esta versión global del sitio.
              </li>
              <li>
                Los props se exportan en el mismo formato que usa el visor
                actual.
              </li>
              <li>
                Deshacer y rehacer actúan sobre el JSON de la escena activa y
                permiten revertir arrastres completos.
              </li>
              <li>
                `V` activa seleccionar y `C` activa colocar props mientras no
                estés escribiendo en un campo.
              </li>
              <li>
                Por ahora el tamaño del canvas sigue el stage actual del juego:
                20×12 tiles de 16 px.
              </li>
            </ul>
          </div>
        </aside>
      </section>

      {isAtlasInspectorOpen && selectedProp?.source ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-5xl border border-outline-variant bg-surface-container-lowest shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant px-5 py-4">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                  Atlas ampliado
                </p>
                <h3 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                  {getAtlasMeta(selectedProp.atlas)?.label ?? "Atlas"}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                  Arrastra la vista para moverte por la hoja. Haz doble clic
                  dentro del atlas para mandar el recorte al punto clicado y
                  pulsa `Espacio` para recentrar la vista sobre la selección
                  actual.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAtlasInspectorOpen(false)}
                className="border border-outline-variant bg-surface px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="border border-outline-variant bg-surface p-3">
                <AtlasSourcePreview
                  source={selectedProp.source}
                  atlasImage={selectedPropAtlasImage}
                  viewportOrigin={selectedPropAtlasView}
                  zoom={selectedPropAtlasPreviewZoom}
                  width={ATLAS_PREVIEW_MODAL_WIDTH}
                  height={ATLAS_PREVIEW_MODAL_HEIGHT}
                  onSourceChange={(nextSource) => {
                    updateSelectedProp((prop) => {
                      if (!prop.source) return;
                      prop.source = nextSource;
                    });
                  }}
                  onViewportChange={(next) => {
                    if (!selectedPropAtlasViewKey) return;
                    setAtlasViewPositions((current) => ({
                      ...current,
                      [selectedPropAtlasViewKey]: next,
                    }));
                  }}
                />
              </div>

              <div className="space-y-3">
                <div className="border border-outline-variant bg-surface px-3 py-3">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                    Pieza activa
                  </p>
                  <p className="mt-2 font-headline text-sm font-black uppercase tracking-[0.16em] text-on-surface">
                    {selectedProp.id}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                    Doble clic en el atlas para mandar el recorte al punto
                    clicado. El doble clic en el canvas principal sigue
                    recolocando la pieza en la escena.
                  </p>
                </div>

                <div className="border border-outline-variant bg-surface px-3 py-3">
                  <div className="space-y-1">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Recorte del atlas
                    </p>
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      Aquí se edita el recorte completo. El inspector pequeño ya
                      no repite estos campos.
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                        Source X
                      </span>
                      <input
                        type="number"
                        value={selectedProp.source.x}
                        onChange={(event) =>
                          updateSelectedProp((prop) => {
                            if (!prop.source) return;
                            prop.source.x = Math.max(
                              0,
                              Number(event.target.value),
                            );
                          })
                        }
                        className="w-full border border-outline-variant bg-surface-variant px-3 py-2 text-sm text-on-surface"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                        Source Y
                      </span>
                      <input
                        type="number"
                        value={selectedProp.source.y}
                        onChange={(event) =>
                          updateSelectedProp((prop) => {
                            if (!prop.source) return;
                            prop.source.y = Math.max(
                              0,
                              Number(event.target.value),
                            );
                          })
                        }
                        className="w-full border border-outline-variant bg-surface-variant px-3 py-2 text-sm text-on-surface"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                        Source W
                      </span>
                      <input
                        type="number"
                        value={selectedProp.source.w}
                        onChange={(event) =>
                          updateSelectedProp((prop) => {
                            if (!prop.source) return;
                            const scale = getPropScaleValue(prop);
                            prop.source.w = Math.max(
                              1,
                              Number(event.target.value),
                            );
                            applyPropScale(prop, scale);
                          })
                        }
                        className="w-full border border-outline-variant bg-surface-variant px-3 py-2 text-sm text-on-surface"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                        Source H
                      </span>
                      <input
                        type="number"
                        value={selectedProp.source.h}
                        onChange={(event) =>
                          updateSelectedProp((prop) => {
                            if (!prop.source) return;
                            const scale = getPropScaleValue(prop);
                            prop.source.h = Math.max(
                              1,
                              Number(event.target.value),
                            );
                            applyPropScale(prop, scale);
                          })
                        }
                        className="w-full border border-outline-variant bg-surface-variant px-3 py-2 text-sm text-on-surface"
                      />
                    </label>
                  </div>
                </div>

                <div className="border border-outline-variant bg-surface px-3 py-3">
                  <div className="space-y-1">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Zoom del atlas
                    </p>
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      Solo acerca o aleja la imagen grande del atlas. No cambia
                      el tamaño con el que se guarda la pieza en la biblioteca.
                    </p>
                  </div>

                  <p className="mt-2 font-headline text-lg font-black uppercase tracking-[0.14em] text-primary">
                    {selectedPropAtlasPreviewZoom}x
                  </p>

                  <div className="mt-3 grid grid-cols-[1fr_5.25rem] gap-3">
                    <input
                      type="range"
                      min={String(MIN_ATLAS_PREVIEW_ZOOM)}
                      max="6"
                      step="0.1"
                      value={selectedPropAtlasPreviewZoom}
                      onChange={(event) => {
                        if (!selectedPropAtlasViewKey) return;
                        setAtlasPreviewZooms((current) => ({
                          ...current,
                          [selectedPropAtlasViewKey]: Number(
                            event.target.value,
                          ),
                        }));
                      }}
                    />
                    <input
                      type="number"
                      min={String(MIN_ATLAS_PREVIEW_ZOOM)}
                      max="6"
                      step="0.1"
                      value={selectedPropAtlasPreviewZoom}
                      onChange={(event) => {
                        if (!selectedPropAtlasViewKey) return;
                        setAtlasPreviewZooms((current) => ({
                          ...current,
                          [selectedPropAtlasViewKey]: clamp(
                            Number(event.target.value),
                            MIN_ATLAS_PREVIEW_ZOOM,
                            6,
                          ),
                        }));
                      }}
                      className="w-full border border-outline-variant bg-surface-variant px-3 py-2 text-sm text-on-surface"
                    />
                  </div>
                </div>

                <div className="border border-outline-variant bg-surface px-3 py-3">
                  <div className="space-y-1">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                      Escala en escena
                    </p>
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      Esto sí cambia el tamaño final con el que la pieza se
                      guarda y se verá luego dentro de la biblioteca.
                    </p>
                  </div>

                  <p className="mt-2 font-headline text-lg font-black uppercase tracking-[0.14em] text-primary">
                    {getPropScaleValue(selectedProp)}x
                  </p>

                  <div className="mt-3 grid grid-cols-[1fr_5.25rem] gap-3">
                    <input
                      type="range"
                      min={String(MIN_PROP_SCALE)}
                      max="6"
                      step="0.05"
                      value={getPropScaleValue(selectedProp)}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          applyPropScale(prop, Number(event.target.value));
                        })
                      }
                    />
                    <input
                      type="number"
                      min={String(MIN_PROP_SCALE)}
                      max="6"
                      step="0.05"
                      value={getPropScaleValue(selectedProp)}
                      onChange={(event) =>
                        updateSelectedProp((prop) => {
                          applyPropScale(prop, Number(event.target.value));
                        })
                      }
                      className="w-full border border-outline-variant bg-surface-variant px-3 py-2 text-sm text-on-surface"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
