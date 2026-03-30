import { useEffect, useMemo, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import {
  avatarOptions,
  getRenderableCurrentProfile,
  garmentColorMeta,
  sanctuaryActions,
  useSanctuaryStore,
  type AvatarConfig,
} from "@/lib/sanctuary/store";
import { ErrorBlock } from "@/islands/sanctuary/ErrorBlock";
import { Spinner } from "@/islands/sanctuary/Spinner";
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
  WARDROBE_CONFIG_EVENT,
  formatWardrobeDuration,
  getWardrobeRequirementLevel,
  hasCachedWardrobeConfig,
  isWardrobeItemUnlocked,
  listVisibleWardrobeOptionsByField,
  loadWardrobeConfig,
  syncWardrobeConfigFromServer,
  type WardrobeConfig,
  type WardrobeField,
} from "@/lib/sanctuary/wardrobe";

interface PomodoroStats {
  totalFocusSeconds: number;
}

type EditableAvatarField =
  | "sex"
  | "skinTone"
  | "hairStyle"
  | "hairColor"
  | "accessory"
  | "upper"
  | "lower"
  | "socks";
type GarmentField = "upper" | "lower" | "socks";
type GarmentColorField = "upperColor" | "lowerColor" | "socksColor";

const fieldLabels: Record<EditableAvatarField, string> = {
  sex: "Sexo",
  skinTone: "Piel",
  hairStyle: "Pelo",
  hairColor: "Color pelo",
  accessory: "Accesorios",
  upper: "Parte superior",
  lower: "Parte inferior",
  socks: "Calcetines",
};

const fieldOrder: EditableAvatarField[] = [
  "sex",
  "skinTone",
  "hairStyle",
  "hairColor",
  "accessory",
  "upper",
  "lower",
  "socks",
];

const garmentColorFieldByField: Record<GarmentField, GarmentColorField> = {
  upper: "upperColor",
  lower: "lowerColor",
  socks: "socksColor",
};

function isGarmentField(field: EditableAvatarField): field is GarmentField {
  return field === "upper" || field === "lower" || field === "socks";
}

function isWardrobeManagedField(
  field: EditableAvatarField,
): field is WardrobeField {
  return (
    field === "accessory" ||
    field === "upper" ||
    field === "lower" ||
    field === "socks"
  );
}

interface AvatarStudioProps {
  canManageWardrobe?: boolean;
}

