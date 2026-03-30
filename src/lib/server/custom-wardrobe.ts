import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { readAppConfig, writeAppConfig } from "@/lib/server/app-config";
import {
  createCustomWardrobeValue,
  getDefaultCustomWardrobeCatalog,
  normalizeCustomWardrobeCatalog,
  type CustomWardrobeCatalog,
  type CustomWardrobeField,
  type CustomWardrobeItem,
} from "@/lib/sanctuary/customWardrobe";
import {
  createWardrobeRuleId,
  getDefaultWardrobeConfig,
  normalizeWardrobeConfig,
  type WardrobeConfig,
} from "@/lib/sanctuary/wardrobe";
import type { AvatarGarmentColor, AvatarSex } from "@/lib/sanctuary/store";

const DEFAULT_UPLOAD_ROOT = path.resolve(
  process.cwd(),
  "public/game/avatar/custom",
);

export function getCustomWardrobeUploadRoot() {
  return process.env.CUSTOM_WARDROBE_UPLOAD_ROOT || DEFAULT_UPLOAD_ROOT;
}

export function readCustomWardrobeCatalog() {
  const stored = readAppConfig("custom-wardrobe-catalog");
  return stored
    ? normalizeCustomWardrobeCatalog(stored.value)
    : getDefaultCustomWardrobeCatalog();
}

function writeCustomWardrobeCatalog(catalog: CustomWardrobeCatalog) {
  return writeAppConfig(
    "custom-wardrobe-catalog",
    normalizeCustomWardrobeCatalog(catalog),
  );
}

function readWardrobeConfig() {
  const stored = readAppConfig("wardrobe-config");
  return stored
    ? normalizeWardrobeConfig(stored.value)
    : getDefaultWardrobeConfig();
}

function writeWardrobeConfig(config: WardrobeConfig) {
  return writeAppConfig("wardrobe-config", normalizeWardrobeConfig(config));
}

function ensurePngFile(file: File | null, label: string): asserts file is File {
  if (!file || file.size === 0) {
    throw new Error(`Falta el PNG de ${label}`);
  }

  const lowerName = file.name.toLowerCase();
  if (!(file.type === "image/png" || lowerName.endsWith(".png"))) {
    throw new Error(`${label} debe ser un PNG`);
  }
}

async function saveWardrobeSprite(params: {
  field: CustomWardrobeField;
  itemId: string;
  sex: AvatarSex;
  color: AvatarGarmentColor;
  file: File;
}) {
  const uploadRoot = getCustomWardrobeUploadRoot();
  const targetDir = path.join(
    uploadRoot,
    params.field,
    params.itemId,
    params.sex,
  );
  const targetPath = path.join(targetDir, `${params.color}.png`);
  const blob = params.file as Blob;
  const buffer =
    typeof blob.arrayBuffer === "function"
      ? Buffer.from(await blob.arrayBuffer())
      : Buffer.from(await new Response(blob).arrayBuffer());

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, buffer);

  return `/game/avatar/custom/${params.field}/${params.itemId}/${params.sex}/${params.color}.png`;
}

export async function upsertCustomWardrobeItem(params: {
  field: CustomWardrobeField;
  label: string;
  description: string;
  slug?: string;
  unlockLevel: number;
  enabled: boolean;
  variants: Array<{
    color: AvatarGarmentColor;
    masculino: File | null;
    femenino: File | null;
  }>;
}) {
  const itemId = createCustomWardrobeValue(
    params.field,
    params.slug || params.label,
  );
  const catalog = readCustomWardrobeCatalog();
  const existing =
    catalog.items.find(
      (item): item is CustomWardrobeItem<typeof params.field> =>
        item.field === params.field && item.id === itemId,
    ) ?? null;

  const masculineAssets: Partial<Record<AvatarGarmentColor, string>> = {};
  const feminineAssets: Partial<Record<AvatarGarmentColor, string>> = {};

  await rm(path.join(getCustomWardrobeUploadRoot(), params.field, itemId), {
    recursive: true,
    force: true,
  });

  for (const variant of params.variants) {
    ensurePngFile(
      variant.masculino,
      `${params.label} ${variant.color} masculino`,
    );
    ensurePngFile(
      variant.femenino,
      `${params.label} ${variant.color} femenino`,
    );

    masculineAssets[variant.color] = await saveWardrobeSprite({
      field: params.field,
      itemId,
      sex: "masculino",
      color: variant.color,
      file: variant.masculino,
    });
    feminineAssets[variant.color] = await saveWardrobeSprite({
      field: params.field,
      itemId,
      sex: "femenino",
      color: variant.color,
      file: variant.femenino,
    });
  }

  const item: CustomWardrobeItem<typeof params.field> = {
    id: itemId,
    field: params.field,
    label: params.label.trim(),
    description: params.description.trim(),
    availableColors: params.variants.map((variant) => variant.color),
    assets: {
      masculino: masculineAssets,
      femenino: feminineAssets,
    },
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };

  const nextCatalog = normalizeCustomWardrobeCatalog({
    items: [...catalog.items.filter((entry) => entry.id !== itemId), item],
  });
  writeCustomWardrobeCatalog(nextCatalog);

  const config = readWardrobeConfig();
  const ruleId = createWardrobeRuleId(params.field, itemId);
  const nextConfig: WardrobeConfig = {
    ...config,
    rules: [
      ...config.rules.filter((rule) => rule.id !== ruleId),
      {
        id: ruleId,
        field: params.field,
        value: itemId,
        label: item.label,
        unlockLevel: Math.max(1, params.unlockLevel),
        enabled: params.enabled,
      },
    ],
  };
  writeWardrobeConfig(nextConfig);

  return {
    item,
    catalog: nextCatalog,
    config: normalizeWardrobeConfig(nextConfig),
  };
}

export async function deleteCustomWardrobeItem(
  field: CustomWardrobeField,
  itemId: string,
) {
  const catalog = readCustomWardrobeCatalog();
  const nextCatalog = normalizeCustomWardrobeCatalog({
    items: catalog.items.filter(
      (item) => !(item.field === field && item.id === itemId),
    ),
  });
  writeCustomWardrobeCatalog(nextCatalog);

  const config = readWardrobeConfig();
  const ruleId = createWardrobeRuleId(field, itemId as never);
  const nextConfig: WardrobeConfig = {
    ...config,
    rules: config.rules.filter((rule) => rule.id !== ruleId),
  };
  writeWardrobeConfig(nextConfig);

  await rm(path.join(getCustomWardrobeUploadRoot(), field, itemId), {
    recursive: true,
    force: true,
  });

  return {
    catalog: nextCatalog,
    config: normalizeWardrobeConfig(nextConfig),
  };
}
