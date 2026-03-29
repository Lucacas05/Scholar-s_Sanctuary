import { useEffect, useMemo, useRef, useState } from "react";
import { LockKeyhole, Shirt, Sparkles } from "lucide-react";
import {
  avatarOptions,
  getRenderableCurrentProfile,
  garmentColorMeta,
  sanctuaryActions,
  useSanctuaryStore,
  type AvatarConfig,
} from "@/lib/sanctuary/store";
import { ErrorBlock } from "@/islands/sanctuary/ErrorBlock";
import { ItemModelPreview } from "@/islands/sanctuary/ItemModelPreview";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import {
  WARDROBE_CONFIG_EVENT,
  formatWardrobeDuration,
  getWardrobeRequirementLevel,
  isWardrobeItemUnlocked,
  listVisibleWardrobeRulesByField,
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

export function AvatarStudio() {
  const sanctuary = useSanctuaryStore();
  const profile = getRenderableCurrentProfile(sanctuary);
  const avatar = profile.avatar;
  const isAnonymous = sanctuary.sessionState === "anonymous";
  const [activeField, setActiveField] = useState<EditableAvatarField>("sex");
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [wardrobeConfig, setWardrobeConfig] = useState<WardrobeConfig>(() =>
    loadWardrobeConfig(),
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

    const visibleValues = new Set(
      listVisibleWardrobeRulesByField(activeField, wardrobeConfig).map(
        (rule) => rule.value,
      ),
    );

    return avatarOptions[activeField].filter((option) =>
      visibleValues.has(option.value as AvatarConfig[typeof activeField]),
    );
  }, [activeField, wardrobeConfig, wardrobeManaged]);

  const activeColorField = isGarmentField(activeField)
    ? garmentColorFieldByField[activeField]
    : null;
  const colorOptions = activeColorField ? avatarOptions[activeColorField] : [];
  const activeRequirementLevel = wardrobeManaged
    ? getWardrobeRequirementLevel(
        activeField,
        avatar[activeField] as AvatarConfig[typeof activeField],
        wardrobeConfig,
      )
    : null;
  const activeUnlocked = wardrobeManaged
    ? isWardrobeItemUnlocked(
        activeField,
        avatar[activeField] as AvatarConfig[typeof activeField],
        totalFocusSeconds,
        wardrobeConfig,
      )
    : true;

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
          setWardrobeError(true);
          setWardrobeConfig(loadWardrobeConfig());
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

        <div className="gsap-rise grid gap-6 xl:grid-cols-[minmax(0,1.14fr)_minmax(18rem,0.7fr)]">
          <div className="relative overflow-hidden border border-outline-variant bg-[radial-gradient(circle_at_50%_16%,rgba(255,193,112,0.18),transparent_34%),linear-gradient(180deg,#221915_0%,#17100e_58%,#120c0a_100%)] px-6 py-8 sm:px-8">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(180deg,rgba(255,255,255,0.018) 1px,transparent 1px)] bg-[size:28px_28px] opacity-35" />
            <div className="absolute left-1/2 top-14 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/14 blur-3xl" />
            <div className="absolute inset-x-[13%] bottom-7 h-24 rounded-[2rem] border border-primary/16 bg-[linear-gradient(180deg,rgba(255,190,110,0.08),rgba(20,15,13,0.12))]" />

            <div className="relative flex min-h-[35rem] flex-col">
              <div>
                <div>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.26em] text-outline">
                    Vista previa
                  </p>
                  <h1 className="mt-2 font-headline text-3xl font-black uppercase tracking-tight text-on-surface">
                    Refinar avatar
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant">
                    La vista grande refleja al momento cualquier cambio que
                    hagas en tu avatar.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-1 items-center justify-center">
                <div className="scale-[1.3] sm:scale-[1.42]">
                  <PixelAvatar
                    avatar={avatar}
                    size="xxl"
                    highlighted={true}
                    showStatusBadge={false}
                    stage="panel"
                    anchor="bottom"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {activeColorField ? (
              <div className="gsap-rise border border-outline-variant bg-surface-container p-4">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                  Colores rápidos
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Cuando la prenda está abierta, el color se cambia desde aquí o
                  desde los puntos de color del catálogo.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {colorOptions.map((colorOption) => {
                    const selectedColor =
                      avatar[activeColorField] === colorOption.value;
                    const disabled = isAnonymous || !activeUnlocked;

                    return (
                      <button
                        key={colorOption.value}
                        type="button"
                        title={colorOption.label}
                        aria-label={colorOption.label}
                        onClick={() =>
                          sanctuaryActions.updateAvatar(
                            activeColorField,
                            colorOption.value as AvatarConfig[typeof activeColorField],
                          )
                        }
                        disabled={disabled}
                        className={`flex items-center gap-2 border px-2 py-2 text-left ${
                          selectedColor
                            ? "border-primary bg-primary/10"
                            : "border-outline-variant bg-surface-container-low hover:border-secondary"
                        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-outline-variant"
                          style={{
                            backgroundColor:
                              garmentColorMeta[colorOption.value].swatch,
                          }}
                        />
                        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface">
                          {colorOption.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {wardrobeManaged && !activeUnlocked ? (
                  <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
                    El color no se puede cambiar hasta desbloquear esta prenda
                    en el nivel {activeRequirementLevel}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {wardrobeManaged ? (
              <>
                <div className="gsap-rise grid gap-4 sm:grid-cols-2">
                  <article className="border border-outline-variant bg-surface-container p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Shirt size={16} />
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                        Catálogo visible
                      </p>
                    </div>
                    <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                      {currentOptions.length}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                      Esta vista respeta lo publicado en el armario global de la
                      VPS.
                    </p>
                  </article>

                  <article className="border border-outline-variant bg-surface-container p-4">
                    <div className="flex items-center gap-2 text-tertiary">
                      <Sparkles size={16} />
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em]">
                        Progreso
                      </p>
                    </div>
                    <p className="mt-3 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                      {formatWardrobeDuration(totalFocusSeconds)}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                      El bloqueo se calcula con tu estudio real acumulado.
                    </p>
                  </article>
                </div>

                <div className="gsap-rise border border-outline-variant bg-surface-container p-4">
                  <div className="flex items-start gap-3">
                    <LockKeyhole
                      size={18}
                      className="mt-0.5 shrink-0 text-tertiary"
                    />
                    <div>
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                        Modo coherente con armario
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                        Si ocultas una prenda en el editor del armario, ya no
                        vuelve a salir aquí. Si sigue visible, verás el candado
                        hasta alcanzar el nivel requerido.
                      </p>
                      <a
                        href="/editor-armario"
                        className="mt-3 inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface hover:border-secondary hover:text-secondary"
                      >
                        Editar armario global
                      </a>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {wardrobeError ? (
              <ErrorBlock
                message="No se pudo cargar la configuración global del armario."
                onRetry={() => window.location.reload()}
              />
            ) : null}
          </div>
        </div>

        <div className="gsap-rise border border-outline-variant bg-surface-container p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
            <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-primary">
              {fieldLabels[activeField]}
            </h2>
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              {loadingWardrobe && wardrobeManaged
                ? "Sincronizando..."
                : `${currentOptions.length} opciones`}
            </p>
          </div>

          {currentOptions.length === 0 ? (
            <div className="border border-outline-variant bg-surface-container-low px-4 py-5 text-sm leading-relaxed text-on-surface-variant">
              No hay elementos visibles en esta categoría. Revísalo en el editor
              del armario si quieres volver a activarlos.
            </div>
          ) : (
            <div className="grid max-h-[40rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                const disabled = isAnonymous || (wardrobeManaged && !unlocked);

                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      if (disabled) {
                        return;
                      }
                      sanctuaryActions.updateAvatar(
                        activeField,
                        option.value as AvatarConfig[typeof activeField],
                      );
                    }}
                    onKeyDown={(event) => {
                      if (disabled) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        sanctuaryActions.updateAvatar(
                          activeField,
                          option.value as AvatarConfig[typeof activeField],
                        );
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
                          {colorOptions.map((colorOption) => {
                            const selectedColor =
                              avatar[activeColorField] === colorOption.value;

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
      </section>
    </div>
  );
}
