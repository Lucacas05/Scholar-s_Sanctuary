import type {
  AvatarAccessory,
  AvatarConfig,
  AvatarGarmentColor,
  BuiltinAvatarLower,
  BuiltinAvatarSocks,
  BuiltinAvatarUpper,
} from "@/lib/sanctuary/store";
import {
  resolveCustomWardrobeAsset,
  listAvailableWardrobeColors,
} from "@/lib/sanctuary/customWardrobe";

interface AvatarLayerAsset {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  frameX?: number;
  frameY?: number;
}

export interface AvatarArtManifest {
  body: AvatarLayerAsset;
  head: AvatarLayerAsset;
  upper: AvatarLayerAsset;
  lower: AvatarLayerAsset;
  socks: AvatarLayerAsset;
  hairFront?: AvatarLayerAsset;
  hairBack?: AvatarLayerAsset;
  accessoryLayer?: AvatarLayerAsset;
  accessoryKind: "none" | "facial-hair" | "helmet";
  accent: {
    panel: string;
    trim: string;
    shadow: string;
  };
}

const SPRITES_ROOT = "/game/avatar";
const REVISED_FRAME_X = 64;
const REVISED_FRAME_Y = 128;
const HELMET_FRAME_X = 64;
const HELMET_FRAME_Y = 128;

const skinFolders = {
  amber: "Amber",
  bronze: "Bronze",
  brown: "Brown",
  chocolate: "Chocolate",
  coffee: "Coffee",
  cream: "Cream",
  ivory: "Ivory",
  leather: "Leather",
  peach: "Peach",
  sepia: "Sepia",
  tan: "Tan",
} as const;

const hairStyleFolders = {
  "short-01-buzzcut": "Short 01 - Buzzcut",
  "short-02-parted": "Short 02 - Parted",
  "short-03-curly": "Short 03 - Curly",
  "short-04-cowlick": "Short 04 - Cowlick",
  "short-05-natural": "Short 05 - Natural",
  "short-06-balding": "Short 06 - Balding",
  "short-07-flat-top": "Short 07 - Flat Top",
  "short-08-flat-top-fade": "Short 08 - Flat Top, Fade",
  "medium-01-page": "Medium 01 - Page",
  "medium-02-curly": "Medium 02 - Curly",
  "medium-03-idol": "Medium 03 - Idol",
  "medium-04-bangs-bun": "Medium 04 - Bangs & Bun",
  "medium-05-cornrows": "Medium 05 - Cornrows",
  "medium-06-dreadlocks": "Medium 06 - Dreadlocks",
  "medium-07-bob-side-part": "Medium 07 - Bob, Side Part",
  "medium-08-bob-bangs": "Medium 08 - Bob, Bangs",
  "medium-09-twists": "Medium 09 - Twists",
  "medium-10-twists-fade": "Medium 10 - Twists, Fade",
} as const;

const hairColorFolders = {
  "ash-brown": "Ash Brown",
  black: "Black",
  blonde: "Blonde",
  blue: "Blue",
  brown: "Brown",
  chestnut: "Chestnut",
  gray: "Gray",
  green: "Green",
  orange: "Orange",
  pink: "Pink",
  platinum: "Platinum",
  raven: "Raven",
  red: "Red",
  ruby: "Ruby",
  teal: "Teal",
  violet: "Violet",
  white: "White",
} as const;

const upperFolders: Record<BuiltinAvatarUpper, string> = {
  "shirt-01-longsleeve": "shirt-01-longsleeve",
  "shirt-02-vneck-longsleeve": "shirt-02-vneck-longsleeve",
  "shirt-03-scoop-longsleeve": "shirt-03-scoop-longsleeve",
  "shirt-04-tee": "shirt-04-tee",
  "shirt-05-vneck-tee": "shirt-05-vneck-tee",
  "shirt-06-scoop-tee": "shirt-06-scoop-tee",
} as const;