export function AvatarStudio({
  canManageWardrobe = false,
}: AvatarStudioProps = {}) {
  const sanctuary = useSanctuaryStore();
  const profile = getRenderableCurrentProfile(sanctuary);
  const avatar = profile.avatar;
  const isAnonymous = sanctuary.sessionState === "anonymous";
  const [activeField, setActiveField] = useState<EditableAvatarField>("sex");
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [wardrobeConfig, setWardrobeConfig] = useState<WardrobeConfig>(() =>
    loadWardrobeConfig(),
  );
  const [customCatalog, setCustomCatalog] = useState<CustomWardrobeCatalog>(
    () => loadCustomWardrobeCatalog(),
  );
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);
  const [wardrobeError, setWardrobeError] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wardrobeManaged = isWardrobeManagedField(activeField);
  const totalFocusSeconds = stats?.totalFocusSeconds ?? 0;
  const currentOptions = useMemo(() => {
    if (!wardrobeManaged) {
      return avatarOptions[activeField];
    }

    return listVisibleWardrobeOptionsByField(
      activeField,
      totalFocusSeconds,
      wardrobeConfig,
      customCatalog,
    );
  }, [
    activeField,
    customCatalog,
    totalFocusSeconds,
    wardrobeConfig,
    wardrobeManaged,
  ]);

  const activeColorField = isGarmentField(activeField)
    ? garmentColorFieldByField[activeField]
    : null;
  const colorOptions = activeColorField ? avatarOptions[activeColorField] : [];

  useGsapReveal(rootRef);

  useEffect(() => {
    let cancelled = false;

    async function syncWardrobe() {
      if (!wardrobeManaged || isAnonymous) {
        return;
      }

      setLoadingWardrobe(true);
      setWardrobeError(false);

      try {
        const config = await syncWardrobeConfigFromServer();
        if (!cancelled) {
          setWardrobeConfig(config);
        }
      } catch {
        if (!cancelled) {
          const fallbackConfig = loadWardrobeConfig();
          setWardrobeConfig(fallbackConfig);
          setWardrobeError(!hasCachedWardrobeConfig());
        }
      } finally {
        if (!cancelled) {
          setLoadingWardrobe(false);
        }
      }
    }

    const syncFromCache = () => {
      setWardrobeConfig(loadWardrobeConfig());
    };

    void syncWardrobe();
    window.addEventListener("focus", syncFromCache);
    window.addEventListener(WARDROBE_CONFIG_EVENT, syncFromCache);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", syncFromCache);
      window.removeEventListener(WARDROBE_CONFIG_EVENT, syncFromCache);
    };
  }, [isAnonymous, wardrobeManaged]);

  useEffect(() => {
    let cancelled = false;

    const syncFromCache = () => {
      setCustomCatalog(loadCustomWardrobeCatalog());
    };

    async function syncCatalog() {
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

    void syncCatalog();
    window.addEventListener("focus", syncCatalog);
    window.addEventListener(CUSTOM_WARDROBE_CATALOG_EVENT, syncFromCache);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", syncCatalog);
      window.removeEventListener(CUSTOM_WARDROBE_CATALOG_EVENT, syncFromCache);
    };
  }, []);

  useEffect(() => {
    if (isAnonymous || !wardrobeManaged) {
      return;
    }

    let cancelled = false;

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
          setStats({ totalFocusSeconds: 0 });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAnonymous, wardrobeManaged]);

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

  return (
    <div
      ref={rootRef}
      className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)] 2xl:grid-cols-[17rem_minmax(0,1fr)]"
    >
      <aside className="gsap-rise self-start border border-outline-variant bg-[linear-gradient(180deg,#1f1714_0%,#16100e_100%)] p-4 xl:sticky xl:top-28">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.26em] text-outline">
          Refinar avatar
        </p>
        <div className="mt-4 space-y-2">
          {fieldOrder.map((field) => {
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
                {isWardrobeManagedField(field) ? (
                  <span className="text-[10px] uppercase tracking-[0.18em] text-outline">
                    Armario
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="space-y-6">
        {isAnonymous ? (
          <div className="gsap-rise border border-outline-variant bg-surface-container-low px-5 py-4">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.26em] text-outline">
              Avatar bloqueado
            </p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Puedes inspeccionar el editor, pero necesitas iniciar sesión
                para guardar cambios en tu avatar.
              </p>
              <a
                href="/api/auth/login"
                className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 font-headline text-xs font-bold uppercase tracking-[0.2em] text-on-primary"
              >
                Iniciar sesión
              </a>
            </div>
          </div>
        ) : null}

        <div className="gsap-rise grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="relative overflow-hidden border border-outline-variant bg-[radial-gradient(circle_at_50%_18%,rgba(255,192,108,0.14),transparent_36%),linear-gradient(180deg,#1f1713_0%,#15100d_100%)] px-6 py-8 sm:px-8">
            <div className="absolute left-1/2 top-16 h-44 w-44 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative flex min-h-[35rem] flex-col">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.26em] text-outline">
                  Vista previa
                </p>
                <h1 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight text-on-surface">
                  Refinar avatar
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-on-surface-variant">
                  La vista grande refleja al momento cualquier cambio que hagas
                  en tu avatar.
                </p>
              </div>

              <div className="mt-6 flex flex-1 items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute bottom-6 h-16 w-28 rounded-full bg-black/18 blur-2xl" />
                  <div className="scale-[1.34] sm:scale-[1.5]">
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
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="gsap-rise border border-outline-variant bg-surface-container p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant pb-4">
                <div>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                    Catálogo activo
                  </p>
                  <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-primary">
                    {fieldLabels[activeField]}
                  </h2>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                    {loadingWardrobe && wardrobeManaged ? (
                      <Spinner label="Sincronizando…" size="sm" />
                    ) : (
                      `${currentOptions.length} opciones`
                    )}
                  </p>
                  {wardrobeManaged ? (
                    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                      {formatWardrobeDuration(totalFocusSeconds)} de estudio
                      real
                    </p>
                  ) : null}
                </div>
              </div>

              {wardrobeManaged ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-outline-variant bg-surface-container-low px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                    Armario global activo
                  </span>
                  {canManageWardrobe ? (
                    <a
                      href="/editor-armario"
                      className="border border-outline-variant bg-surface-container-low px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface hover:border-secondary hover:text-secondary"
                    >
                      Editar armario global
                    </a>
                  ) : null}
                </div>
              ) : null}

              {currentOptions.length === 0 ? (
                <div className="mt-5 border border-outline-variant bg-surface-container-low px-4 py-5 text-sm leading-relaxed text-on-surface-variant">
                  No hay elementos visibles en esta categoría. Revísalo en el
                  editor del armario si quieres volver a activarlos.
                </div>
              ) : (
                <div className="mt-5 grid max-h-[42rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {currentOptions.map((option) => {
                    const active = avatar[activeField] === option.value;
                    const unlocked = wardrobeManaged
                      ? isWardrobeItemUnlocked(
                          activeField,
                          option.value as AvatarConfig[typeof activeField],
                          totalFocusSeconds,
                          wardrobeConfig,
                        )
                      : true;
                    const requiredLevel = wardrobeManaged
                      ? getWardrobeRequirementLevel(
                          activeField,
                          option.value as AvatarConfig[typeof activeField],
                          wardrobeConfig,
                        )
                      : 1;
                    const disabled =
                      isAnonymous || (wardrobeManaged && !unlocked);

                    const optionColors =
                      activeColorField && isGarmentField(activeField)
                        ? (() => {
                            const garmentField = activeField;
                            const garmentValue =
                              option.value as AvatarConfig[typeof garmentField];

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
                          if (disabled) {
                            return;
                          }
                          const typedValue =
                            option.value as AvatarConfig[typeof activeField];
                          sanctuaryActions.updateAvatar(
                            activeField,
                            typedValue,
                          );
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
                          if (disabled) {
                            return;
                          }
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            const typedValue =
                              option.value as AvatarConfig[typeof activeField];
                            sanctuaryActions.updateAvatar(
                              activeField,
                              typedValue,
                            );
                            if (
                              activeColorField &&
                              isGarmentField(activeField)
                            ) {
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
                        tabIndex={disabled ? -1 : 0}
                        className={`relative overflow-hidden border p-3 text-left transition ${
                          active && unlocked
                            ? "border-primary bg-primary/10"
                            : unlocked
                              ? "border-outline-variant bg-surface-container-low hover:border-secondary"
                              : "border-outline-variant/60 bg-surface-container-low/60 opacity-85"
                        } ${disabled ? "cursor-not-allowed" : ""}`}
                      >
                        {wardrobeManaged && !unlocked ? (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[linear-gradient(180deg,rgba(16,12,11,0.14),rgba(16,12,11,0.8))] px-4 text-center">
                            <LockKeyhole size={18} className="text-primary" />
                            <p className="font-headline text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                              Bloqueada
                            </p>
                            <p className="text-xs leading-relaxed text-on-surface">
                              Se abre en el nivel {requiredLevel}.
                            </p>
                          </div>
                        ) : null}

                        <div
                          className={
                            wardrobeManaged && !unlocked ? "blur-[1px]" : ""
                          }
                        >
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
                                  avatar[activeColorField] ===
                                  colorOption.value;

                                return (
                                  <button
                                    key={colorOption.value}
                                    type="button"
                                    title={colorOption.label}
                                    aria-label={colorOption.label}
                                    onClick={(event) => {
                                      if (disabled) {
                                        return;
                                      }
                                      event.stopPropagation();
                                      sanctuaryActions.updateAvatar(
                                        activeField,
                                        option.value as AvatarConfig[typeof activeField],
                                      );
                                      sanctuaryActions.updateAvatar(
                                        activeColorField,
                                        colorOption.value as AvatarConfig[typeof activeColorField],
                                      );
                                    }}
                                    disabled={disabled}
                                    className={`h-4 w-4 rounded-full border transition ${
                                      selectedColor && active
                                        ? "scale-110 border-primary ring-2 ring-primary/40"
                                        : "border-outline-variant hover:scale-105 hover:border-secondary"
                                    }`}
                                    style={{
                                      backgroundColor:
                                        garmentColorMeta[colorOption.value]
                                          .swatch,
                                    }}
                                  />
                                );
                              })}
                            </div>
                          ) : null}

                          <p className="mt-3 font-headline text-[11px] font-black uppercase tracking-[0.16em] text-on-surface">
                            {option.label}
                          </p>
                          {wardrobeManaged ? (
                            <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                              {unlocked
                                ? `Disponible desde el nivel ${requiredLevel}.`
                                : `Se desbloquea al nivel ${requiredLevel}.`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {wardrobeError ? (
              <ErrorBlock
                message="No se pudo cargar la configuración global del armario."
                onRetry={() => window.location.reload()}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
