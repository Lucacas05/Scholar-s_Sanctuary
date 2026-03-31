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
  "wall-puerta": {
    id: "wall-puerta",
    label: "Wall Puerta",
    url: "/game/atlases/wall-puerta.png",
    defaultSlice: { w: 32, h: 32 },
  },
  "escritorio-idiviadual": {
    id: "escritorio-idiviadual",
    label: "Escritorio individual",
    url: "/game/atlases/escritorio-idiviadual.png",
    defaultSlice: { w: 1536, h: 1024 },
    defaultRenderScale: 0.08,
  },
  "tiny-garden-tiles": {
    id: "tiny-garden-tiles",
    label: "Tiny Garden Tiles",
    url: "/game/atlases/tiny-garden-tiles.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "tiny-garden-objects": {
    id: "tiny-garden-objects",
    label: "Tiny Garden Objects",
    url: "/game/atlases/tiny-garden-objects.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "tiny-garden-character-back": {
    id: "tiny-garden-character-back",
    label: "Tiny Garden Character Back",
    url: "/game/atlases/tiny-garden-character-back.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "tiny-garden-character-front": {
    id: "tiny-garden-character-front",
    label: "Tiny Garden Character Front",
    url: "/game/atlases/tiny-garden-character-front.png",
    defaultSlice: { w: 16, h: 16 },
  },
  "tiny-garden-character-side": {
    id: "tiny-garden-character-side",
    label: "Tiny Garden Character Side",
    url: "/game/atlases/tiny-garden-character-side.png",
    defaultSlice: { w: 16, h: 16 },
  },
} as const;

export type SceneAtlasId = keyof typeof sceneAtlasCatalog;

export const sceneAtlasEntries = Object.values(sceneAtlasCatalog);