const lowerFolders: Record<BuiltinAvatarLower, string> = {
  "pants-01-hose": "pants-01-hose",
  "pants-02-leggings": "pants-02-leggings",
  "pants-03-pants": "pants-03-pants",
  "pants-04-cuffed": "pants-04-cuffed",
  "pants-05-overalls": "pants-05-overalls",
} as const;

const socksFolders: Record<BuiltinAvatarSocks, string> = {
  "socks-01-ankle": "socks-01-ankle",
  "socks-02-high": "socks-02-high",
} as const;

const garmentColorFolders: Record<AvatarGarmentColor, string> = {
  amber: "Amber",
  amethyst: "Amethyst",
  barberry: "Barberry",
  black: "Black",
  blue: "Blue",
  "blue-violet": "Blue Violet",
  bronze: "Bronze",
  brown: "Brown",
  "burnt-orange": "Burnt Orange",
  "burnt-umber": "Burnt Umber",
  cerise: "Cerise",
  chocolate: "Chocolate",
  coffee: "Coffee",
  cornflower: "Cornflower",
  cream: "Cream",
  cyan: "Cyan",
  fern: "Fern",
  forest: "Forest",
  gray: "Gray",
  green: "Green",
  ice: "Ice",
  indigo: "Indigo",
  ivory: "Ivory",
  lavender: "Lavender",
  leather: "Leather",
  mustard: "Mustard",
  navy: "Navy",
  neptune: "Neptune",
  olivine: "Olivine",
  orange: "Orange",
  peach: "Peach",
  pink: "Pink",
  plum: "Plum",
  red: "Red",
  sepia: "Sepia",
  silver: "Silver",
  smoke: "Smoke",
  spring: "Spring",
  swamp: "Swamp",
  tan: "Tan",
  tumeric: "Tumeric",
  umber: "Umber",
  white: "White",
  yellow: "Yellow",
};

const helmetFolders: Record<
  Exclude<AvatarAccessory, "ninguno" | "bigote" | "barba-corta">,
  string
> = {
  barbarian: "barbarian",
  "barbarian-nasal": "barbarian_nasal",
  "barbarian-viking": "barbarian_viking",
  barbuta: "barbuta",
  "barbuta-simple": "barbuta_simple",
  close: "close",
  flattop: "flattop",
  greathelm: "greathelm",
  nasal: "nasal",
  spangenhelm: "spangenhelm",
  "spangenhelm-viking": "spangenhelm_viking",
  sugarloaf: "sugarloaf",
  "sugarloaf-simple": "sugarloaf_simple",
};

