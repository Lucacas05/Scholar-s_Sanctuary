import type {
  Facing,
  SceneKind,
  SceneMap,
  SceneProp,
  TilePoint,
} from "@/lib/sanctuary/canvas/types";

const libraryWall = { x: 747, y: 0, w: 741, h: 160 } as const;
const rugLarge = { x: 451, y: 4, w: 159, h: 61 } as const;
const rugSmall = { x: 451, y: 76, w: 155, h: 60 } as const;
const desk = { x: 527, y: 157, w: 218, h: 109 } as const;
const table = { x: 331, y: 157, w: 195, h: 112 } as const;
const emptyShelf = { x: 0, y: 385, w: 88, h: 129 } as const;
const shelfLeft = { x: 132, y: 386, w: 89, h: 128 } as const;
const shelfRight = { x: 263, y: 385, w: 89, h: 129 } as const;
const shelfMiddle = { x: 397, y: 385, w: 91, h: 129 } as const;
const grandfatherClock = { x: 47, y: 9, w: 68, h: 132 } as const;
const crate = { x: 118, y: 36, w: 62, h: 47 } as const;

export const sceneMaps: Record<SceneKind, SceneMap> = {
  "solo-library": {
    name: "solo-library",
    width: 20,
    height: 12,
    tileSize: 16,
    spawnLocal: { x: 8.5, y: 4.5 },
    seatLocal: { x: 15.6, y: 8 },
    seatSlots: [
      { x: 15.6, y: 8 },
      { x: 1.5, y: 9.5 },
    ],
    wanderNodes: [
      { x: 13.5, y: 6.5 },
      { x: 12, y: 5.5 },
      { x: 9.5, y: 5 },
      { x: 7.5, y: 5.5 },
      { x: 4.5, y: 6 },
      { x: 2, y: 6 },
      { x: 4, y: 8.5 },
      { x: 3, y: 10 },
      { x: 6, y: 9.5 },
      { x: 9, y: 11.5 },
      { x: 12, y: 9.5 },
      { x: 17, y: 6 },
    ],
    remoteSlots: [
      { x: 2.5, y: 5 },
      { x: 9, y: 11 },
      { x: 4, y: 10 },
      { x: 16, y: 6 },
    ],
    theme: {
      skyTop: "#312420",
      skyBottom: "#1b1412",
      floorA: "#6d472d",
      floorB: "#81553a",
      border: "#c98c56",
      glow: "rgba(255, 190, 110, 0.25)",
    },
    props: [
      {
        id: "clock",
        atlas: "library",
        source: { x: 74, y: 19, w: 68, h: 132 },
        x: 22,
        y: 18,
        w: 30,
        h: 58,
        rotation: 0,
        layer: "front",
      },
      {
        id: "plant-left",
        atlas: "library",
        source: { x: 0, y: 0, w: 22, h: 41 },
        x: 48,
        y: 18,
        w: 14,
        h: 26,
        rotation: 0,
        layer: "back",
      },
      {
        id: "plant-right",
        atlas: "library",
        source: { x: 0, y: 0, w: 22, h: 41 },
        x: 256,
        y: 18,
        w: 14,
        h: 26,
        rotation: 0,
        layer: "back",
      },
      {
        id: "shelf-right",
        atlas: "library",
        source: { x: 384, y: 370, w: 96, h: 135 },
        x: 272,
        y: 12,
        w: 48,
        h: 68,
        rotation: 0,
        layer: "mid-back",
      },
      {
        id: "desk-49446fc9",
        atlas: "library",
        source: { x: 140, y: 221, w: 105, h: 119 },
        x: 108,
        y: 80,
        w: 63,
        h: 71,
        rotation: 0,
        layer: "front",
      },
      {
        id: "shelf-left-mn8sv9we-cro7n",
        atlas: "library",
        source: { x: 147, y: 371, w: 91, h: 134 },
        x: 226,
        y: 14,
        w: 45,
        h: 66,
        rotation: 0,
        layer: "mid-back",
      },
      {
        id: "shelf-mid-left-mn8swzz3-2ater",
        atlas: "library",
        source: { x: 266, y: 365, w: 92, h: 139 },
        x: 178,
        y: 12,
        w: 45,
        h: 68,
        rotation: 0,
        layer: "mid-back",
      },
      {
        id: "nuevo-recorte-·-topdown-furniture-state-1-mn8tmnlf-xuyxc",
        atlas: "topdown-furniture-1",
        source: { x: 49, y: 116, w: 14, h: 44 },
        x: 304,
        y: 100,
        w: 14,
        h: 44,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-interiors-free-16x16-mn8txvlc-x8uty",
        atlas: "interiors-free-16",
        source: { x: 192, y: 1057, w: 15, h: 21 },
        x: 216,
        y: 122,
        w: 15,
        h: 21,
        rotation: 0,
        layer: "front",
      },
      {
        id: "nuevo-recorte-·-wall-puerta-mn8ufw65-4qm29",
        atlas: "wall-puerta",
        source: { x: 80, y: 64, w: 196, h: 107 },
        x: 100,
        y: 0,
        w: 118,
        h: 64,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-lpc-walls-mn8uiwou-jqybp",
        atlas: "lpc-walls",
        source: { x: 389, y: 2976, w: 87, h: 92 },
        x: 216,
        y: 104,
        w: 70,
        h: 74,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-topdown-furniture-state-2-mn8ul160-v3df3",
        atlas: "topdown-furniture-2",
        source: { x: 128, y: 4, w: 16, h: 27 },
        x: 242,
        y: 118,
        w: 16,
        h: 27,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-topdown-furniture-state-1-mn8umzu0-go3h5",
        atlas: "topdown-furniture-1",
        source: { x: 176, y: 117, w: 23, h: 36 },
        x: 10,
        y: 136,
        w: 23,
        h: 36,
        rotation: 0,
        layer: "mid-back",
      },
      {
        id: "nuevo-recorte-·-wall-puerta-mn8ufw65-4qm29-copy-mn8uvxv0-vddfq-copy-mn8uzd19-8wuul-copy-mn8uzy34-ni61p",
        atlas: "wall-puerta",
        source: { x: 335, y: 95, w: 68, h: 105 },
        x: 120,
        y: 10,
        w: 35,
        h: 54,
        rotation: 180,
        layer: "mid-back",
      },
      {
        id: "nuevo-recorte-·-wall-puerta-mn8vl4l3-w3qhl",
        atlas: "wall-puerta",
        source: { x: 32, y: 64, w: 40, h: 106 },
        x: 0,
        y: 0,
        w: 24,
        h: 64,
        rotation: 0,
        layer: "mid-back",
      },
      {
        id: "nuevo-recorte-·-wall-puerta-mn8ufw65-4qm29-copy-mn8vygwo-ku5n9",
        atlas: "wall-puerta",
        source: { x: 80, y: 64, w: 196, h: 107 },
        x: 0,
        y: 0,
        w: 118,
        h: 64,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-wall-puerta-mn8ufw65-4qm29-copy-mn8vyzm9-4aacx",
        atlas: "wall-puerta",
        source: { x: 80, y: 64, w: 196, h: 107 },
        x: 202,
        y: 0,
        w: 118,
        h: 64,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-topdown-doors-&-windows-mn8w582u-5mcam",
        atlas: "topdown-doors-windows",
        source: { x: 196, y: 51, w: 25, h: 28 },
        x: 68,
        y: 10,
        w: 25,
        h: 34,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-library-props-mn8w8unq-8pzxm",
        atlas: "library",
        source: { x: 296, y: 75, w: 32, h: 22 },
        x: 240,
        y: 130,
        w: 19,
        h: 13,
        rotation: 0,
        layer: "front",
      },
      {
        id: "nuevo-recorte-·-room-builder-16x16-mn8wb3eq-4b2jr",
        atlas: "interiors-free-32",
        source: { x: 0, y: 0, w: 32, h: 32 },
        x: 94,
        y: 164,
        w: 32,
        h: 32,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-room-builder-16x16-mn8wu25j-8k7h3",
        atlas: "room-builder-free-16",
        source: { x: 0, y: 0, w: 16, h: 16 },
        x: 96,
        y: 164,
        w: 16,
        h: 16,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-escritorio-individual-mn8xd7s8-flf04",
        atlas: "escritorio-idiviadual",
        source: { x: 219, y: 307, w: 1094, h: 410 },
        x: 216,
        y: 132,
        w: 74,
        h: 30,
        rotation: 0,
        layer: "mid-front",
      },
      {
        id: "nuevo-recorte-·-topdown-furniture-state-1-mn8xue5r-u7wi4",
        atlas: "topdown-furniture-1",
        source: { x: 97, y: 112, w: 15, h: 46 },
        x: 2,
        y: 134,
        w: 15,
        h: 46,
        rotation: 0,
        layer: "mid-front",
      },
      {
        id: "nuevo-recorte-·-topdown-furniture-state-1-mn8xwj6w-3j5l6",
        atlas: "topdown-furniture-1",
        source: { x: 2, y: 168, w: 11, h: 23 },
        x: 2,
        y: 169,
        w: 11,
        h: 23,
        rotation: 0,
        layer: "front",
      },
      {
        id: "nuevo-recorte-·-interiors-free-16x16-mn8xxvcg-punpb",
        atlas: "interiors-free-16",
        source: { x: 168, y: 714, w: 16, h: 30 },
        x: 2,
        y: 50,
        w: 16,
        h: 30,
        rotation: 0,
        layer: "mid-back",
      },
      {
        id: "nuevo-recorte-·-interiors-free-16x16-mn8xxvcg-punpb-copy-mn8xyxi7-ketn2",
        atlas: "interiors-free-16",
        source: { x: 168, y: 714, w: 16, h: 30 },
        x: 52,
        y: 42,
        w: 16,
        h: 30,
        rotation: 0,
        layer: "mid-back",
      },
      {
        id: "nuevo-recorte-·-interiors-free-16x16-mn8xxvcg-punpb-copy-mn8xyxi7-ketn2-copy-mn8xzaly-yoe1i",
        atlas: "interiors-free-16",
        source: { x: 213, y: 704, w: 23, h: 31 },
        x: 202,
        y: 161,
        w: 23,
        h: 31,
        rotation: 0,
        layer: "front",
      },
      {
        id: "nuevo-recorte-·-topdown-small-items-mn8y0cx8-xhkq2",
        atlas: "topdown-small-items",
        source: { x: 38, y: 51, w: 7, h: 13 },
        x: 280,
        y: 132,
        w: 7,
        h: 13,
        rotation: 0,
        layer: "mid-front",
      },
      {
        id: "nuevo-recorte-·-topdown-small-items-mn8y16uy-5loxr",
        atlas: "topdown-small-items",
        source: { x: 0, y: 0, w: 16, h: 16 },
        x: 278,
        y: 152,
        w: 16,
        h: 16,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-library-props-mn8y1v1c-mml7s",
        atlas: "library",
        source: { x: 239, y: 26, w: 33, h: 46 },
        x: 260,
        y: 118,
        w: 18,
        h: 25,
        rotation: 0,
        layer: "mid-front",
      },
      {
        id: "nuevo-recorte-·-library-props-mn8y1v1c-mml7s-copy-mn8y390d-ps0qf",
        atlas: "library",
        source: { x: 239, y: 26, w: 33, h: 46 },
        x: 158,
        y: 50,
        w: 18,
        h: 25,
        rotation: 0,
        layer: "mid-back",
      },
      {
        id: "nuevo-recorte-·-interiors-free-16x16-mn8xxvcg-punpb-copy-mn8xyxi7-ketn2-copy-mn8xzaly-yoe1i-copy-mn8y3fwy-23pfv",
        atlas: "interiors-free-16",
        source: { x: 213, y: 704, w: 23, h: 31 },
        x: 84,
        y: 161,
        w: 23,
        h: 31,
        rotation: 0,
        layer: "front",
      },
      {
        id: "nuevo-recorte-·-library-props-mn8y3tcs-cgyig",
        atlas: "library",
        source: { x: 57, y: 149, w: 54, h: 42 },
        x: 78,
        y: 52,
        w: 32,
        h: 25,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-topdown-furniture-state-1-mn8y66du-350l9",
        atlas: "topdown-furniture-1",
        source: { x: 84, y: 44, w: 24, h: 19 },
        x: 18,
        y: 128,
        w: 24,
        h: 19,
        rotation: 15,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-library-props-mn8y82c5-e05j4",
        atlas: "library",
        source: { x: 408, y: 73, w: 23, h: 21 },
        x: 22,
        y: 126,
        w: 12,
        h: 11,
        rotation: 0,
        layer: "back",
      },
      {
        id: "nuevo-recorte-·-library-props-mn8y82c5-e05j4-copy-mn8y998j-0c7nk",
        atlas: "library",
        source: { x: 409, y: 98, w: 23, h: 21 },
        x: 28,
        y: 126,
        w: 17,
        h: 16,
        rotation: 0,
        layer: "back",
      },
    ],
  },
  "shared-library": {
    name: "shared-library",
    width: 20,
    height: 12,
    tileSize: 16,
    spawnLocal: { x: 10, y: 9.5 },
    seatLocal: { x: 10, y: 8.2 },
    wanderNodes: [
      { x: 4.5, y: 8.4 },
      { x: 7.2, y: 9.4 },
      { x: 12.7, y: 9.3 },
      { x: 15.5, y: 8.4 },
    ],
    remoteSlots: [
      { x: 5.2, y: 8.1 },
      { x: 7.7, y: 8.9 },
      { x: 12.3, y: 8.9 },
      { x: 14.8, y: 8.1 },
    ],
    theme: {
      skyTop: "#2d2220",
      skyBottom: "#1a1412",
      floorA: "#5b3a28",
      floorB: "#734b34",
      border: "#c99162",
      glow: "rgba(255, 184, 102, 0.2)",
    },
    props: [
      {
        id: "wall",
        atlas: "library",
        source: libraryWall,
        x: 0,
        y: 0,
        w: 320,
        h: 84,
        layer: "back",
      },
      {
        id: "shelf-left",
        atlas: "library",
        source: emptyShelf,
        x: 8,
        y: 55,
        w: 42,
        h: 66,
        layer: "back",
      },
      {
        id: "shelf-mid-left",
        atlas: "library",
        source: shelfLeft,
        x: 60,
        y: 58,
        w: 42,
        h: 64,
        layer: "back",
      },
      {
        id: "shelf-mid-right",
        atlas: "library",
        source: shelfRight,
        x: 218,
        y: 57,
        w: 42,
        h: 65,
        layer: "back",
      },
      {
        id: "shelf-right",
        atlas: "library",
        source: shelfMiddle,
        x: 270,
        y: 55,
        w: 42,
        h: 67,
        layer: "back",
      },
      {
        id: "rug-left",
        atlas: "library",
        source: rugSmall,
        x: 28,
        y: 92,
        w: 110,
        h: 46,
        layer: "back",
        alpha: 0.9,
      },
      {
        id: "rug-right",
        atlas: "library",
        source: rugSmall,
        x: 182,
        y: 92,
        w: 110,
        h: 46,
        layer: "back",
        alpha: 0.9,
      },
      {
        id: "table-left",
        atlas: "library",
        source: table,
        x: 34,
        y: 76,
        w: 112,
        h: 76,
        layer: "back",
      },
      {
        id: "table-right",
        atlas: "library",
        source: table,
        x: 176,
        y: 76,
        w: 112,
        h: 76,
        layer: "back",
      },
    ],
  },
  "public-library": {
    name: "public-library",
    width: 20,
    height: 12,
    tileSize: 16,
    spawnLocal: { x: 10, y: 9.7 },
    seatLocal: { x: 10, y: 8.5 },
    wanderNodes: [
      { x: 4.2, y: 8.9 },
      { x: 6.8, y: 9.7 },
      { x: 10, y: 9.1 },
      { x: 13.2, y: 9.7 },
      { x: 15.8, y: 8.9 },
    ],
    remoteSlots: [
      { x: 3.8, y: 8.3 },
      { x: 6.2, y: 8.8 },
      { x: 8.7, y: 8.3 },
      { x: 11.3, y: 8.3 },
      { x: 13.8, y: 8.8 },
      { x: 16.2, y: 8.3 },
    ],
    theme: {
      skyTop: "#2a211f",
      skyBottom: "#181311",
      floorA: "#573a29",
      floorB: "#724b35",
      border: "#cf9a67",
      glow: "rgba(255, 193, 109, 0.16)",
    },
    props: [
      {
        id: "wall",
        atlas: "library",
        source: libraryWall,
        x: 0,
        y: 0,
        w: 320,
        h: 82,
        layer: "back",
      },
      {
        id: "clock",
        atlas: "library",
        source: grandfatherClock,
        x: 146,
        y: 8,
        w: 28,
        h: 54,
        layer: "back",
      },
      {
        id: "stack-left",
        atlas: "library",
        source: crate,
        x: 26,
        y: 33,
        w: 28,
        h: 22,
        layer: "back",
      },
      {
        id: "stack-right",
        atlas: "library",
        source: crate,
        x: 268,
        y: 33,
        w: 28,
        h: 22,
        layer: "back",
      },
      {
        id: "shelf-left",
        atlas: "library",
        source: shelfLeft,
        x: 10,
        y: 54,
        w: 40,
        h: 64,
        layer: "back",
      },
      {
        id: "shelf-right",
        atlas: "library",
        source: shelfRight,
        x: 270,
        y: 54,
        w: 40,
        h: 64,
        layer: "back",
      },
      {
        id: "rug-main",
        atlas: "library",
        source: rugLarge,
        x: 78,
        y: 88,
        w: 164,
        h: 56,
        layer: "back",
        alpha: 0.9,
      },
      {
        id: "desk-main",
        atlas: "library",
        source: desk,
        x: 62,
        y: 72,
        w: 194,
        h: 84,
        layer: "back",
      },
    ],
  },
  garden: {
    name: "garden",
    width: 20,
    height: 12,
    tileSize: 16,
    spawnLocal: { x: 10, y: 8.8 },
    wanderNodes: [
      { x: 4.8, y: 8.6 },
      { x: 7, y: 6.4 },
      { x: 10, y: 8.9 },
      { x: 13, y: 6.4 },
      { x: 15.2, y: 8.6 },
    ],
    remoteSlots: [
      { x: 5, y: 8.2 },
      { x: 7.6, y: 6.6 },
      { x: 12.4, y: 6.6 },
      { x: 15, y: 8.2 },
    ],
    theme: {
      skyTop: "#203627",
      skyBottom: "#122317",
      floorA: "#4a6a47",
      floorB: "#5c7d57",
      border: "#96c486",
      glow: "rgba(190, 237, 169, 0.14)",
    },
    props: [
      { id: "path", x: 74, y: 94, w: 172, h: 44, layer: "back", shape: "path" },
      {
        id: "tree-left-1",
        x: 10,
        y: 18,
        w: 56,
        h: 110,
        layer: "back",
        shape: "tree",
      },
      {
        id: "tree-left-2",
        x: 46,
        y: 10,
        w: 54,
        h: 116,
        layer: "back",
        shape: "tree",
      },
      {
        id: "tree-right-1",
        x: 224,
        y: 16,
        w: 58,
        h: 112,
        layer: "back",
        shape: "tree",
      },
      {
        id: "tree-right-2",
        x: 258,
        y: 8,
        w: 54,
        h: 118,
        layer: "back",
        shape: "tree",
      },
      {
        id: "column-left",
        x: 60,
        y: 48,
        w: 18,
        h: 64,
        layer: "front",
        shape: "column",
      },
      {
        id: "column-right",
        x: 242,
        y: 48,
        w: 18,
        h: 64,
        layer: "front",
        shape: "column",
      },
      {
        id: "bench",
        x: 114,
        y: 90,
        w: 92,
        h: 32,
        layer: "front",
        shape: "bench",
      },
    ],
  },
};

