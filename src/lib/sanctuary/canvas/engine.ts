import type { AvatarConfig } from "@/lib/sanctuary/store";
import {
  drawPixelAvatar,
  drawSpeechBubble,
} from "@/lib/sanctuary/canvas/avatarPainter";
import { sceneAtlasEntries } from "@/lib/sanctuary/canvas/atlasCatalog";
import { getSceneMap } from "@/lib/sanctuary/canvas/sceneMaps";
import {
  drawSceneBackground,
  drawSceneProp,
} from "@/lib/sanctuary/canvas/renderer";
import {
  sceneLayerOrder,
  type ActorPose,
  type ActorState,
  type CanvasRemotePlayer,
  type Facing,
  type SceneKind,
  type SceneMap,
  type TilePoint,
} from "@/lib/sanctuary/canvas/types";

interface LocalActor {
  x: number;
  y: number;
  avatar: AvatarConfig;
  state: ActorState;
  pose: ActorPose;
  facing: Facing;
  route: TilePoint[];
  wanderIndex: number;
  wanderPauseMs: number;
  autoBubble: string;
  temporaryBubble: string;
  temporaryBubbleUntil: number;
}

interface RemoteActor extends CanvasRemotePlayer {
  pose: ActorPose;
}

interface CollisionRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const LOGICAL_WIDTH = 320;
const LOGICAL_HEIGHT = 192;
const FIXED_STEP_MS = 1000 / 60;
const FLOOR_TOP_PX = 54;
const ACTOR_COLLIDER_HALF_WIDTH = 4;
const ACTOR_COLLIDER_HEIGHT = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLayerOrder(layer: SceneMap["props"][number]["layer"]) {
  const index = sceneLayerOrder.indexOf(layer);
  return index === -1 ? 0 : index;
}

function chooseFacing(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Facing {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }

  return dy >= 0 ? "down" : "up";
}

function getLocalSeatTarget(map: SceneMap) {
  const seatSlots = map.seatSlots?.filter(Boolean) ?? [];
  if (seatSlots.length > 0) {
    return seatSlots[Math.floor(Math.random() * seatSlots.length)];
  }

  return map.seatLocal;
}