const upperAccents = {
  amber: { panel: "#b8782d", trim: "#ffd184", shadow: "#6f4318" },
  amethyst: { panel: "#6a4a8c", trim: "#d9c7ff", shadow: "#3b2950" },
  barberry: { panel: "#7a2338", trim: "#efb3c0", shadow: "#491522" },
  black: { panel: "#262223", trim: "#aaa2a3", shadow: "#121010" },
  blue: { panel: "#3d69a6", trim: "#cde0ff", shadow: "#22385d" },
  "blue-violet": { panel: "#5650a2", trim: "#ddd8ff", shadow: "#302c5f" },
  bronze: { panel: "#98714f", trim: "#f1d1a9", shadow: "#5c422c" },
  brown: { panel: "#72503b", trim: "#e0b48c", shadow: "#442e21" },
  "burnt-orange": { panel: "#b95c23", trim: "#ffd2b4", shadow: "#6d3415" },
  "burnt-umber": { panel: "#7a4b32", trim: "#e6bea5", shadow: "#492b1c" },
  cerise: { panel: "#a13668", trim: "#ffc5df", shadow: "#5d1f3c" },
  chocolate: { panel: "#5b3323", trim: "#d7ab90", shadow: "#321b12" },
  coffee: { panel: "#5d4336", trim: "#dfc1aa", shadow: "#35261f" },
  cornflower: { panel: "#6d85d5", trim: "#edf2ff", shadow: "#3d4d84" },
  cream: { panel: "#d8c5a3", trim: "#fff8eb", shadow: "#8d7e66" },
  cyan: { panel: "#3e9ca7", trim: "#d8fbff", shadow: "#215761" },
  fern: { panel: "#4c7a45", trim: "#d0efbf", shadow: "#2b4527" },
  forest: { panel: "#355a3d", trim: "#bfd8c6", shadow: "#1c3121" },
  gray: { panel: "#6f7075", trim: "#e0e1e6", shadow: "#414248" },
  green: { panel: "#4a8244", trim: "#d7efc8", shadow: "#2a4b26" },
  ice: { panel: "#95d3eb", trim: "#f5fdff", shadow: "#4a7a8d" },
  indigo: { panel: "#433f7e", trim: "#d6d3ff", shadow: "#252347" },
  ivory: { panel: "#efe7d5", trim: "#fffdf9", shadow: "#b0a896" },
  lavender: { panel: "#927eb7", trim: "#efe5ff", shadow: "#56486d" },
  leather: { panel: "#886048", trim: "#edc8ab", shadow: "#53392a" },
  mustard: { panel: "#9e8130", trim: "#ffe7a4", shadow: "#604d1c" },
  navy: { panel: "#2e446e", trim: "#cad9f7", shadow: "#17233b" },
  neptune: { panel: "#2f6a78", trim: "#c9eef4", shadow: "#183943" },
  olivine: { panel: "#728b4d", trim: "#e2f1c8", shadow: "#42512d" },
  orange: { panel: "#c36b22", trim: "#ffd2a6", shadow: "#743c12" },
  peach: { panel: "#d8a38a", trim: "#fff0e8", shadow: "#8b6557" },
  pink: { panel: "#c77ea4", trim: "#ffe1f1", shadow: "#744960" },
  plum: { panel: "#69415a", trim: "#ead6e5", shadow: "#3a2332" },
  red: { panel: "#a53a36", trim: "#ffd0cb", shadow: "#60211f" },
  sepia: { panel: "#6a4d3f", trim: "#e5c4b1", shadow: "#3f2d25" },
  silver: { panel: "#9ca5b0", trim: "#fbfcfe", shadow: "#596069" },
  smoke: { panel: "#8b8583", trim: "#f2ece9", shadow: "#4f4a48" },
  spring: { panel: "#69a04f", trim: "#e4f7d7", shadow: "#3d5f2f" },
  swamp: { panel: "#536246", trim: "#d6dbc9", shadow: "#31382a" },
  tan: { panel: "#b18462", trim: "#ffe1c6", shadow: "#6c503c" },
  tumeric: { panel: "#b78e28", trim: "#ffe6a6", shadow: "#6d5517" },
  umber: { panel: "#694a39", trim: "#e7c2a9", shadow: "#3d2a20" },
  white: { panel: "#f3f3f1", trim: "#ffffff", shadow: "#b2b2ae" },
  yellow: { panel: "#d6b730", trim: "#fff3b5", shadow: "#816d1a" },
} as const;

function makeLayer(
  src: string,
  sheetWidth: number,
  sheetHeight: number,
  frameX: number,
  frameY: number,
): AvatarLayerAsset {
  return { src, sheetWidth, sheetHeight, frameX, frameY };
}

function makeRevisedLayer(src: string) {
  return makeLayer(src, 192, 256, REVISED_FRAME_X, REVISED_FRAME_Y);
}

function makeHelmetLayer(src: string) {
  return makeLayer(src, 832, 1344, HELMET_FRAME_X, HELMET_FRAME_Y);
}

function sexFolder(sex: AvatarConfig["sex"]) {
  return sex === "femenino" ? "femenino" : "masculino";
}

function headFolder(sex: AvatarConfig["sex"]) {
  return sex === "femenino" ? "head-01-feminine" : "head-02-masculine";
}

function bodyLayer(avatar: AvatarConfig) {
  return makeRevisedLayer(
    `${SPRITES_ROOT}/body/${sexFolder(avatar.sex)}/${avatar.skinTone}.png`,
  );
}

function headLayer(avatar: AvatarConfig) {
  return makeRevisedLayer(
    `${SPRITES_ROOT}/head/${headFolder(avatar.sex)}/${avatar.skinTone}.png`,
  );
}

