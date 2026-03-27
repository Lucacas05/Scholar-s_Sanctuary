import type { AvatarConfig } from "@/lib/sanctuary/store";

type BodyKind = "male" | "female";
type SkinAssetTone = "light" | "amber" | "bronze" | "brown";
type HairAssetTone = "raven" | "brown" | "orange" | "white";

interface AvatarLayerAsset {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
}

export interface AvatarArtManifest {
  bodyKind: BodyKind;
  body: AvatarLayerAsset;
  head: AvatarLayerAsset;
  shirt: AvatarLayerAsset;
  pants: AvatarLayerAsset;
  shoes: AvatarLayerAsset;
  hairFront?: AvatarLayerAsset;
  hairBack?: AvatarLayerAsset;
  hoodColor?: string;
  accent: {
    panel: string;
    trim: string;
  };
}

const SPRITES_ROOT = "/game/avatar";

const skinToneToAssetTone: Record<AvatarConfig["skinTone"], SkinAssetTone> = {
  marfil: "light",
  miel: "amber",
  bronce: "bronze",
  umbra: "brown",
};

const hairToneToAssetTone: Record<AvatarConfig["hairColor"], HairAssetTone> = {
  obsidiana: "raven",
  castano: "brown",
  cobre: "orange",
  plata: "white",
};

const bodyByBase: Record<AvatarConfig["base"], BodyKind> = {
  archivo: "male",
  vigia: "male",
  viajera: "female",
};

const baseAccents: Record<AvatarConfig["base"], { panel: string; trim: string }> = {
  archivo: { panel: "#7e5636", trim: "#f0c887" },
  vigia: { panel: "#4f6a44", trim: "#c0ddb7" },
  viajera: { panel: "#69465f", trim: "#e2bfd7" },
};

function makeLayer(src: string, sheetWidth: number, sheetHeight: number): AvatarLayerAsset {
  return { src, sheetWidth, sheetHeight };
}

function bodyLayer(kind: BodyKind, tone: SkinAssetTone) {
  return makeLayer(`${SPRITES_ROOT}/body/${kind}-${tone}.png`, 128, 256);
}

function headLayer(kind: BodyKind, tone: SkinAssetTone) {
  return makeLayer(`${SPRITES_ROOT}/${kind}-head/${tone}.png`, 128, 256);
}

function clothingLayer(kind: BodyKind, slot: "clothing" | "pants" | "shoes", outfit: AvatarConfig["outfit"]) {
  const folder =
    slot === "clothing"
      ? kind === "female"
        ? "clothing-fem"
        : "clothing-masc"
      : slot === "pants"
        ? kind === "female"
          ? "pants-fem"
          : "pants-masc"
        : kind === "female"
          ? "shoes-fem"
          : "shoes-masc";

  return makeLayer(`${SPRITES_ROOT}/${folder}/${outfit}.png`, 192, 256);
}

function hairLayers(style: AvatarConfig["hairStyle"], tone: HairAssetTone) {
  if (style === "capucha") {
    return {};
  }

  if (style === "corto") {
    return {
      hairFront: makeLayer(`${SPRITES_ROOT}/hair-short/${tone}.png`, 192, 256),
    };
  }

  if (style === "coleta") {
    return {
      hairFront: makeLayer(`${SPRITES_ROOT}/hair-bun/${tone}.png`, 192, 256),
      hairBack: makeLayer(`${SPRITES_ROOT}/hair-medium-back/${tone}.png`, 192, 256),
    };
  }

  return {
    hairFront: makeLayer(`${SPRITES_ROOT}/hair-medium/${tone}.png`, 192, 256),
    hairBack: makeLayer(`${SPRITES_ROOT}/hair-medium-back/${tone}.png`, 192, 256),
  };
}

export function getAvatarArtManifest(avatar: AvatarConfig): AvatarArtManifest {
  const bodyKind = bodyByBase[avatar.base];
  const skinTone = skinToneToAssetTone[avatar.skinTone];
  const hairTone = hairToneToAssetTone[avatar.hairColor];

  return {
    bodyKind,
    body: bodyLayer(bodyKind, skinTone),
    head: headLayer(bodyKind, skinTone),
    shirt: clothingLayer(bodyKind, "clothing", avatar.outfit),
    pants: clothingLayer(bodyKind, "pants", avatar.outfit),
    shoes: clothingLayer(bodyKind, "shoes", avatar.outfit),
    ...hairLayers(avatar.hairStyle, hairTone),
    hoodColor:
      avatar.hairStyle === "capucha"
        ? avatar.outfit === "alquimista"
          ? "#4e3557"
          : avatar.outfit === "guardabosques"
            ? "#334c33"
            : "#6b5037"
        : undefined,
    accent: baseAccents[avatar.base],
  };
}