function normalizeRotation(rotation = 0) {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getRotatedBounds(width: number, height: number, rotation = 0) {
  const radians = (normalizeRotation(rotation) * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  return {
    width: width * cosine + height * sine,
    height: width * sine + height * cosine,
  };
}

function rectsOverlap(left: CollisionRect, right: CollisionRect) {
  return (
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y
  );
}

function getPropCollisionRect(
  prop: SceneMap["props"][number],
): CollisionRect | null {
  if (prop.shape === "path" || (prop.w <= 18 && prop.h <= 18)) {
    return null;
  }

  const rotated = getRotatedBounds(prop.w, prop.h, prop.rotation ?? 0);
  const boundsX = prop.x + prop.w / 2 - rotated.width / 2;
  const boundsY = prop.y + prop.h / 2 - rotated.height / 2;
  const wallLikeAtlas =
    prop.atlas?.includes("walls") || prop.atlas === "wall-puerta";
  const topWallLike =
    wallLikeAtlas || (prop.y <= 18 && prop.w >= 72 && prop.h >= 44);
  const narrowTall = prop.h >= 44 && prop.w <= 34;
  const wideFurniture = prop.w >= 44 && prop.h >= 28;

  let colliderWidth = rotated.width * 0.72;
  let colliderHeight = Math.max(10, rotated.height * 0.24);

  if (prop.shape === "tree") {
    colliderWidth = rotated.width * 0.36;
    colliderHeight = Math.max(14, rotated.height * 0.16);
  } else if (prop.shape === "column") {
    colliderWidth = rotated.width * 0.76;
    colliderHeight = Math.max(10, rotated.height * 0.16);
  } else if (prop.shape === "bench") {
    colliderWidth = rotated.width * 0.84;
    colliderHeight = Math.max(10, rotated.height * 0.3);
  } else if (topWallLike) {
    colliderWidth = rotated.width * 0.94;
    colliderHeight = Math.min(18, Math.max(10, rotated.height * 0.22));
  } else if (narrowTall) {
    colliderWidth = rotated.width * 0.58;
    colliderHeight = Math.max(12, rotated.height * 0.18);
  } else if (wideFurniture) {
    colliderWidth = rotated.width * 0.82;
    colliderHeight = Math.max(12, rotated.height * 0.28);
  }

  if (colliderWidth < 8 || colliderHeight < 8) {
    return null;
  }

  return {
    id: prop.id,
    x: boundsX + (rotated.width - colliderWidth) / 2,
    y: boundsY + rotated.height - colliderHeight,
    w: colliderWidth,
    h: colliderHeight,
  };
}

export class SanctuaryCanvasEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private map: SceneMap;
  private sceneKind: SceneKind;
  private rafId = 0;
  private lastTimestamp = 0;
  private logicalWidth = LOGICAL_WIDTH;
  private logicalHeight = LOGICAL_HEIGHT;
  private scale = 1;
  private tick = 0;
  private destroyed = false;
  private atlasImages: Partial<Record<string, HTMLImageElement>> = {};
  private collisionRects: CollisionRect[] = [];
  private localActor: LocalActor;
  private remoteActors = new Map<string, RemoteActor>();
  private focusResolver: (() => void) | null = null;
  private focusPromise: Promise<void> | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    sceneKind: SceneKind,
    avatar: AvatarConfig,
  ) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo inicializar el contexto 2D del canvas.");
    }

    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.sceneKind = sceneKind;
    this.map = getSceneMap(sceneKind);
    this.collisionRects = this.buildCollisionRects(this.map);
    this.localActor = {
      x: this.map.spawnLocal.x,
      y: this.map.spawnLocal.y,
      avatar,
      state: "idle",
      pose: "idle",
      facing: "down",
      route: [],
      wanderIndex: 0,
      wanderPauseMs: 0,
      autoBubble: "",
      temporaryBubble: "",
      temporaryBubbleUntil: 0,
    };

    this.resizeToContainer();
    void this.loadAssets();
    this.render();
    this.start();
  }

  private async loadAssets() {
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
    this.atlasImages = Object.fromEntries(loadedEntries);
    this.render();
  }

  setAvatar(avatar: AvatarConfig) {
    this.localActor.avatar = avatar;
    this.render();
  }

  setScene(sceneKind: SceneKind) {
    this.sceneKind = sceneKind;
    this.map = getSceneMap(sceneKind);
    this.collisionRects = this.buildCollisionRects(this.map);
    this.localActor.x = this.map.spawnLocal.x;
    this.localActor.y = this.map.spawnLocal.y;
    this.localActor.route = [];
    this.localActor.wanderIndex = 0;
    this.localActor.wanderPauseMs = 0;
    this.localActor.pose = "idle";
    this.localActor.state = "idle";
    this.localActor.autoBubble = "";
    this.localActor.temporaryBubble = "";
    this.remoteActors.clear();
    this.render();
  }

  resizeToContainer() {
    const parent = this.canvas.parentElement;
    if (!parent) {
      return;
    }

    const availableWidth = Math.max(1, Math.floor(parent.clientWidth));
    const availableHeight = Math.max(1, Math.floor(parent.clientHeight));
    const scaleX = availableWidth / this.logicalWidth;
    const scaleY = availableHeight / this.logicalHeight;

    this.scale = Math.max(1, Math.min(scaleX || 1, scaleY || 1));
    this.canvas.width = this.logicalWidth;
    this.canvas.height = this.logicalHeight;
    this.canvas.style.width = `${this.logicalWidth * this.scale}px`;
    this.canvas.style.height = `${this.logicalHeight * this.scale}px`;
    this.render();
  }

  destroy() {
    this.destroyed = true;
    window.cancelAnimationFrame(this.rafId);
  }

  iniciarFocus() {
    const seatTarget = getLocalSeatTarget(this.map);
    this.localActor.state = "studying";
    this.localActor.pose = "walk";
    this.localActor.autoBubble = "";
    this.localActor.temporaryBubble = "";
    this.localActor.route = seatTarget ? [seatTarget] : [];

    if (!seatTarget) {
      this.localActor.pose = "idle";
      this.localActor.autoBubble = "Estudiando 📖";
      this.render();
      return Promise.resolve();
    }

    if (!this.focusPromise) {
      this.focusPromise = new Promise<void>((resolve) => {
        this.focusResolver = resolve;
      });
    }

    this.render();
    return this.focusPromise;
  }

  iniciarBreak() {
    this.localActor.state = "break";
    this.localActor.pose = "walk";
    this.localActor.autoBubble = "";
    this.localActor.route = [];
    this.localActor.wanderPauseMs = 0;
    this.localActor.temporaryBubble = "";
    this.localActor.temporaryBubbleUntil = 0;
    this.render();
    return Promise.resolve();
  }

  mostrarMensaje(texto: string) {
    const trimmed = texto.trim().slice(0, 80);
    if (!trimmed) {
      return;
    }
    this.localActor.temporaryBubble = trimmed;
    this.localActor.temporaryBubbleUntil = this.tick + 2500;
    this.render();
  }

  actualizarOtrosJugadores(datos: CanvasRemotePlayer[]) {
    const next = new Map<string, RemoteActor>();

    datos.forEach((entry) => {
      next.set(entry.id, {
        ...entry,
        pose: entry.state === "studying" ? "sitting" : "idle",
      });
    });

    this.remoteActors = next;
    this.render();
  }

  getTextState() {
    return JSON.stringify(
      {
        scene: this.sceneKind,
        coordinateSystem:
          "tile grid; origen arriba-izquierda, x hacia la derecha, y hacia abajo",
        local: {
          x: Number(this.localActor.x.toFixed(2)),
          y: Number(this.localActor.y.toFixed(2)),
          state: this.localActor.state,
          pose: this.localActor.pose,
          facing: this.localActor.facing,
          bubble: this.getLocalBubbleText(),
        },
        remotos: Array.from(this.remoteActors.values()).map((actor) => ({
          id: actor.id,
          x: actor.tileX,
          y: actor.tileY,
          state: actor.state,
          message: actor.message ?? "",
        })),
      },
      null,
      0,
    );
  }

  advanceTime(ms: number) {
    const steps = Math.max(1, Math.round(ms / FIXED_STEP_MS));
    for (let index = 0; index < steps; index += 1) {
      this.step(FIXED_STEP_MS);
    }
    this.render();
  }

  private start() {
    const loop = (timestamp: number) => {
      if (this.destroyed) {
        return;
      }

      const delta =
        this.lastTimestamp === 0
          ? FIXED_STEP_MS
          : clamp(timestamp - this.lastTimestamp, 8, 48);
      this.lastTimestamp = timestamp;
      this.step(delta);
      this.render();
      this.rafId = window.requestAnimationFrame(loop);
    };

    this.rafId = window.requestAnimationFrame(loop);
  }

  private step(deltaMs: number) {
    this.tick += deltaMs;
    this.updateLocalActor(deltaMs / 1000);
    if (
      this.localActor.temporaryBubble &&
      this.tick >= this.localActor.temporaryBubbleUntil
    ) {
      this.localActor.temporaryBubble = "";
      this.localActor.temporaryBubbleUntil = 0;
    }
  }

  private updateLocalActor(deltaSeconds: number) {
    if (this.localActor.route.length > 0) {
      const [target] = this.localActor.route;
      const arrived = this.moveLocalToward(
        target,
        deltaSeconds,
        this.localActor.state === "studying" ? 2.2 : 1.8,
      );

      if (arrived) {
        this.localActor.route.shift();
        if (
          this.localActor.route.length === 0 &&
          this.localActor.state === "studying"
        ) {
          this.localActor.pose = "sitting";
          this.localActor.facing = "up";
          this.localActor.autoBubble = "Estudiando 📖";
          this.focusResolver?.();
          this.focusResolver = null;
          this.focusPromise = null;
        }
      }
      return;
    }

    if (this.localActor.state !== "break") {
      this.localActor.pose =
        this.localActor.state === "studying" &&
        this.localActor.pose === "sitting"
          ? "sitting"
          : "idle";
      return;
    }

    if (this.map.wanderNodes.length === 0) {
      this.localActor.pose = "idle";
      return;
    }

    if (this.localActor.wanderPauseMs > 0) {
      this.localActor.wanderPauseMs = Math.max(
        0,
        this.localActor.wanderPauseMs - deltaSeconds * 1000,
      );
      this.localActor.pose = "idle";
      return;
    }

    const target =
      this.map.wanderNodes[
        this.localActor.wanderIndex % this.map.wanderNodes.length
      ];
    const arrived = this.moveLocalToward(
      target,
      deltaSeconds,
      this.sceneKind === "garden" ? 1.5 : 1.3,
    );
    this.localActor.pose = "walk";

    if (arrived) {
      this.localActor.wanderIndex =
        (this.localActor.wanderIndex + 1) % this.map.wanderNodes.length;
      this.localActor.wanderPauseMs = 650;
      this.localActor.pose = "idle";
    }
  }

  private moveLocalToward(
    target: TilePoint,
    deltaSeconds: number,
    speed: number,
  ) {
    const dx = target.x - this.localActor.x;
    const dy = target.y - this.localActor.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= speed * deltaSeconds || distance < 0.05) {
      this.localActor.x = target.x;
      this.localActor.y = target.y;
      return true;
    }

    this.localActor.facing = chooseFacing(
      this.localActor.x,
      this.localActor.y,
      target.x,
      target.y,
    );
    const nextX = this.localActor.x + (dx / distance) * speed * deltaSeconds;
    const nextY = this.localActor.y + (dy / distance) * speed * deltaSeconds;
    const resolved = this.resolveLocalMovement(nextX, nextY, target);
    this.localActor.x = resolved.x;
    this.localActor.y = resolved.y;
    return false;
  }

  private buildCollisionRects(map: SceneMap) {
    return map.props
      .map((prop) => getPropCollisionRect(prop))
      .filter((rect): rect is CollisionRect => Boolean(rect));
  }

  private resolveLocalMovement(
    nextX: number,
    nextY: number,
    target?: TilePoint,
  ) {
    const current = { x: this.localActor.x, y: this.localActor.y };
    const clamped = this.clampLocalPosition(nextX, nextY);
    const fullStep = { x: clamped.x, y: clamped.y };

    if (!this.collidesAt(fullStep.x, fullStep.y, target)) {
      return fullStep;
    }

    const xOnly = { x: clamped.x, y: current.y };
    const yOnly = { x: current.x, y: clamped.y };
    const halfStep = this.clampLocalPosition(
      current.x + (clamped.x - current.x) * 0.5,
      current.y + (clamped.y - current.y) * 0.5,
    );
    const candidates = [
      Math.abs(clamped.x - current.x) >= Math.abs(clamped.y - current.y)
        ? xOnly
        : yOnly,
      Math.abs(clamped.x - current.x) >= Math.abs(clamped.y - current.y)
        ? yOnly
        : xOnly,
      halfStep,
      { x: halfStep.x, y: current.y },
      { x: current.x, y: halfStep.y },
    ];

    for (const candidate of candidates) {
      if (!this.collidesAt(candidate.x, candidate.y, target)) {
        return candidate;
      }
    }

    return current;
  }

  private clampLocalPosition(tileX: number, tileY: number) {
    const minX = 0.5;
    const maxX = this.map.width - 0.5;
    const minY = FLOOR_TOP_PX / this.map.tileSize + 0.5;
    const maxY = this.map.height - 0.15;
    return {
      x: clamp(tileX, minX, maxX),
      y: clamp(tileY, minY, maxY),
    };
  }

  private collidesAt(tileX: number, tileY: number, target?: TilePoint) {
    const targetRadius = this.localActor.state === "studying" ? 1.65 : 0.24;
    if (
      target &&
      Math.hypot(target.x - tileX, target.y - tileY) <= targetRadius
    ) {
      return false;
    }

    const actorRect = this.getActorCollisionRect(tileX, tileY);
    return this.collisionRects.some((rect) => rectsOverlap(actorRect, rect));
  }

  private getActorCollisionRect(tileX: number, tileY: number): CollisionRect {
    const px = tileX * this.map.tileSize;
    const py = tileY * this.map.tileSize;
    return {
      id: "local-actor",
      x: px - ACTOR_COLLIDER_HALF_WIDTH,
      y: py - ACTOR_COLLIDER_HEIGHT,
      w: ACTOR_COLLIDER_HALF_WIDTH * 2,
      h: ACTOR_COLLIDER_HEIGHT,
    };
  }

  private getLocalBubbleText() {
    if (this.localActor.temporaryBubble) {
      return this.localActor.temporaryBubble;
    }
    return this.localActor.autoBubble;
  }

  private render() {
    const { ctx } = this;
    const { width, height, tileSize } = this.map;
    const pixelWidth = width * tileSize;
    const pixelHeight = height * tileSize;

    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    drawSceneBackground(ctx, this.map);

    const behindActors = this.map.props
      .filter((prop) => prop.layer === "back" || prop.layer === "mid-back")
      .sort(
        (left, right) => getLayerOrder(left.layer) - getLayerOrder(right.layer),
      );
    const inFrontOfActors = this.map.props
      .filter((prop) => prop.layer === "mid-front" || prop.layer === "front")
      .sort(
        (left, right) => getLayerOrder(left.layer) - getLayerOrder(right.layer),
      );
    behindActors.forEach((prop) => drawSceneProp(ctx, prop, this.atlasImages));

    const actors = [
      {
        id: "local",
        x: this.localActor.x,
        y: this.localActor.y,
        avatar: this.localActor.avatar,
        state: this.localActor.state,
        pose: this.localActor.pose,
        facing: this.localActor.facing,
        highlighted: true,
        bubble: this.getLocalBubbleText(),
      },
      ...Array.from(this.remoteActors.values()).map((actor, index) => ({
        id: actor.id,
        x: actor.tileX,
        y:
          actor.tileY +
          (actor.state === "break"
            ? Math.sin((this.tick + index * 90) / 420) * 0.08
            : 0),
        avatar: actor.avatar,
        state: actor.state,
        pose: actor.pose,
        facing: actor.facing ?? "down",
        highlighted: false,
        bubble:
          actor.message ||
          (actor.state === "studying"
            ? "Estudiando 📖"
            : actor.state === "break"
              ? "En pausa"
              : ""),
      })),
    ].sort((left, right) => left.y - right.y);

    actors.forEach((actor) => {
      const drawX = Math.round(actor.x * tileSize);
      const drawY = Math.round(actor.y * tileSize);
      drawPixelAvatar(ctx, {
        avatar: actor.avatar,
        state: actor.state,
        pose: actor.pose,
        facing: actor.facing,
        x: drawX,
        y: drawY,
        tick: this.tick,
        highlighted: actor.highlighted,
      });
      drawSpeechBubble(ctx, actor.bubble, drawX, drawY - 8);
    });

    inFrontOfActors.forEach((prop) =>
      drawSceneProp(ctx, prop, this.atlasImages),
    );

    if (
      Object.keys(this.atlasImages).length === 0 &&
      this.sceneKind !== "garden"
    ) {
      ctx.fillStyle = "#f0d6b0";
      ctx.font = "bold 10px monospace";
      ctx.fillText("Cargando atlas...", 12, pixelHeight - 12);
    }
  }
}
