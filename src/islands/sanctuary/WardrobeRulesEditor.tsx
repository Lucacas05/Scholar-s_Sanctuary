import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ItemModelPreview } from "@/islands/sanctuary/ItemModelPreview";
import { Spinner } from "@/islands/sanctuary/Spinner";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import {
  avatarOptions,
  garmentColorMeta,
  getRenderableCurrentProfile,
  useSanctuaryStore,
  type AvatarGarmentColor,
  type AvatarSex,
} from "@/lib/sanctuary/store";
import {
  loadCustomWardrobeCatalog,
  saveCustomWardrobeCatalog,
  syncCustomWardrobeCatalogFromServer,
  type CustomWardrobeCatalog,
  type CustomWardrobeField,
} from "@/lib/sanctuary/customWardrobe";
import {
  createWardrobeMilestoneId,
  formatWardrobeDuration,
  getDefaultWardrobeConfig,
  getFocusSecondsForLevel,
  getWardrobeUnlockRule,
  listWardrobeCandidates,
  listWardrobeMilestones,
  listWardrobeRulesByField,
  loadWardrobeConfig,
  resetWardrobeConfigOnServer,
  saveWardrobeConfig,
  saveWardrobeConfigToServer,
  syncWardrobeConfigFromServer,
  type WardrobeConfig,
  type WardrobeField,
} from "@/lib/sanctuary/wardrobe";

const fields: WardrobeField[] = ["upper", "lower", "socks", "accessory"];

const fieldLabels: Record<WardrobeField, string> = {
  upper: "Parte superior",
  lower: "Parte inferior",
  socks: "Calcetines",
  accessory: "Accesorios",
};

const fieldDescriptions: Record<WardrobeField, string> = {
  upper: "Camisas y capas altas del avatar.",
  lower: "Bases para piernas y silueta general.",
  socks: "Detalles pequeños que rematan el conjunto.",
  accessory: "Cascos, rostros y piezas raras del santuario.",
};

function getLevelStepMinutes(config: WardrobeConfig) {
  return Math.max(15, Math.round(config.levelStepFocusSeconds / 60));
}

const uploadFieldOptions: CustomWardrobeField[] = ["upper", "lower", "socks"];
const garmentColorOptions = avatarOptions.upperColor;
const garmentColorOrder = garmentColorOptions.map((option) => option.value);

interface UploadVariantDraft {
  masculino: File | null;
  femenino: File | null;
}

interface UploadDraft {
  field: CustomWardrobeField;
  label: string;
  description: string;
  slug: string;
  unlockLevel: number;
  enabled: boolean;
  colors: AvatarGarmentColor[];
  files: Partial<Record<AvatarGarmentColor, UploadVariantDraft>>;
}

function createUploadDraft(): UploadDraft {
  return {
    field: "upper",
    label: "",
    description: "",
    slug: "",
    unlockLevel: 1,
    enabled: true,
    colors: ["smoke"],
    files: {},
  };
}

