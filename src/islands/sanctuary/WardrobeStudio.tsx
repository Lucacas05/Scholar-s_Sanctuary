import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Flame, Lock, Settings2, Shirt, Sparkles } from "lucide-react";
import { ErrorBlock } from "@/islands/sanctuary/ErrorBlock";
import { ItemModelPreview } from "@/islands/sanctuary/ItemModelPreview";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import {
  CUSTOM_WARDROBE_CATALOG_EVENT,
  getPreferredWardrobeColor,
  listAvailableWardrobeColors,
  loadCustomWardrobeCatalog,
  syncCustomWardrobeCatalogFromServer,
  type CustomWardrobeCatalog,
} from "@/lib/sanctuary/customWardrobe";
import {
  avatarOptions,
  garmentColorMeta,
  getRenderableCurrentProfile,
  sanctuaryActions,
  useSanctuaryStore,
  type AvatarConfig,
} from "@/lib/sanctuary/store";
import {
  WARDROBE_CONFIG_EVENT,
  formatWardrobeDuration,
  getFocusSecondsForLevel,
  getWardrobeRequirement,
  getWardrobeRequirementLevel,
  getWardrobeUnlockSummary,
  isWardrobeItemUnlocked,
  listEnabledWardrobeMilestones,
  listVisibleWardrobeOptionsByField,
  loadWardrobeConfig,
  syncWardrobeConfigFromServer,
  type WardrobeConfig,
  type WardrobeField,
} from "@/lib/sanctuary/wardrobe";

interface PomodoroStats {
  totalFocusSeconds: number;
}

type GarmentField = "upper" | "lower" | "socks";
type GarmentColorField = "upperColor" | "lowerColor" | "socksColor";

const wardrobeFields: WardrobeField[] = [
  "upper",
  "lower",
  "socks",
  "accessory",
];

const fieldLabels: Record<WardrobeField, string> = {
  upper: "Parte superior",
  lower: "Parte inferior",
  socks: "Calcetines",
  accessory: "Accesorios",
};

const fieldDescriptions: Record<WardrobeField, string> = {
  upper: "Prendas para la parte alta del atuendo.",
  lower: "Piezas base para piernas y silueta.",
  socks: "Capas pequenas que rematan el conjunto.",
  accessory: "Complementos, cascos y piezas raras del santuario.",
};

const garmentColorFieldByField: Record<GarmentField, GarmentColorField> = {
  upper: "upperColor",
  lower: "lowerColor",
  socks: "socksColor",
};

function isGarmentField(field: WardrobeField): field is GarmentField {
  return field === "upper" || field === "lower" || field === "socks";
}

function formatHoursStudied(totalFocusSeconds: number) {
  return (totalFocusSeconds / 3600).toFixed(1);
}

interface WardrobeStudioProps {
  canManageEditors?: boolean;
}