function upperLayer(avatar: AvatarConfig) {
  const customAsset = resolveCustomWardrobeAsset(
    "upper",
    avatar.upper,
    avatar.sex,
    avatar.upperColor,
  );
  if (customAsset) {
    return makeRevisedLayer(customAsset);
  }

  const folder =
    upperFolders[avatar.upper as BuiltinAvatarUpper] ??
    upperFolders["shirt-01-longsleeve"];

  return makeRevisedLayer(
    `${SPRITES_ROOT}/upper/${sexFolder(avatar.sex)}/${folder}/${avatar.upperColor}.png`,
  );
}

function lowerLayer(avatar: AvatarConfig) {
  const customAsset = resolveCustomWardrobeAsset(
    "lower",
    avatar.lower,
    avatar.sex,
    avatar.lowerColor,
  );
  if (customAsset) {
    return makeRevisedLayer(customAsset);
  }

  const folder =
    lowerFolders[avatar.lower as BuiltinAvatarLower] ??
    lowerFolders["pants-03-pants"];

  return makeRevisedLayer(
    `${SPRITES_ROOT}/lower/${sexFolder(avatar.sex)}/${folder}/${avatar.lowerColor}.png`,
  );
}

function socksLayer(avatar: AvatarConfig) {
  const customAsset = resolveCustomWardrobeAsset(
    "socks",
    avatar.socks,
    avatar.sex,
    avatar.socksColor,
  );
  if (customAsset) {
    return makeRevisedLayer(customAsset);
  }

  const folder =
    socksFolders[avatar.socks as BuiltinAvatarSocks] ??
    socksFolders["socks-01-ankle"];

  return makeRevisedLayer(
    `${SPRITES_ROOT}/socks/${sexFolder(avatar.sex)}/${folder}/${avatar.socksColor}.png`,
  );
}

function hairLayers(avatar: AvatarConfig) {
  const folder = avatar.hairStyle;
  const color = avatar.hairColor;

  const layers: Pick<AvatarArtManifest, "hairFront" | "hairBack"> = {
    hairFront: makeRevisedLayer(`${SPRITES_ROOT}/hair/${folder}/${color}.png`),
  };

  if (
    avatar.hairStyle === "medium-01-page" ||
    avatar.hairStyle === "medium-02-curly"
  ) {
    layers.hairBack = makeRevisedLayer(
      `${SPRITES_ROOT}/hair/${folder}/behind/${color}.png`,
    );
  }

  return layers;
}

function accessoryLayer(avatar: AvatarConfig) {
  if (
    avatar.accessory === "ninguno" ||
    avatar.accessory === "bigote" ||
    avatar.accessory === "barba-corta"
  ) {
    return undefined;
  }

  return makeHelmetLayer(
    `${SPRITES_ROOT}/accessory/helmet/${helmetFolders[avatar.accessory]}/${sexFolder(avatar.sex)}.png`,
  );
}

export function getAvatarArtManifest(avatar: AvatarConfig): AvatarArtManifest {
  const availableUpperColors = listAvailableWardrobeColors(
    "upper",
    avatar.upper,
  );
  const accentColor = availableUpperColors.includes(avatar.upperColor)
    ? avatar.upperColor
    : availableUpperColors[0];

  return {
    body: bodyLayer(avatar),
    head: headLayer(avatar),
    upper: upperLayer(avatar),
    lower: lowerLayer(avatar),
    socks: socksLayer(avatar),
    ...hairLayers(avatar),
    accessoryLayer: accessoryLayer(avatar),
    accessoryKind:
      avatar.accessory === "ninguno"
        ? "none"
        : avatar.accessory === "bigote" || avatar.accessory === "barba-corta"
          ? "facial-hair"
          : "helmet",
    accent: upperAccents[accentColor],
  };
}

export const avatarSourceCatalog = {
  skinFolders,
  hairStyleFolders,
  hairColorFolders,
  upperFolders,
  lowerFolders,
  socksFolders,
  garmentColorFolders,
  helmetFolders,
};
