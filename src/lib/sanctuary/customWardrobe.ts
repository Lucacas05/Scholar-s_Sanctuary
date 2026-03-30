import {
  avatarOptions,
  type AvatarConfig,
  type AvatarGarmentColor,
  type AvatarOption,
  type AvatarSex,
} from "@/lib/sanctuary/store";

export type CustomWardrobeField = "upper" | "lower" | "socks";
export type CustomWardrobeValueMap = {
  upper: Extract<AvatarConfig["upper"], `custom-upper-${string}`>;
  lower: Extract<AvatarConfig["lower"], `custom-lower-${string}`>;
  socks: Extract<AvatarConfig["socks"], `custom-socks-${string}`>;
};

export interface CustomWardrobeItem<
  T extends CustomWardrobeField = CustomWardrobeField,
> {
  id: CustomWardrobeValueMap[T];
  field: T;
  label: string;
  description: string;
  availableColors: AvatarGarmentColor[];
  assets: Record<AvatarSex, Partial<Record<AvatarGarmentColor, string>>>;
  createdAt: number;
  updatedAt: number;
}

export interface CustomWardrobeCatalog {
  items: CustomWardrobeItem[];
}

const STORAGE_KEY = "lumina:custom-wardrobe-catalog";
export const CUSTOM_WARDROBE_CATALOG_EVENT =
  "lumina:custom-wardrobe-catalog-changed";

declare global {
  interface Window {
    __luminaCustomWardrobeCatalog?: unknown;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCustomWardrobeField(value: unknown): value is CustomWardrobeField {
  return value === "upper" || value === "lower" || value === "socks";
}

function sanitizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function createCustomWardrobeValue<T extends CustomWardrobeField>(
  field: T,
  value: string,
) {
  const slug = sanitizeSlug(value) || `${field}-${Date.now().toString(36)}`;
  return `custom-${field}-${slug}` as CustomWardrobeValueMap[T];
}

export function isCustomWardrobeValue<T extends CustomWardrobeField>(
  field: T,
  value: unknown,
): value is CustomWardrobeValueMap[T] {
  return (
    typeof value === "string" &&
    value.startsWith(`custom-${field}-`) &&
    value.length > `custom-${field}-`.length
  );
}

function normalizeAvailableColors(value: unknown): AvatarGarmentColor[] {
  const colors = Array.isArray(value) ? value : [];
  const allowed = new Set(
    avatarOptions.upperColor.map((option) => option.value),
  );
  const normalized = Array.from(
    new Set(
      colors.filter(
        (color): color is AvatarGarmentColor =>
          typeof color === "string" && allowed.has(color as AvatarGarmentColor),
      ),
    ),
  ) as AvatarGarmentColor[];

  return normalized.length > 0 ? normalized : ["smoke"];
}

function normalizeAssetPath(value: unknown) {
  if (
    typeof value === "string" &&
    value.startsWith("/game/avatar/custom/") &&
    value.endsWith(".png")
  ) {
    return value;
  }

  return null;
}

function normalizeAssetMap(value: unknown, colors: AvatarGarmentColor[]) {
  const record = isRecord(value) ? value : {};
  const result: Partial<Record<AvatarGarmentColor, string>> = {};

  colors.forEach((color) => {
    const assetPath = normalizeAssetPath(record[color]);
    if (assetPath) {
      result[color] = assetPath;
    }
  });

  return result;
}

function normalizeCustomWardrobeItem(
  value: unknown,
  index: number,
): CustomWardrobeItem | null {
  if (!isRecord(value) || !isCustomWardrobeField(value.field)) {
    return null;
  }

  const colors = normalizeAvailableColors(value.availableColors);
  const id =
    typeof value.id === "string" && isCustomWardrobeValue(value.field, value.id)
      ? value.id
      : createCustomWardrobeValue(
          value.field,
          typeof value.label === "string" ? value.label : `prenda-${index + 1}`,
        );
  const assetsRecord = isRecord(value.assets) ? value.assets : {};
  const masculine = normalizeAssetMap(assetsRecord.masculino, colors);
  const feminine = normalizeAssetMap(assetsRecord.femenino, colors);

  if (!Object.keys(masculine).length || !Object.keys(feminine).length) {
    return null;
  }

  return {
    id,
    field: value.field,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : id,
    description:
      typeof value.description === "string" ? value.description.trim() : "",
    availableColors: colors,
    assets: {
      masculino: masculine,
      femenino: feminine,
    },
    createdAt:
      typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
        ? value.createdAt
        : Date.now(),
    updatedAt:
      typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : Date.now(),
  };
}

export function getDefaultCustomWardrobeCatalog(): CustomWardrobeCatalog {
  return { items: [] };
}

export function normalizeCustomWardrobeCatalog(
  value: unknown,
): CustomWardrobeCatalog {
  const record = isRecord(value) ? value : {};
  const items = Array.isArray(record.items) ? record.items : [];
  const seen = new Set<string>();

  return {
    items: items
      .map((item, index) => normalizeCustomWardrobeItem(item, index))
      .filter((item): item is CustomWardrobeItem => {
        if (!item || seen.has(item.id)) {
          return false;
        }
        seen.add(item.id);
        return true;
      })
      .sort((left, right) => left.label.localeCompare(right.label, "es")),
  };
}

let catalogCache: CustomWardrobeCatalog | null = null;

function persistCatalog(catalog: CustomWardrobeCatalog) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  window.dispatchEvent(new CustomEvent(CUSTOM_WARDROBE_CATALOG_EVENT));
}

function readBootstrapCatalog() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.__luminaCustomWardrobeCatalog;
  if (value === undefined) {
    return null;
  }

  return normalizeCustomWardrobeCatalog(value);
}

