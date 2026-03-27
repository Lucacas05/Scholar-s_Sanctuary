import type { SceneKind, SceneMap } from "@/lib/sanctuary/canvas/types";

const libraryWall = { x: 747, y: 0, w: 741, h: 160 } as const;
const rugLarge = { x: 451, y: 4, w: 159, h: 61 } as const;
const rugSmall = { x: 451, y: 76, w: 155, h: 60 } as const;
const desk = { x: 527, y: 157, w: 218, h: 109 } as const;
const table = { x: 331, y: 157, w: 195, h: 112 } as const;
const emptyShelf = { x: 0, y: 385, w: 88, h: 129 } as const;
const shelfLeft = { x: 132, y: 386, w: 89, h: 128 } as const;
const shelfRight = { x: 263, y: 385, w: 89, h: 129 } as const;
const shelfMiddle = { x: 397, y: 385, w: 91, h: 129 } as const;
const chairBlue = { x: 614, y: 4, w: 69, h: 90 } as const;
const grandfatherClock = { x: 47, y: 9, w: 68, h: 132 } as const;
const plantSmall = { x: 0, y: 0, w: 22, h: 41 } as const;
const crate = { x: 118, y: 36, w: 62, h: 47 } as const;

export const sceneMaps: Record<SceneKind, SceneMap> = {
  "solo-library": {
    name: "solo-library",
    width: 20,
    height: 12,
    tileSize: 16,
    spawnLocal: { x: 10, y: 9.3 },
    seatLocal: { x: 10, y: 7.9 },
    wanderNodes: [
      { x: 7, y: 8.7 },
      { x: 9, y: 9.3 },
      { x: 12, y: 9.1 },
      { x: 14, y: 8.5 },
    ],
    remoteSlots: [{ x: 6.4, y: 8.9 }, { x: 13.6, y: 8.9 }],
    theme: {
      skyTop: "#312420",
      skyBottom: "#1b1412",
      floorA: "#6d472d",
      floorB: "#81553a",
      border: "#c98c56",
      glow: "rgba(255, 190, 110, 0.25)",
    },
    props: [
      { id: "wall", atlas: "library", source: libraryWall, x: 0, y: 0, w: 320, h: 86, layer: "back" },
      { id: "clock", atlas: "library", source: grandfatherClock, x: 14, y: 16, w: 30, h: 58, layer: "back" },
      { id: "plant-left", atlas: "library", source: plantSmall, x: 48, y: 18, w: 14, h: 26, layer: "back" },
      { id: "plant-right", atlas: "library", source: plantSmall, x: 256, y: 18, w: 14, h: 26, layer: "back" },
      { id: "shelf-left", atlas: "library", source: shelfLeft, x: 18, y: 56, w: 48, h: 68, layer: "back" },
      { id: "shelf-right", atlas: "library", source: shelfMiddle, x: 254, y: 54, w: 48, h: 70, layer: "back" },
      { id: "rug", atlas: "library", source: rugLarge, x: 80, y: 90, w: 160, h: 56, layer: "back", alpha: 0.92 },
      { id: "desk", atlas: "library", source: table, x: 86, y: 82, w: 144, h: 82, layer: "back" },
      { id: "chair", atlas: "library", source: chairBlue, x: 138, y: 92, w: 42, h: 52, layer: "front" },
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
      { id: "wall", atlas: "library", source: libraryWall, x: 0, y: 0, w: 320, h: 84, layer: "back" },
      { id: "shelf-left", atlas: "library", source: emptyShelf, x: 8, y: 55, w: 42, h: 66, layer: "back" },
      { id: "shelf-mid-left", atlas: "library", source: shelfLeft, x: 60, y: 58, w: 42, h: 64, layer: "back" },
      { id: "shelf-mid-right", atlas: "library", source: shelfRight, x: 218, y: 57, w: 42, h: 65, layer: "back" },
      { id: "shelf-right", atlas: "library", source: shelfMiddle, x: 270, y: 55, w: 42, h: 67, layer: "back" },
      { id: "rug-left", atlas: "library", source: rugSmall, x: 28, y: 92, w: 110, h: 46, layer: "back", alpha: 0.9 },
      { id: "rug-right", atlas: "library", source: rugSmall, x: 182, y: 92, w: 110, h: 46, layer: "back", alpha: 0.9 },
      { id: "table-left", atlas: "library", source: table, x: 34, y: 76, w: 112, h: 76, layer: "back" },
      { id: "table-right", atlas: "library", source: table, x: 176, y: 76, w: 112, h: 76, layer: "back" },
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
      { id: "wall", atlas: "library", source: libraryWall, x: 0, y: 0, w: 320, h: 82, layer: "back" },
      { id: "clock", atlas: "library", source: grandfatherClock, x: 146, y: 8, w: 28, h: 54, layer: "back" },
      { id: "stack-left", atlas: "library", source: crate, x: 26, y: 33, w: 28, h: 22, layer: "back" },
      { id: "stack-right", atlas: "library", source: crate, x: 268, y: 33, w: 28, h: 22, layer: "back" },
      { id: "shelf-left", atlas: "library", source: shelfLeft, x: 10, y: 54, w: 40, h: 64, layer: "back" },
      { id: "shelf-right", atlas: "library", source: shelfRight, x: 270, y: 54, w: 40, h: 64, layer: "back" },
      { id: "rug-main", atlas: "library", source: rugLarge, x: 78, y: 88, w: 164, h: 56, layer: "back", alpha: 0.9 },
      { id: "desk-main", atlas: "library", source: desk, x: 62, y: 72, w: 194, h: 84, layer: "back" },
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
      { id: "tree-left-1", x: 10, y: 18, w: 56, h: 110, layer: "back", shape: "tree" },
      { id: "tree-left-2", x: 46, y: 10, w: 54, h: 116, layer: "back", shape: "tree" },
      { id: "tree-right-1", x: 224, y: 16, w: 58, h: 112, layer: "back", shape: "tree" },
      { id: "tree-right-2", x: 258, y: 8, w: 54, h: 118, layer: "back", shape: "tree" },
      { id: "column-left", x: 60, y: 48, w: 18, h: 64, layer: "front", shape: "column" },
      { id: "column-right", x: 242, y: 48, w: 18, h: 64, layer: "front", shape: "column" },
      { id: "bench", x: 114, y: 90, w: 92, h: 32, layer: "front", shape: "bench" },
    ],
  },
};

export function getSceneMap(sceneKind: SceneKind) {
  return sceneMaps[sceneKind];
}

export function getRemoteSlot(sceneKind: SceneKind, index: number) {
  const map = getSceneMap(sceneKind);
  return map.remoteSlots[index % map.remoteSlots.length];
}