export function WardrobeStudio({
  canManageEditors = false,
}: WardrobeStudioProps = {}) {
  const sanctuary = useSanctuaryStore();
  const profile = getRenderableCurrentProfile(sanctuary);
  const avatar = profile.avatar;
  const isAnonymous = sanctuary.sessionState === "anonymous";
  const [activeField, setActiveField] = useState<WardrobeField>("upper");
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [wardrobeConfig, setWardrobeConfig] = useState<WardrobeConfig>(() =>
    loadWardrobeConfig(),
  );
  const [customCatalog, setCustomCatalog] = useState<CustomWardrobeCatalog>(
    () => loadCustomWardrobeCatalog(),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  useGsapReveal(rootRef);

  useEffect(() => {
    let cancelled = false;

    const syncConfigFromCache = () => {
      setWardrobeConfig(loadWardrobeConfig());
    };

    async function syncConfigFromServer() {
      try {
        const config = await syncWardrobeConfigFromServer();
        if (!cancelled) {
          setWardrobeConfig(config);
        }
      } catch {
        if (!cancelled) {
          setWardrobeConfig(loadWardrobeConfig());
        }
      }
    }

    void syncConfigFromServer();
    window.addEventListener("storage", syncConfigFromCache);
    window.addEventListener("focus", syncConfigFromServer);
    window.addEventListener(WARDROBE_CONFIG_EVENT, syncConfigFromCache);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncConfigFromCache);
      window.removeEventListener("focus", syncConfigFromServer);
      window.removeEventListener(WARDROBE_CONFIG_EVENT, syncConfigFromCache);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncCatalogFromCache = () => {
      setCustomCatalog(loadCustomWardrobeCatalog());
    };

    async function syncCatalogFromServer() {
      try {
        const catalog = await syncCustomWardrobeCatalogFromServer();
        if (!cancelled) {
          setCustomCatalog(catalog);
        }
      } catch {
        if (!cancelled) {
          setCustomCatalog(loadCustomWardrobeCatalog());
        }
      }
    }

    void syncCatalogFromServer();
    window.addEventListener("focus", syncCatalogFromServer);
    window.addEventListener(
      CUSTOM_WARDROBE_CATALOG_EVENT,
      syncCatalogFromCache,
    );

    return () => {
      cancelled = true;
      window.removeEventListener("focus", syncCatalogFromServer);
      window.removeEventListener(
        CUSTOM_WARDROBE_CATALOG_EVENT,
        syncCatalogFromCache,
      );
    };
  }, []);

  useEffect(() => {
    if (isAnonymous) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch("/api/pomodoro/stats?range=monthly")
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("fetch")),
      )
      .then((payload: PomodoroStats) => {
        if (!cancelled) {
          setStats(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAnonymous]);

  useEffect(() => {
    const corrections = [
      {
        field: "upper" as const,
        colorField: "upperColor" as const,
        value: avatar.upper,
        color: avatar.upperColor,
      },
      {
        field: "lower" as const,
        colorField: "lowerColor" as const,
        value: avatar.lower,
        color: avatar.lowerColor,
      },
      {
        field: "socks" as const,
        colorField: "socksColor" as const,
        value: avatar.socks,
        color: avatar.socksColor,
      },
    ];

    corrections.forEach(({ field, colorField, value, color }) => {
      const preferredColor = getPreferredWardrobeColor(
        field,
        value,
        color,
        customCatalog,
      );

      if (preferredColor !== color) {
        sanctuaryActions.updateAvatar(colorField, preferredColor);
      }
    });
  }, [
    avatar.lower,
    avatar.lowerColor,
    avatar.socks,
    avatar.socksColor,
    avatar.upper,
    avatar.upperColor,
    customCatalog,
  ]);

  const totalFocusSeconds = stats?.totalFocusSeconds ?? 0;
  const unlockSummary = useMemo(
    () => getWardrobeUnlockSummary(totalFocusSeconds, wardrobeConfig),
    [totalFocusSeconds, wardrobeConfig],
  );
  const currentOptions = useMemo(() => {
    return listVisibleWardrobeOptionsByField(
      activeField,
      totalFocusSeconds,
      wardrobeConfig,
      customCatalog,
    );
  }, [activeField, customCatalog, totalFocusSeconds, wardrobeConfig]);
  const activeColorField = isGarmentField(activeField)
    ? garmentColorFieldByField[activeField]
    : null;
  const colorOptions = activeColorField ? avatarOptions[activeColorField] : [];
  const milestones = useMemo(
    () => listEnabledWardrobeMilestones(wardrobeConfig),
    [wardrobeConfig],
  );

  return (
    <div
      ref={rootRef}
      className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <aside className="gsap-rise self-start border border-outline-variant bg-[linear-gradient(180deg,#1f1714_0%,#16100e_100%)] p-4 xl:sticky xl:top-28">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.26em] text-outline">
          Armario del santuario
        </p>
        <div className="mt-4 space-y-2">
          {wardrobeFields.map((field) => {
            const active = field === activeField;
            return (
              <button
                key={field}
                type="button"
                onClick={() => setActiveField(field)}
                className={`flex w-full items-center justify-between gap-3 border px-4 py-3 text-left transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant bg-surface-container-low text-on-surface hover:border-secondary hover:text-secondary"
                }`}
              >
                <span className="font-headline text-sm font-black uppercase tracking-[0.18em]">
                  {fieldLabels[field]}
                </span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-outline">
                  {field === "accessory"
                    ? "Rareza"
                    : field === "socks"
                      ? "Detalle"
                      : "Prenda"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 border border-outline-variant bg-surface-container-low p-4">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
            Estado del armario
          </p>
          <div className="mt-3 space-y-3 text-sm text-on-surface-variant">
            <p>
              Tienes desbloqueadas{" "}
              <span className="font-headline font-black text-primary">
                {unlockSummary.unlockedCount}/{unlockSummary.totalItems}
              </span>{" "}
              piezas del armario.
            </p>
            <p>
              Tu progreso va por el nivel{" "}
              <span className="font-headline font-black text-tertiary">
                {unlockSummary.currentLevel}/{unlockSummary.maxLevel}
              </span>
              .
            </p>
          </div>
        </div>

        {canManageEditors ? (
          <div className="mt-4 space-y-2">
            <a
              href="/editor-armario"
              className="flex items-center justify-between gap-3 border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface transition hover:border-secondary hover:text-secondary"
            >
              <span className="font-headline text-xs font-black uppercase tracking-[0.18em]">
                Editar desbloqueos
              </span>
              <Settings2 size={16} />
            </a>
            <a
              href="/editor-misiones"
              className="flex items-center justify-between gap-3 border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface transition hover:border-secondary hover:text-secondary"
            >
              <span className="font-headline text-xs font-black uppercase tracking-[0.18em]">
                Editar misiones
              </span>
              <Sparkles size={16} />
            </a>
          </div>
        ) : null}
      </aside>

      <section className="space-y-6">
        <div className="gsap-rise grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="border border-outline-variant bg-[radial-gradient(circle_at_50%_16%,rgba(255,193,112,0.12),transparent_38%),linear-gradient(180deg,#201714_0%,#17110f_100%)] px-6 py-8 sm:px-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Atuendo activo
                </p>
                <h1 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight text-on-surface">
                  Armario desbloqueable
                </h1>
              </div>
              <div className="border border-primary/35 bg-primary/10 px-3 py-2">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Horas acumuladas
                </p>
                <p className="font-headline text-xl font-black uppercase tracking-tight text-primary">
                  {formatHoursStudied(totalFocusSeconds)} h
                </p>
              </div>
            </div>

            <div className="flex min-h-[27rem] items-center justify-center overflow-hidden sm:min-h-[33rem]">
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
            <div className="gsap-rise grid gap-4 sm:grid-cols-3 xl:grid-cols-4">
              <article className="border border-outline-variant bg-surface-container p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Flame size={16} />
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                    Foco total
                  </p>
                </div>
                <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                  {formatWardrobeDuration(totalFocusSeconds)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                  El desbloqueo se calcula con tu tiempo real de estudio.
                </p>
              </article>

              <article className="border border-outline-variant bg-surface-container p-4">
                <div className="flex items-center gap-2 text-tertiary">
                  <Shirt size={16} />
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                    Piezas abiertas
                  </p>
                </div>
                <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                  {unlockSummary.unlockedCount}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                  Entre ropa, calcetines y accesorios del santuario.
                </p>
              </article>

              <article className="border border-outline-variant bg-surface-container p-4">
                <div className="flex items-center gap-2 text-secondary">
                  <Crown size={16} />
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                    Siguiente prenda
                  </p>
                </div>
                <p className="mt-3 font-headline text-base font-black uppercase tracking-tight text-on-surface">
                  {unlockSummary.nextUnlock?.label ?? "Armario completo"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                  {unlockSummary.nextUnlock
                    ? `Nivel ${unlockSummary.nextUnlock.unlockLevel} · faltan ${formatWardrobeDuration(
                        unlockSummary.nextUnlock.remainingFocusSeconds,
                      )}.`
                    : "Ya no queda ninguna prenda bloqueada."}
                </p>
              </article>

              <article className="border border-outline-variant bg-surface-container p-4">
                <div className="flex items-center gap-2 text-tertiary">
                  <Sparkles size={16} />
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                    Siguiente hito
                  </p>
                </div>
                <p className="mt-3 font-headline text-base font-black uppercase tracking-tight text-on-surface">
                  {unlockSummary.nextMilestone?.label ?? "Ruta completa"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                  {unlockSummary.nextMilestone
                    ? `Nivel ${unlockSummary.nextMilestone.unlockLevel} · faltan ${formatWardrobeDuration(
                        unlockSummary.nextMilestone.remainingFocusSeconds,
                      )}.`
                    : "Ya no queda ningún hito pendiente en el circuito."}
                </p>
              </article>
            </div>

            <div className="gsap-rise border border-outline-variant bg-surface-container p-5">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="mt-0.5 shrink-0 text-tertiary" />
                <div>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                    Sistema de progresion
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    Cada candado ya indica el nivel necesario. Si quieres
                    rehacer la economia de prendas, entra al editor del armario
                    y cambia el nivel de desbloqueo de cada pieza.
                  </p>
                </div>
              </div>
            </div>

            <div className="gsap-rise border border-outline-variant bg-surface-container p-5">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                Hitos del armario
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {milestones.length > 0 ? (
                  milestones.map((milestone) => {
                    const requiredFocusSeconds = getFocusSecondsForLevel(
                      milestone.unlockLevel,
                      wardrobeConfig.levelStepFocusSeconds,
                    );
                    const unlocked = totalFocusSeconds >= requiredFocusSeconds;

                    return (
                      <article
                        key={milestone.id}
                        className={`border px-4 py-3 ${
                          unlocked
                            ? "border-primary/40 bg-primary/10"
                            : "border-outline-variant bg-surface-container-low"
                        }`}
                      >
                        <p className="font-headline text-sm font-black uppercase tracking-[0.16em] text-on-surface">
                          {milestone.label}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-outline">
                          Nivel {milestone.unlockLevel}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                          {milestone.description || "Hito sin descripción."}
                        </p>
                      </article>
                    );
                  })
                ) : (
                  <div className="border border-outline-variant bg-surface-container-low px-4 py-5 text-sm leading-relaxed text-on-surface-variant sm:col-span-2">
                    No hay hitos activos. Puedes crearlos desde el editor del
                    armario.
                  </div>
                )}
              </div>
            </div>

            {error ? (
              <ErrorBlock
                message="No se pudo cargar el progreso del armario."
                onRetry={() => window.location.reload()}
              />
            ) : null}
          </div>
        </div>

        <div className="gsap-rise border border-outline-variant bg-surface-container p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                {fieldLabels[activeField]}
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-primary">
                {fieldDescriptions[activeField]}
              </h2>
            </div>
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              {loading
                ? "Leyendo progreso..."
                : `${currentOptions.length} opciones`}
            </p>
          </div>

          {currentOptions.length === 0 ? (
            <div className="border border-outline-variant bg-surface-container-low px-4 py-5 text-sm leading-relaxed text-on-surface-variant">
              No hay prendas visibles en esta categoria. Puedes reactivarlas o
              anadir nuevas reglas desde el editor del armario.
            </div>
          ) : (
            <div className="grid max-h-[42rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {currentOptions.map((option) => {
                const typedValue =
                  option.value as AvatarConfig[typeof activeField];
                const unlocked = isWardrobeItemUnlocked(
                  activeField,
                  typedValue,
                  totalFocusSeconds,
                  wardrobeConfig,
                );
                const requiredFocusSeconds = getWardrobeRequirement(
                  activeField,
                  typedValue,
                  wardrobeConfig,
                );
                const requiredLevel = getWardrobeRequirementLevel(
                  activeField,
                  typedValue,
                  wardrobeConfig,
                );
                const active = avatar[activeField] === option.value;
                const optionColors =
                  activeColorField && isGarmentField(activeField)
                    ? (() => {
                        const garmentField = activeField;
                        const garmentValue =
                          typedValue as AvatarConfig[typeof garmentField];

                        return colorOptions.filter((colorOption) =>
                          listAvailableWardrobeColors(
                            garmentField,
                            garmentValue,
                            customCatalog,
                          ).includes(colorOption.value),
                        );
                      })()
                    : [];

                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      if (isAnonymous || !unlocked) {
                        return;
                      }
                      sanctuaryActions.updateAvatar(activeField, typedValue);
                      if (activeColorField && isGarmentField(activeField)) {
                        const garmentField = activeField;
                        sanctuaryActions.updateAvatar(
                          activeColorField,
                          getPreferredWardrobeColor(
                            garmentField,
                            typedValue as AvatarConfig[typeof garmentField],
                            avatar[activeColorField],
                            customCatalog,
                          ) as AvatarConfig[typeof activeColorField],
                        );
                      }
                    }}
                    onKeyDown={(event) => {
                      if (isAnonymous || !unlocked) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        sanctuaryActions.updateAvatar(activeField, typedValue);
                        if (activeColorField && isGarmentField(activeField)) {
                          const garmentField = activeField;
                          sanctuaryActions.updateAvatar(
                            activeColorField,
                            getPreferredWardrobeColor(
                              garmentField,
                              typedValue as AvatarConfig[typeof garmentField],
                              avatar[activeColorField],
                              customCatalog,
                            ) as AvatarConfig[typeof activeColorField],
                          );
                        }
                      }
                    }}
                    role="button"
                    tabIndex={isAnonymous ? -1 : 0}
                    className={`relative overflow-hidden border p-3 text-left transition ${
                      active && unlocked
                        ? "border-primary bg-primary/10"
                        : unlocked
                          ? "border-outline-variant bg-surface-container-low hover:border-secondary"
                          : "border-outline-variant/60 bg-surface-container-low/60 opacity-85"
                    } ${isAnonymous ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    {!unlocked ? (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[linear-gradient(180deg,rgba(16,12,11,0.12),rgba(16,12,11,0.78))] px-4 text-center">
                        <Lock size={18} className="text-primary" />
                        <p className="font-headline text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                          Bloqueada
                        </p>
                        <p className="text-xs leading-relaxed text-on-surface">
                          Se desbloquea al nivel {requiredLevel}.
                        </p>
                      </div>
                    ) : null}

                    <div className={unlocked ? "" : "blur-[1px]"}>
                      <div className="flex justify-center">
                        <ItemModelPreview
                          field={activeField}
                          value={option.value}
                          avatar={avatar}
                        />
                      </div>

                      {activeColorField ? (
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          {optionColors.map((colorOption) => {
                            const selectedColor =
                              avatar[activeColorField] === colorOption.value;

                            return (
                              <button
                                key={colorOption.value}
                                type="button"
                                title={colorOption.label}
                                aria-label={colorOption.label}
                                onClick={(event) => {
                                  if (isAnonymous || !unlocked) {
                                    return;
                                  }
                                  event.stopPropagation();
                                  sanctuaryActions.updateAvatar(
                                    activeField,
                                    typedValue,
                                  );
                                  sanctuaryActions.updateAvatar(
                                    activeColorField,
                                    colorOption.value as AvatarConfig[typeof activeColorField],
                                  );
                                }}
                                disabled={isAnonymous || !unlocked}
                                className={`h-4 w-4 rounded-full border transition ${
                                  selectedColor && active
                                    ? "scale-110 border-primary ring-2 ring-primary/40"
                                    : "border-outline-variant hover:scale-105 hover:border-secondary"
                                }`}
                                style={{
                                  backgroundColor:
                                    garmentColorMeta[colorOption.value].swatch,
                                }}
                              />
                            );
                          })}
                        </div>
                      ) : null}

                      <p className="mt-3 font-headline text-[11px] font-black uppercase tracking-[0.16em] text-on-surface">
                        {option.label}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                        {unlocked
                          ? `Disponible desde el nivel ${requiredLevel}.`
                          : `Se desbloquea al nivel ${requiredLevel} tras ${formatWardrobeDuration(
                              requiredFocusSeconds,
                            )} de estudio total.`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
