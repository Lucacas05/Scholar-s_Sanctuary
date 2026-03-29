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
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import {
  getRenderableCurrentProfile,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
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

export function WardrobeRulesEditor() {
  const sanctuary = useSanctuaryStore();
  const avatar = getRenderableCurrentProfile(sanctuary).avatar;
  const [config, setConfig] = useState<WardrobeConfig>(() =>
    loadWardrobeConfig(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [milestoneDraft, setMilestoneDraft] = useState({
    label: "Nuevo hito",
    description: "",
    unlockLevel: 1,
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGsapReveal(rootRef);

  useEffect(() => {
    let cancelled = false;

    async function loadServerConfig() {
      setLoading(true);
      try {
        const nextConfig = await syncWardrobeConfigFromServer();
        if (!cancelled) {
          setConfig(nextConfig);
        }
      } catch {
        if (!cancelled) {
          setConfig(loadWardrobeConfig());
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
        const candidates = listWardrobeCandidates(field).map((candidate) => ({
          ...candidate,
          state: getWardrobeUnlockRule(field, candidate.value, config)
            ? getWardrobeUnlockRule(field, candidate.value, config)?.enabled
              ? "active"
              : "hidden"
            : "missing",
        }));

        return {
          field,
          label: fieldLabels[field],
          description: fieldDescriptions[field],
          rules,
          candidates,
        };
      }),
    [config],
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
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {savedMessage ||
                    (loading
                      ? "Leyendo configuración publicada desde la VPS..."
                      : "Los cambios no se aplican hasta guardarlos en la VPS.")}
                </p>
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
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              Cómo añadir ropa desde la web
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="border border-outline-variant bg-surface-container-low p-4">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  1. Añadir al circuito
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  En cada categoría, usa `Catálogo completo` y pulsa `Añadir` o
                  `Reactivar`. Eso publica una prenda ya existente en el sprite
                  actual.
                </p>
              </div>
              <div className="border border-outline-variant bg-surface-container-low p-4">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                  2. Fijar nivel
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  En `Circuito activo` decides el nivel exacto. Luego `Refinar`
                  enseña el candado y el texto de desbloqueo a cada usuario.
                </p>
              </div>
              <div className="border border-outline-variant bg-surface-container-low p-4">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">
                  3. Colores
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Los colores de parte superior, inferior y calcetines se eligen
                  en `Refinar` cuando la prenda ya está desbloqueada. Si quieres
                  un color nuevo real, hay que darlo de alta en el catálogo del
                  avatar.
                </p>
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
