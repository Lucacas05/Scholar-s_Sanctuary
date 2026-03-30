import type { APIContext } from "astro";
import { requireAdminAccess } from "@/lib/server/admin";
import {
  deleteCustomWardrobeItem,
  readCustomWardrobeCatalog,
  upsertCustomWardrobeItem,
} from "@/lib/server/custom-wardrobe";
import { avatarOptions, type AvatarGarmentColor } from "@/lib/sanctuary/store";

export const prerender = false;

const colorSet = new Set(
  avatarOptions.upperColor.map((option) => option.value),
);

function isWardrobeField(value: FormDataEntryValue | null) {
  return value === "upper" || value === "lower" || value === "socks";
}

function readTextField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBooleanField(formData: FormData, key: string, fallback = true) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return fallback;
  }

  return value === "true" || value === "1" || value === "on";
}

function readLevelField(formData: FormData, key: string) {
  const raw = Number(readTextField(formData, key));
  return Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1;
}

function readColors(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("colors")
        .filter(
          (value): value is AvatarGarmentColor =>
            typeof value === "string" &&
            colorSet.has(value as AvatarGarmentColor),
        ),
    ),
  );
}

function readVariantFile(
  formData: FormData,
  color: AvatarGarmentColor,
  sex: "masculino" | "femenino",
) {
  const value = formData.get(`variant.${color}.${sex}`);
  return value instanceof File ? value : null;
}

function getCatalogResponse() {
  return Response.json({
    catalog: readCustomWardrobeCatalog(),
  });
}

export async function GET({ locals }: APIContext) {
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
  }

  return getCatalogResponse();
}

export async function POST({ locals, request }: APIContext) {
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const fieldValue = formData.get("field");
  if (!isWardrobeField(fieldValue)) {
    return Response.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const label = readTextField(formData, "label");
  if (!label) {
    return Response.json(
      { error: "La prenda necesita un nombre" },
      { status: 400 },
    );
  }

  const colors = readColors(formData);
  if (colors.length === 0) {
    return Response.json(
      { error: "Selecciona al menos un color para la prenda" },
      { status: 400 },
    );
  }

  try {
    const result = await upsertCustomWardrobeItem({
      field: fieldValue,
      label,
      description: readTextField(formData, "description"),
      slug: readTextField(formData, "slug") || undefined,
      unlockLevel: readLevelField(formData, "unlockLevel"),
      enabled: readBooleanField(formData, "enabled", true),
      variants: colors.map((color) => ({
        color,
        masculino: readVariantFile(formData, color, "masculino"),
        femenino: readVariantFile(formData, color, "femenino"),
      })),
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la prenda en la VPS",
      },
      { status: 400 },
    );
  }
}

export async function DELETE({ locals, request }: APIContext) {
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
  }

  const payload = (await request.json().catch(() => null)) as {
    field?: unknown;
    itemId?: unknown;
  } | null;

  if (
    !payload ||
    (payload.field !== "upper" &&
      payload.field !== "lower" &&
      payload.field !== "socks") ||
    typeof payload.itemId !== "string" ||
    payload.itemId.trim().length === 0
  ) {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  const result = await deleteCustomWardrobeItem(
    payload.field,
    payload.itemId.trim(),
  );
  return Response.json(result);
}