export const PUBLISHED_SCENE_STORAGE_KEY =
  "scholars-sanctuary-scene-published-v1";
export const PUBLISHED_SCENE_EVENT = "scholars-sanctuary-scene-published";
const PUBLISHED_SCENE_ENDPOINT = "/api/editor/scenes";

let publishedSceneMapsCache: Partial<Record<SceneKind, SceneMap>> | null = null;

function createPropId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeFacing(value: unknown, fallback: Facing): Facing {
  return value === "up" ||
    value === "down" ||
    value === "left" ||
    value === "right"
    ? value
    : fallback;
}

function normalizeRotation(value?: number) {
  const safe = Number.isFinite(value) ? (value as number) : 0;
  const normalized = ((safe % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
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

export function cloneSceneMap(map: SceneMap): SceneMap {
  return structuredClone(map);
}

export function normalizeSceneMap(
  value: unknown,
  sceneKind: SceneKind,
): SceneMap {
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

export function normalizePublishedSceneMaps(value: unknown) {
  const parsed =
    value && typeof value === "object"
      ? (value as Partial<Record<SceneKind, unknown>>)
      : {};

  return {
    "solo-library": parsed["solo-library"]
      ? normalizeSceneMap(parsed["solo-library"], "solo-library")
      : undefined,
    "shared-library": parsed["shared-library"]
      ? normalizeSceneMap(parsed["shared-library"], "shared-library")
      : undefined,
    "public-library": parsed["public-library"]
      ? normalizeSceneMap(parsed["public-library"], "public-library")
      : undefined,
    garden: parsed.garden
      ? normalizeSceneMap(parsed.garden, "garden")
      : undefined,
  } satisfies Partial<Record<SceneKind, SceneMap>>;
}

function loadPublishedSceneMapsFromStorage() {
  if (typeof window === "undefined") {
    return {} as Partial<Record<SceneKind, SceneMap>>;
  }

  const raw = window.localStorage.getItem(PUBLISHED_SCENE_STORAGE_KEY);
  if (!raw) {
    return {} as Partial<Record<SceneKind, SceneMap>>;
  }

  try {
    return normalizePublishedSceneMaps(JSON.parse(raw));
  } catch {
    return {} as Partial<Record<SceneKind, SceneMap>>;
  }
}

function getPublishedSceneMaps() {
  if (publishedSceneMapsCache === null) {
    publishedSceneMapsCache = loadPublishedSceneMapsFromStorage();
  }

  return publishedSceneMapsCache;
}

export function refreshPublishedSceneMaps() {
  publishedSceneMapsCache = loadPublishedSceneMapsFromStorage();
  return publishedSceneMapsCache;
}

export function publishSceneMaps(
  nextMaps: Partial<Record<SceneKind, SceneMap>>,
) {
  const normalized = normalizePublishedSceneMaps(nextMaps);

  publishedSceneMapsCache = normalized;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      PUBLISHED_SCENE_STORAGE_KEY,
      JSON.stringify(normalized),
    );
    window.dispatchEvent(new CustomEvent(PUBLISHED_SCENE_EVENT));
  }

  return normalized;
}

async function parsePublishedSceneMapsResponse(response: Response) {
  if (!response.ok) {
    throw new Error("No se pudieron sincronizar las escenas.");
  }

  const payload = (await response.json()) as { scenes?: unknown };
  return publishSceneMaps(normalizePublishedSceneMaps(payload.scenes));
}

export async function syncPublishedSceneMapsFromServer() {
  if (typeof window === "undefined") {
    return {} as Partial<Record<SceneKind, SceneMap>>;
  }

  const response = await fetch(PUBLISHED_SCENE_ENDPOINT, {
    credentials: "same-origin",
  });
  return parsePublishedSceneMapsResponse(response);
}

export async function publishSceneMapsToServer(
  nextMaps: Partial<Record<SceneKind, SceneMap>>,
) {
  if (typeof window === "undefined") {
    return normalizePublishedSceneMaps(nextMaps);
  }

  const response = await fetch(PUBLISHED_SCENE_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scenes: nextMaps,
    }),
  });

  return parsePublishedSceneMapsResponse(response);
}

export async function resetPublishedSceneMapsOnServer() {
  if (typeof window === "undefined") {
    return {} as Partial<Record<SceneKind, SceneMap>>;
  }

  const response = await fetch(PUBLISHED_SCENE_ENDPOINT, {
    method: "DELETE",
    credentials: "same-origin",
  });

  return parsePublishedSceneMapsResponse(response);
}

export function clearPublishedSceneMaps() {
  publishedSceneMapsCache = {};

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PUBLISHED_SCENE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(PUBLISHED_SCENE_EVENT));
  }
}

export function getSceneMap(sceneKind: SceneKind) {
  return getPublishedSceneMaps()[sceneKind] ?? sceneMaps[sceneKind];
}

export function getRemoteSlot(sceneKind: SceneKind, index: number) {
  const map = getSceneMap(sceneKind);
  return map.remoteSlots[index % map.remoteSlots.length];
}