export function WardrobeRulesEditor() {
  const sanctuary = useSanctuaryStore();
  const avatar = getRenderableCurrentProfile(sanctuary).avatar;
  const [config, setConfig] = useState<WardrobeConfig>(() =>
    loadWardrobeConfig(),
  );
  const [customCatalog, setCustomCatalog] = useState<CustomWardrobeCatalog>(
    () => loadCustomWardrobeCatalog(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [milestoneDraft, setMilestoneDraft] = useState({
    label: "Nuevo hito",
    description: "",
    unlockLevel: 1,
  });
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>(() =>
    createUploadDraft(),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGsapReveal(rootRef);

  useEffect(() => {
    let cancelled = false;

    async function loadServerConfig() {
      setLoading(true);
      try {
        const [nextConfig, nextCatalog] = await Promise.all([
          syncWardrobeConfigFromServer(),
          syncCustomWardrobeCatalogFromServer(),
        ]);
        if (!cancelled) {
          setConfig(nextConfig);
          setCustomCatalog(nextCatalog);
        }
      } catch {
        if (!cancelled) {
          setConfig(loadWardrobeConfig());
          setCustomCatalog(loadCustomWardrobeCatalog());
          setSavedMessage("No se pudo leer la VPS, muestro la caché local.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadServerConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(
    () =>
      fields.map((field) => {
        const rules = listWardrobeRulesByField(field, config);
        const candidates = listWardrobeCandidates(field, customCatalog).map(
          (candidate) => ({
            ...candidate,
            state: getWardrobeUnlockRule(field, candidate.value, config)
              ? getWardrobeUnlockRule(field, candidate.value, config)?.enabled
                ? "active"
                : "hidden"
              : "missing",
          }),
        );

        return {
          field,
          label: fieldLabels[field],
          description: fieldDescriptions[field],
          rules,
          candidates,
        };
      }),
    [config, customCatalog],
  );

  const milestones = useMemo(() => listWardrobeMilestones(config), [config]);
  const enabledCount = config.rules.filter((rule) => rule.enabled).length;
  const maxUnlockLevel = Math.max(
    1,
    ...config.rules.map((rule) => rule.unlockLevel),
    ...milestones.map((milestone) => milestone.unlockLevel),
  );
  const totalUnlockWindow = getFocusSecondsForLevel(
    maxUnlockLevel,
    config.levelStepFocusSeconds,
  );
  const customItems = useMemo(
    () =>
      [...customCatalog.items].sort(
        (left, right) =>
          left.field.localeCompare(right.field, "es") ||
          left.label.localeCompare(right.label, "es"),
      ),
    [customCatalog],
  );

  function updateUploadDraft(updater: (draft: UploadDraft) => UploadDraft) {
    setUploadDraft((current) => updater(current));
    setSavedMessage("");
  }

  function toggleUploadColor(color: AvatarGarmentColor) {
    updateUploadDraft((current) => {
      const hasColor = current.colors.includes(color);
      const nextColors = hasColor
        ? current.colors.filter((entry) => entry !== color)
        : [...current.colors, color];

      return {
        ...current,
        colors:
          nextColors.length > 0
            ? nextColors.sort(
                (left, right) =>
                  garmentColorOrder.indexOf(left) -
                  garmentColorOrder.indexOf(right),
              )
            : current.colors,
        files: hasColor
          ? Object.fromEntries(
              Object.entries(current.files).filter(([key]) => key !== color),
            )
          : current.files,
      };
    });
  }

  function setUploadVariantFile(
    color: AvatarGarmentColor,
    sex: AvatarSex,
    file: File | null,
  ) {
    updateUploadDraft((current) => ({
      ...current,
      files: {
        ...current.files,
        [color]: {
          masculino: current.files[color]?.masculino ?? null,
          femenino: current.files[color]?.femenino ?? null,
          [sex]: file,
        },
      },
    }));
  }

  function setRule(
    field: WardrobeField,
    value: string,
    updater: (
      rule: NonNullable<ReturnType<typeof getWardrobeUnlockRule>>,
    ) => WardrobeConfig["rules"][number],
  ) {
    setConfig((current) => {
      const existing = getWardrobeUnlockRule(field, value as never, current);
      if (!existing) {
        return current;
      }

      return {
        ...current,
        rules: current.rules.map((rule) =>
          rule.id === existing.id ? updater(existing) : rule,
        ),
      };
    });
    setSavedMessage("");
  }

  function addOrReactivateRule(
    field: WardrobeField,
    value: string,
    label: string,
    unlockLevel = 1,
  ) {
    const existing = getWardrobeUnlockRule(field, value as never, config);

    if (existing) {
      setRule(field, value, (rule) => ({
        ...rule,
        enabled: true,
        unlockLevel: Math.max(1, unlockLevel),
      }));
      setSavedMessage("Prenda reactivada en el circuito.");
      return;
    }

    setConfig((current) => ({
      ...current,
      rules: [
        ...current.rules,
        {
          id: `${field}:${value}`,
          field,
          value: value as never,
          label,
          unlockLevel: Math.max(1, unlockLevel),
          enabled: true,
        },
      ],
    }));
    setSavedMessage("Prenda añadida al circuito del armario.");
  }

  function addMilestone() {
    setConfig((current) => ({
      ...current,
      milestones: [
        ...current.milestones,
        {
          id: createWardrobeMilestoneId(),
          label: milestoneDraft.label.trim() || "Nuevo hito",
          description: milestoneDraft.description.trim(),
          unlockLevel: Math.max(1, milestoneDraft.unlockLevel),
          enabled: true,
        },
      ],
    }));
    setMilestoneDraft({
      label: "Nuevo hito",
      description: "",
      unlockLevel: Math.max(1, milestoneDraft.unlockLevel + 1),
    });
    setSavedMessage("Hito añadido al plan del armario.");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const nextConfig = await saveWardrobeConfigToServer(config);
      setConfig(nextConfig);
      setSavedMessage("Armario guardado en la VPS.");
    } catch {
      setSavedMessage("No se pudo guardar el armario en la VPS.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      const nextConfig = await resetWardrobeConfigOnServer();
      setConfig(nextConfig);
      setSavedMessage("Armario restaurado al diseño base.");
    } catch {
      setConfig(getDefaultWardrobeConfig());
      setSavedMessage("No se pudo restaurar desde la VPS.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadCustomItem() {
    if (!uploadDraft.label.trim()) {
      setSavedMessage("La prenda necesita al menos un nombre visible.");
      return;
    }

    if (uploadDraft.colors.length === 0) {
      setSavedMessage("Selecciona al menos un color para la prenda.");
      return;
    }

    const missingVariant = uploadDraft.colors.find((color) => {
      const variant = uploadDraft.files[color];
      return !variant?.masculino || !variant.femenino;
    });

    if (missingVariant) {
      setSavedMessage(
        `Faltan los PNG masculino y femenino del color ${missingVariant}.`,
      );
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("field", uploadDraft.field);
      formData.set("label", uploadDraft.label.trim());
      formData.set("description", uploadDraft.description.trim());
      formData.set("slug", uploadDraft.slug.trim());
      formData.set("unlockLevel", String(uploadDraft.unlockLevel));
      formData.set("enabled", uploadDraft.enabled ? "true" : "false");

      uploadDraft.colors.forEach((color) => {
        const variant = uploadDraft.files[color];
        if (!variant?.masculino || !variant.femenino) {
          return;
        }

        formData.append("colors", color);
        formData.set(`variant.${color}.masculino`, variant.masculino);
        formData.set(`variant.${color}.femenino`, variant.femenino);
      });

      const response = await fetch("/api/editor/wardrobe-items", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        catalog?: unknown;
        config?: unknown;
      } | null;

      if (!response.ok || !payload?.catalog || !payload.config) {
        throw new Error(payload?.error || "No se pudo guardar la prenda.");
      }

      const nextCatalog = saveCustomWardrobeCatalog(payload.catalog);
      saveWardrobeConfig(payload.config as WardrobeConfig);
      setCustomCatalog(nextCatalog);
      setConfig(loadWardrobeConfig());
      setUploadDraft(createUploadDraft());
      setSavedMessage("Prenda subida a la VPS y añadida al armario global.");
    } catch (error) {
      setSavedMessage(
        error instanceof Error
          ? error.message
          : "No se pudo subir la prenda a la VPS.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteCustomItem(
    field: CustomWardrobeField,
    itemId: string,
    label: string,
  ) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Se va a borrar ${label} de la VPS. ¿Continuar?`)
    ) {
      return;
    }

    setUploading(true);

    try {
      const response = await fetch("/api/editor/wardrobe-items", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field,
          itemId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        catalog?: unknown;
        config?: unknown;
      } | null;

      if (!response.ok || !payload?.catalog || !payload.config) {
        throw new Error(payload?.error || "No se pudo borrar la prenda.");
      }

      const nextCatalog = saveCustomWardrobeCatalog(payload.catalog);
      saveWardrobeConfig(payload.config as WardrobeConfig);
      setCustomCatalog(nextCatalog);
      setConfig(loadWardrobeConfig());
      setSavedMessage("Prenda eliminada de la VPS y del circuito del armario.");
    } catch (error) {
      setSavedMessage(
        error instanceof Error
          ? error.message
          : "No se pudo borrar la prenda personalizada.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div ref={rootRef} className="space-y-6">
      <section className="gsap-rise grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border border-outline-variant bg-[radial-gradient(circle_at_50%_16%,rgba(255,193,112,0.12),transparent_38%),linear-gradient(180deg,#201714_0%,#17110f_100%)] px-6 py-8 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                Editor del armario
              </p>
              <h1 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight text-on-surface">
                Circuito global de prendas
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-surface-variant">
                Aquí decides qué ropa existe, qué queda oculta, en qué nivel se
                abre y qué hitos marcan el progreso. Todo lo que guardes se
                publica en la VPS y lo consumen `Armario` y `Refinar`.
              </p>
            </div>
            <a
              href="/armario"
              className="inline-flex items-center justify-center border-b-[3px] border-outline-variant bg-surface-container-high px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface"
            >
              Ver armario
            </a>
          </div>

          <div className="mt-8 flex min-h-[24rem] items-center justify-center overflow-hidden sm:min-h-[29rem]">
            <PixelAvatar
              avatar={avatar}
              size="xxl"
              highlighted={false}
              showStatusBadge={false}
              stage="plain"
              anchor="center"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="gsap-rise grid gap-4 sm:grid-cols-3">
            <article className="border border-outline-variant bg-surface-container p-5">
              <div className="flex items-center gap-2 text-primary">
                <Settings2 size={16} />
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                  Ritmo
                </p>
              </div>
              <label className="mt-4 block text-xs uppercase tracking-[0.18em] text-outline">
                Minutos por nivel
              </label>
              <input
                type="number"
                min={15}
                step={5}
                value={getLevelStepMinutes(config)}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    levelStepFocusSeconds:
                      Math.max(15, Number(event.target.value) || 15) * 60,
                  }))
                }
                className="mt-2 w-full border border-outline-variant bg-surface-container-low px-3 py-3 font-headline text-lg font-black uppercase tracking-tight text-on-surface"
              />
            </article>

            <article className="border border-outline-variant bg-surface-container p-5">
              <div className="flex items-center gap-2 text-secondary">
                <Sparkles size={16} />
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                  Visibles
                </p>
              </div>
              <p className="mt-4 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                {enabledCount}/{config.rules.length}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                Prendas que sí aparecen en el circuito global.
              </p>
            </article>

            <article className="border border-outline-variant bg-surface-container p-5">
              <div className="flex items-center gap-2 text-tertiary">
                <Settings2 size={16} />
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                  Horizonte
                </p>
              </div>
              <p className="mt-4 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                {formatWardrobeDuration(totalUnlockWindow)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                Tiempo necesario para completar el tramo más alto activo.
              </p>
            </article>
          </div>

          <div className="gsap-rise border border-outline-variant bg-surface-container p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                  Guardado global
                </p>
                {loading && !savedMessage ? (
                  <div className="mt-2">
                    <Spinner
                      label="Leyendo configuración publicada desde la VPS…"
                      size="sm"
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    {savedMessage ||
                      "Los cambios no se aplican hasta guardarlos en la VPS."}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface hover:border-secondary disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? "Guardando..." : "Guardar en la VPS"}
                </button>
              </div>
            </div>
          </div>

          <div className="gsap-rise border border-outline-variant bg-surface-container p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                  Subida directa a la VPS
                </p>
                <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-primary">
                  Prendas personalizadas
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                  Sube los PNG desde aquí y la prenda quedará disponible sin
                  tocar código. Después podrás cambiar su nivel, ocultarla o
                  dejarla visible en el circuito global.
                </p>
              </div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                {customItems.length} prendas subidas
              </p>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Categoría
                    </span>
                    <select
                      value={uploadDraft.field}
                      onChange={(event) =>
                        updateUploadDraft((current) => ({
                          ...current,
                          field: event.target.value as CustomWardrobeField,
                        }))
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                    >
                      {uploadFieldOptions.map((field) => (
                        <option key={field} value={field}>
                          {fieldLabels[field]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Nombre visible
                    </span>
                    <input
                      type="text"
                      value={uploadDraft.label}
                      onChange={(event) =>
                        updateUploadDraft((current) => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Túnica lunar"
                      className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Slug estable
                    </span>
                    <input
                      type="text"
                      value={uploadDraft.slug}
                      onChange={(event) =>
                        updateUploadDraft((current) => ({
                          ...current,
                          slug: event.target.value,
                        }))
                      }
                      placeholder="tunica-lunar"
                      className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-outline">
                      Nivel de desbloqueo
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={uploadDraft.unlockLevel}
                      onChange={(event) =>
                        updateUploadDraft((current) => ({
                          ...current,
                          unlockLevel: Math.max(
                            1,
                            Number(event.target.value) || 1,
                          ),
                        }))
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs uppercase tracking-[0.18em] text-outline">
                    Descripción
                  </span>
                  <textarea
                    value={uploadDraft.description}
                    onChange={(event) =>
                      updateUploadDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Prenda especial para una temporada o nivel concreto."
                    className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                  />
                </label>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-outline">
                    Colores disponibles
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {garmentColorOptions.map((colorOption) => {
                      const active = uploadDraft.colors.includes(
                        colorOption.value,
                      );

                      return (
                        <button
                          key={colorOption.value}
                          type="button"
                          onClick={() => toggleUploadColor(colorOption.value)}
                          className={`inline-flex items-center gap-2 border px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ${
                            active
                              ? "border-primary bg-primary/12 text-primary"
                              : "border-outline-variant bg-surface text-on-surface"
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-black/20"
                            style={{
                              backgroundColor:
                                garmentColorMeta[colorOption.value].swatch,
                            }}
                          />
                          {colorOption.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3">
                  {uploadDraft.colors.map((color) => (
                    <div
                      key={color}
                      className="border border-outline-variant bg-surface-container-low p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/20"
                          style={{
                            backgroundColor: garmentColorMeta[color].swatch,
                          }}
                        />
                        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface">
                          {garmentColorMeta[color].label}
                        </p>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {(["masculino", "femenino"] as AvatarSex[]).map(
                          (sex) => (
                            <label key={sex} className="space-y-1">
                              <span className="text-[10px] uppercase tracking-[0.18em] text-outline">
                                PNG {sex}
                              </span>
                              <input
                                type="file"
                                accept=".png,image/png"
                                onChange={(event) =>
                                  setUploadVariantFile(
                                    color,
                                    sex,
                                    event.target.files?.[0] ?? null,
                                  )
                                }
                                className="w-full border border-outline-variant bg-surface px-3 py-3 text-xs text-on-surface file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:font-headline file:text-[10px] file:font-bold file:uppercase file:tracking-[0.18em] file:text-on-primary"
                              />
                            </label>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      updateUploadDraft((current) => ({
                        ...current,
                        enabled: !current.enabled,
                      }))
                    }
                    className={`inline-flex items-center gap-2 border px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ${
                      uploadDraft.enabled
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-outline-variant bg-surface text-outline"
                    }`}
                  >
                    {uploadDraft.enabled ? (
                      <Eye size={14} />
                    ) : (
                      <EyeOff size={14} />
                    )}
                    {uploadDraft.enabled ? "Visible al subir" : "Subir oculta"}
                  </button>

                  <button
                    type="button"
                    onClick={handleUploadCustomItem}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
                  >
                    <Plus size={14} />
                    {uploading ? "Subiendo..." : "Subir a la VPS"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                  Catálogo subido
                </p>
                {customItems.length > 0 ? (
                  customItems.map((item) => {
                    const rule = getWardrobeUnlockRule(
                      item.field,
                      item.id,
                      config,
                    );

                    return (
                      <article
                        key={item.id}
                        className="border border-outline-variant bg-surface-container-low p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                              {fieldLabels[item.field]}
                            </p>
                            <h3 className="mt-2 font-headline text-lg font-black uppercase tracking-[0.16em] text-on-surface">
                              {item.label}
                            </h3>
                            <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                              {item.description || "Sin descripción."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCustomItem(
                                item.field,
                                item.id,
                                item.label,
                              )
                            }
                            className="inline-flex items-center gap-2 border border-error/40 bg-error/10 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-error hover:border-error"
                          >
                            <Trash2 size={14} />
                            Borrar
                          </button>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
                          <div className="overflow-hidden border border-outline-variant bg-surface">
                            <ItemModelPreview
                              field={item.field}
                              value={item.id}
                              avatar={avatar}
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="border border-outline-variant bg-surface px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface">
                                {rule?.enabled ? "Visible" : "Oculta"}
                              </span>
                              <span className="border border-outline-variant bg-surface px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface">
                                Nivel {rule?.unlockLevel ?? 1}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {item.availableColors.map((color) => (
                                <span
                                  key={color}
                                  className="inline-flex items-center gap-2 border border-outline-variant bg-surface px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface"
                                >
                                  <span
                                    className="h-3 w-3 rounded-full border border-black/20"
                                    style={{
                                      backgroundColor:
                                        garmentColorMeta[color].swatch,
                                    }}
                                  />
                                  {garmentColorMeta[color].label}
                                </span>
                              ))}
                            </div>

                            <p className="text-xs leading-relaxed text-on-surface-variant">
                              ID estable:{" "}
                              <span className="font-mono">{item.id}</span>
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="border border-outline-variant bg-surface-container-low px-4 py-5 text-sm leading-relaxed text-on-surface-variant">
                    Todavía no has subido prendas nuevas a la VPS. Las prendas
                    base del juego siguen estando en el catálogo inferior.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gsap-rise border border-outline-variant bg-surface-container p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
          <div>
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              Hitos
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-primary">
              Línea de progresión
            </h2>
          </div>
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
            {milestones.filter((milestone) => milestone.enabled).length}/
            {milestones.length} activos
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="border border-outline-variant bg-surface-container-low p-4">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              Añadir hito
            </p>
            <div className="mt-4 grid gap-3">
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-outline">
                  Título
                </span>
                <input
                  type="text"
                  value={milestoneDraft.label}
                  onChange={(event) =>
                    setMilestoneDraft((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-outline">
                  Nivel
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={milestoneDraft.unlockLevel}
                  onChange={(event) =>
                    setMilestoneDraft((current) => ({
                      ...current,
                      unlockLevel: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                  className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-outline">
                  Descripción
                </span>
                <textarea
                  value={milestoneDraft.description}
                  onChange={(event) =>
                    setMilestoneDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                />
              </label>
              <button
                type="button"
                onClick={addMilestone}
                className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
              >
                <Plus size={14} />
                Añadir hito
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {milestones.map((milestone) => (
              <article
                key={milestone.id}
                className={`border p-4 ${
                  milestone.enabled
                    ? "border-outline-variant bg-surface-container-low"
                    : "border-outline-variant/50 bg-surface-container-low/55"
                }`}
              >
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-outline">
                    Título
                  </span>
                  <input
                    type="text"
                    value={milestone.label}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        milestones: current.milestones.map((entry) =>
                          entry.id === milestone.id
                            ? { ...entry, label: event.target.value }
                            : entry,
                        ),
                      }))
                    }
                    className="mt-2 w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                  />
                </label>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-outline">
                      Nivel
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={milestone.unlockLevel}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          milestones: current.milestones.map((entry) =>
                            entry.id === milestone.id
                              ? {
                                  ...entry,
                                  unlockLevel: Math.max(
                                    1,
                                    Number(event.target.value) || 1,
                                  ),
                                }
                              : entry,
                          ),
                        }))
                      }
                      className="w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((current) => ({
                        ...current,
                        milestones: current.milestones.map((entry) =>
                          entry.id === milestone.id
                            ? { ...entry, enabled: !entry.enabled }
                            : entry,
                        ),
                      }))
                    }
                    className={`mt-auto inline-flex items-center justify-center gap-2 border px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em] ${
                      milestone.enabled
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-outline-variant bg-surface text-outline"
                    }`}
                  >
                    {milestone.enabled ? (
                      <Eye size={14} />
                    ) : (
                      <EyeOff size={14} />
                    )}
                    {milestone.enabled ? "Activo" : "Oculto"}
                  </button>
                </div>

                <label className="mt-3 block">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-outline">
                    Descripción
                  </span>
                  <textarea
                    value={milestone.description}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        milestones: current.milestones.map((entry) =>
                          entry.id === milestone.id
                            ? { ...entry, description: event.target.value }
                            : entry,
                        ),
                      }))
                    }
                    rows={3}
                    className="mt-2 w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setConfig((current) => ({
                      ...current,
                      milestones: current.milestones.filter(
                        (entry) => entry.id !== milestone.id,
                      ),
                    }))
                  }
                  className="mt-3 inline-flex items-center gap-2 border border-error/40 bg-error/10 px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-error hover:border-error"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {groups.map((group) => (
        <section
          key={group.field}
          className="gsap-rise border border-outline-variant bg-surface-container p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                {group.label}
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-primary">
                {group.description}
              </h2>
            </div>
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              {group.rules.filter((rule) => rule.enabled).length}/
              {group.rules.length} activas
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-3">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Circuito activo
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {group.rules.map((rule) => {
                  const unlockTime = getFocusSecondsForLevel(
                    rule.unlockLevel,
                    config.levelStepFocusSeconds,
                  );

                  return (
                    <article
                      key={rule.id}
                      className={`border p-4 ${
                        rule.enabled
                          ? "border-outline-variant bg-surface-container-low"
                          : "border-outline-variant/50 bg-surface-container-low/55"
                      }`}
                    >
                      <div className={rule.enabled ? "" : "opacity-55"}>
                        <div className="flex justify-center">
                          <ItemModelPreview
                            field={rule.field}
                            value={rule.value}
                            avatar={avatar}
                          />
                        </div>
                        <label className="mt-3 block">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-outline">
                            Etiqueta
                          </span>
                          <input
                            type="text"
                            value={rule.label}
                            onChange={(event) =>
                              setRule(group.field, rule.value, (current) => ({
                                ...current,
                                label: event.target.value,
                              }))
                            }
                            className="mt-2 w-full border border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface"
                          />
                        </label>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-outline">
                            Nivel
                          </span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={rule.unlockLevel}
                            onChange={(event) =>
                              setRule(group.field, rule.value, (current) => ({
                                ...current,
                                unlockLevel: Math.max(
                                  1,
                                  Number(event.target.value) || 1,
                                ),
                              }))
                            }
                            className="w-full border border-outline-variant bg-surface px-3 py-3 font-headline text-lg font-black uppercase tracking-tight text-on-surface"
                          />
                        </label>

                        <div className="space-y-1">
                          <span className="block text-[10px] uppercase tracking-[0.18em] text-outline">
                            Visible
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRule(group.field, rule.value, (current) => ({
                                ...current,
                                enabled: !current.enabled,
                              }))
                            }
                            className={`inline-flex w-full items-center justify-center gap-2 border px-3 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.16em] ${
                              rule.enabled
                                ? "border-primary bg-primary/12 text-primary"
                                : "border-outline-variant bg-surface text-outline"
                            }`}
                          >
                            {rule.enabled ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}
                            {rule.enabled ? "Visible" : "Oculta"}
                          </button>
                        </div>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
                        {rule.enabled
                          ? `Se desbloquea al nivel ${rule.unlockLevel} tras ${formatWardrobeDuration(
                              unlockTime,
                            )}.`
                          : "No aparece en Armario ni en Refinar mientras siga oculta."}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                Catálogo completo
              </p>
              <div className="grid gap-3">
                {group.candidates.map((candidate) => (
                  <article
                    key={candidate.value}
                    className="flex items-center justify-between gap-3 border border-outline-variant bg-surface-container-low px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden border border-outline-variant bg-surface">
                        <ItemModelPreview
                          field={group.field}
                          value={candidate.value}
                          avatar={avatar}
                        />
                      </div>
                      <div>
                        <p className="font-headline text-[11px] font-black uppercase tracking-[0.16em] text-on-surface">
                          {candidate.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                          {candidate.description}
                        </p>
                      </div>
                    </div>

                    {candidate.state === "active" ? (
                      <span className="border border-primary/40 bg-primary/10 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                        Activa
                      </span>
                    ) : candidate.state === "hidden" ? (
                      <button
                        type="button"
                        onClick={() =>
                          addOrReactivateRule(
                            group.field,
                            candidate.value,
                            candidate.label,
                          )
                        }
                        className="inline-flex items-center gap-2 border border-outline-variant bg-surface px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface hover:border-secondary"
                      >
                        <Eye size={14} />
                        Reactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          addOrReactivateRule(
                            group.field,
                            candidate.value,
                            candidate.label,
                          )
                        }
                        className="inline-flex items-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary"
                      >
                        <Plus size={14} />
                        Añadir
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
