import type { AvatarConfig } from "@/lib/sanctuary/store";

export type SceneKind = "solo-library" | "shared-library" | "public-library" | "garden";
export type Facing = "up" | "down" | "left" | "right";
export type ActorPose = "idle" | "walk" | "sitting";
export type ActorState = "idle" | "studying" | "break";
export type SceneLayer = "back" | "mid-back" | "mid-front" | "front";

export const sceneLayerOrder: SceneLayer[] = ["back", "mid-back", "mid-front", "front"];

export interface CanvasRemotePlayer {
  id: string;
  displayName: string;
  avatar: AvatarConfig;
  tileX: number;
  tileY: number;
  facing?: Facing;
  state: ActorState;
  message?: string;
}

export interface SanctuaryCanvasHandle {
  iniciarFocus(): Promise<void>;
  iniciarBreak(): Promise<void>;
  mostrarMensaje(texto: string): void;
  actualizarOtrosJugadores(datos: CanvasRemotePlayer[]): void;
}

export interface TilePoint {
  x: number;
  y: number;
}

export interface RectSlice {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneProp {
  id: string;
  atlas?: string;
  source?: RectSlice;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  layer: SceneLayer;
  alpha?: number;
  tint?: string;
  shape?: "tree" | "column" | "bench" | "path";
}

export interface SceneBackdropTheme {
  skyTop: string;
  skyBottom: string;
  floorA: string;
  floorB: string;
  border: string;
  glow?: string;
}

export interface SceneMap {
  name: SceneKind;
  width: number;
  height: number;
  tileSize: number;
  spawnLocal: TilePoint;
  seatLocal?: TilePoint;
  seatSlots?: TilePoint[];
  wanderNodes: TilePoint[];
  remoteSlots: TilePoint[];
  props: SceneProp[];
  theme: SceneBackdropTheme;
}