function readStoredCatalog() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeCustomWardrobeCatalog(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadCustomWardrobeCatalog() {
  if (catalogCache === null) {
    catalogCache =
      readBootstrapCatalog() ??
      readStoredCatalog() ??
      getDefaultCustomWardrobeCatalog();
  }

  return catalogCache;
}

export function saveCustomWardrobeCatalog(value: unknown) {
  const catalog = normalizeCustomWardrobeCatalog(value);
  catalogCache = catalog;
  persistCatalog(catalog);
  return catalog;
}

function parseCatalogResponse(payload: unknown) {
  if (!isRecord(payload) || !("catalog" in payload)) {
    throw new Error("Invalid catalog payload");
  }

  return normalizeCustomWardrobeCatalog(payload.catalog);
}

export async function syncCustomWardrobeCatalogFromServer() {
  const response = await fetch("/api/avatar/catalog", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to sync wardrobe catalog");
  }

  return saveCustomWardrobeCatalog(parseCatalogResponse(await response.json()));
}

export function getCustomWardrobeItem<T extends CustomWardrobeField>(
  field: T,
  value: AvatarConfig[T],
  catalog: CustomWardrobeCatalog = loadCustomWardrobeCatalog(),
) {
  if (!isCustomWardrobeValue(field, value)) {
    return null;
  }

  return (
    catalog.items.find(
      (item): item is CustomWardrobeItem<T> =>
        item.field === field && item.id === value,
    ) ?? null
  );
}

export function listCustomWardrobeItems<T extends CustomWardrobeField>(
  field: T,
  catalog: CustomWardrobeCatalog = loadCustomWardrobeCatalog(),
) {
  return catalog.items.filter(
    (item): item is CustomWardrobeItem<T> => item.field === field,
  );
}

export function listCustomWardrobeOptions<T extends CustomWardrobeField>(
  field: T,
  catalog: CustomWardrobeCatalog = loadCustomWardrobeCatalog(),
) {
  return listCustomWardrobeItems(field, catalog).map(
    (item) =>
      ({
        value: item.id as AvatarConfig[T],
        label: item.label,
        description: item.description || "Prenda personalizada de la VPS.",
      }) satisfies AvatarOption<AvatarConfig[T]>,
  );
}

export function listAvailableWardrobeColors<T extends CustomWardrobeField>(
  field: T,
  value: AvatarConfig[T],
  catalog: CustomWardrobeCatalog = loadCustomWardrobeCatalog(),
) {
  const customItem = getCustomWardrobeItem(field, value, catalog);
  if (!customItem) {
    return avatarOptions.upperColor.map((option) => option.value);
  }

  return customItem.availableColors;
}

export function getPreferredWardrobeColor<T extends CustomWardrobeField>(
  field: T,
  value: AvatarConfig[T],
  currentColor: AvatarGarmentColor,
  catalog: CustomWardrobeCatalog = loadCustomWardrobeCatalog(),
) {
  const available = listAvailableWardrobeColors(field, value, catalog);
  return available.includes(currentColor) ? currentColor : available[0];
}

export function resolveCustomWardrobeAsset<T extends CustomWardrobeField>(
  field: T,
  value: AvatarConfig[T],
  sex: AvatarSex,
  color: AvatarGarmentColor,
  catalog: CustomWardrobeCatalog = loadCustomWardrobeCatalog(),
) {
  const item = getCustomWardrobeItem(field, value, catalog);
  if (!item) {
    return null;
  }

  const preferredColor = getPreferredWardrobeColor(
    field,
    value,
    color,
    catalog,
  );
  return (
    item.assets[sex][preferredColor] ??
    item.assets[sex][item.availableColors[0]] ??
    null
  );
}
