export const sceneAtlasCatalog = {
  library: {
    id: "library",
    label: "Library Props",
    url: "/game/atlases/library-props.png",
    defaultSlice: { w: 32, h: 32 },
  },
  "interiors-free-16": {
    id: "interiors-free-16",
    label: "Interiors Free 16x16",
    url: "/game/atlases/interiors-free-16.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "room-builder-free-16": {
    id: "room-builder-free-16",
    label: "Room Builder 16x16",
    url: "/game/atlases/room-builder-free-16.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "interiors-free-32": {
    id: "interiors-free-32",
    label: "Interiors Free 32x32",
    url: "/game/atlases/interiors-free-32.png",
    defaultSlice: { w: 32, h: 32 },
  },
  "room-builder-free-32": {
    id: "room-builder-free-32",
    label: "Room Builder 32x32",
    url: "/game/atlases/room-builder-free-32.png",
    defaultSlice: { w: 32, h: 32 },
  },
  "interiors-free-48": {
    id: "interiors-free-48",
    label: "Interiors Free 48x48",
    url: "/game/atlases/interiors-free-48.png",
    defaultSlice: { w: 48, h: 48 },
  },
  "room-builder-free-48": {
    id: "room-builder-free-48",
    label: "Room Builder 48x48",
    url: "/game/atlases/room-builder-free-48.png",
    defaultSlice: { w: 48, h: 48 },
  },
  "topdown-floors-walls": {
    id: "topdown-floors-walls",
    label: "TopDown Floors & Walls",
    url: "/game/atlases/topdown-floors-walls.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "topdown-floors-walls-open-doors": {
    id: "topdown-floors-walls-open-doors",
    label: "TopDown Floors & Walls Open Doors",
    url: "/game/atlases/topdown-floors-walls-open-doors.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "topdown-small-items": {
    id: "topdown-small-items",
    label: "TopDown Small Items",
    url: "/game/atlases/topdown-small-items.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "topdown-furniture-1": {
    id: "topdown-furniture-1",
    label: "TopDown Furniture State 1",
    url: "/game/atlases/topdown-furniture-1.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "topdown-furniture-2": {
    id: "topdown-furniture-2",
    label: "TopDown Furniture State 2",
    url: "/game/atlases/topdown-furniture-2.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "topdown-doors-windows": {
    id: "topdown-doors-windows",
    label: "TopDown Doors & Windows",
    url: "/game/atlases/topdown-doors-windows.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "lpc-walls": {
    id: "lpc-walls",
    label: "LPC Walls",
    url: "/game/atlases/lpc-walls.png",
    defaultSlice: { w: 32, h: 32 },
  },
} as const;

export type SceneAtlasId = keyof typeof sceneAtlasCatalog;

export const sceneAtlasEntries = Object.values(sceneAtlasCatalog);
