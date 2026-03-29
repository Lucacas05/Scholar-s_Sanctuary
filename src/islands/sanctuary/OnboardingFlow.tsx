import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Castle,
  Check,
  Sparkles,
} from "lucide-react";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import {
  avatarOptions,
  getFullState,
  getRenderableCurrentProfile,
  sanctuaryActions,
  useSanctuaryStore,
  type AvatarConfig,
  type PreferredStartPath,
  type RemoteAccountIdentity,
} from "@/lib/sanctuary/store";

interface OnboardingFlowProps {
  initialUser: RemoteAccountIdentity;
  nextPath: string | null;
}

type OnboardingStep = 0 | 1 | 2;

const ONBOARDING_STEPS = [
  {
    id: 0,
    eyebrow: "Paso 1",
    title: "Identidad del santuario",
    description:
      "Define cómo te verán dentro de Lumina antes de abrir el archivo.",
  },
  {
    id: 1,
    eyebrow: "Paso 2",
    title: "Objetivo y ruta inicial",
    description:
      "Deja claro tu foco actual y el ala a la que quieres entrar primero.",
  },
  {
    id: 2,
    eyebrow: "Paso 3",
    title: "Avatar inicial",
    description:
      "Elige un preset base y, si quieres, afina los rasgos principales del personaje.",
  },
] as const;

const starterPresets: Array<{
  id: string;
  label: string;
  description: string;
  avatar: AvatarConfig;
}> = [
  {
    id: "escriba-nocturno",
    label: "Escriba nocturno",
    description:
      "Sobrio, clásico y pensado para sesiones largas de biblioteca.",
    avatar: {
      sex: "masculino",
      skinTone: "sepia",
      hairStyle: "short-02-parted",
      hairColor: "brown",
      accessory: "ninguno",
      upper: "shirt-01-longsleeve",
      upperColor: "navy",
      lower: "pants-03-pants",
      lowerColor: "black",
      socks: "socks-02-high",
      socksColor: "ivory",
    },
  },
  {
    id: "vigia-dorado",
    label: "Vigía dorado",
    description:
      "Más luminoso, listo para entrar al lectorio compartido desde el primer día.",
    avatar: {
      sex: "masculino",
      skinTone: "peach",
      hairStyle: "short-05-natural",
      hairColor: "chestnut",
      accessory: "ninguno",
      upper: "shirt-04-tee",
      upperColor: "amber",
      lower: "pants-04-cuffed",
      lowerColor: "brown",
      socks: "socks-01-ankle",
      socksColor: "cream",
    },
  },
  {
    id: "cronista-del-alba",
    label: "Cronista del alba",
    description:
      "Una base más expresiva para empezar con un perfil fresco y visible.",
    avatar: {
      sex: "femenino",
      skinTone: "ivory",
      hairStyle: "medium-07-bob-side-part",
      hairColor: "ruby",
      accessory: "ninguno",
      upper: "shirt-02-vneck-longsleeve",
      upperColor: "plum",
      lower: "pants-02-leggings",
      lowerColor: "smoke",
      socks: "socks-02-high",
      socksColor: "white",
    },
  },
];

function matchesPreset(avatar: AvatarConfig, preset: AvatarConfig) {
  return (
    avatar.sex === preset.sex &&
    avatar.skinTone === preset.skinTone &&
    avatar.hairStyle === preset.hairStyle &&
    avatar.hairColor === preset.hairColor &&
    avatar.accessory === preset.accessory &&
    avatar.upper === preset.upper &&
    avatar.upperColor === preset.upperColor &&
    avatar.lower === preset.lower &&
    avatar.lowerColor === preset.lowerColor &&
    avatar.socks === preset.socks &&
    avatar.socksColor === preset.socksColor
  );
}

export function OnboardingFlow({ initialUser, nextPath }: OnboardingFlowProps) {
  const sanctuary = useSanctuaryStore();
  const profile = getRenderableCurrentProfile(sanctuary);
  const [displayName, setDisplayName] = useState(initialUser.displayName);
  const [goal, setGoal] = useState(sanctuary.onboardingGoal);
  const [preferredStartPath, setPreferredStartPath] =
    useState<PreferredStartPath>(sanctuary.preferredStartPath);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);

  useEffect(() => {
    if (sanctuary.currentUserId !== initialUser.id) {
      sanctuaryActions.connectGitHubAccount(initialUser);
    }
  }, [initialUser, sanctuary.currentUserId]);

  useEffect(() => {
    if (profile.id === initialUser.id) {
      setDisplayName(profile.displayName);
    }
  }, [initialUser.id, profile.displayName, profile.id]);

  const avatarPreview = useMemo(() => profile.avatar, [profile.avatar]);
  const currentStepMeta = ONBOARDING_STEPS[currentStep];
  const selectedPresetId = useMemo(() => {
    const preset = starterPresets.find((entry) =>
      matchesPreset(avatarPreview, entry.avatar),
    );
    return preset?.id ?? null;
  }, [avatarPreview]);

  function applyPreset(avatar: AvatarConfig) {
    sanctuaryActions.updateAvatar("sex", avatar.sex);
    sanctuaryActions.updateAvatar("skinTone", avatar.skinTone);
    sanctuaryActions.updateAvatar("hairStyle", avatar.hairStyle);
    sanctuaryActions.updateAvatar("hairColor", avatar.hairColor);
    sanctuaryActions.updateAvatar("accessory", avatar.accessory);
    sanctuaryActions.updateAvatar("upper", avatar.upper);
    sanctuaryActions.updateAvatar("upperColor", avatar.upperColor);
    sanctuaryActions.updateAvatar("lower", avatar.lower);
    sanctuaryActions.updateAvatar("lowerColor", avatar.lowerColor);
    sanctuaryActions.updateAvatar("socks", avatar.socks);
    sanctuaryActions.updateAvatar("socksColor", avatar.socksColor);
  }

  async function handleSubmit() {
    setIsSaving(true);

    sanctuaryActions.completeOnboarding({
      displayName,
      goal,
      preferredStartPath,
    });

    try {
      await fetch("/api/me", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state: getFullState() }),
      });
    } finally {
      window.location.assign(nextPath || preferredStartPath);
    }
  }

  const canContinue = currentStep !== 0 || displayName.trim().length > 0;
  const isLastStep = currentStep === 2;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="overflow-hidden bg-surface-container-low pixel-border">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 border-l-4 border-primary bg-secondary-container px-3 py-2">
              <Sparkles size={16} className="text-primary" />
              <span className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-primary-fixed">
                Bienvenida al archivo
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="font-headline text-4xl font-black uppercase tracking-tighter text-on-surface md:text-6xl">
                Prepara tu entrada en{" "}
                <span className="text-primary">Lumina</span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-on-surface-variant md:text-lg">
                Este acceso inicial queda guardado para que el santuario se abra
                siempre con tu identidad, tu objetivo actual y un avatar base
                coherente desde el primer día.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {ONBOARDING_STEPS.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id as OnboardingStep)}
                  className={`pixel-border p-4 text-left transition ${
                    currentStep === step.id
                      ? "border-primary bg-primary/10"
                      : "bg-surface-container"
                  }`}
                >
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                    {step.eyebrow}
                  </p>
                  <p className="mt-2 font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                    {step.title}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 bg-[radial-gradient(circle_at_top,rgba(255,190,110,0.18),transparent_55%)] pixel-border p-8">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                {currentStepMeta.eyebrow}
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                {currentStepMeta.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                {currentStepMeta.description}
              </p>
            </div>

            <div className="flex items-center justify-center">
              <PixelAvatar
                avatar={avatarPreview}
                size="xxl"
                state="idle"
                stage="plain"
                anchor="center"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-surface-container pixel-border p-4">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Cuenta conectada
                </p>
                <p className="mt-2 font-headline text-lg font-black uppercase tracking-tight text-on-surface">
                  @{initialUser.username}
                </p>
              </div>
              <div className="bg-surface-container pixel-border p-4">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Destino inicial
                </p>
                <p className="mt-2 font-headline text-lg font-black uppercase tracking-tight text-primary">
                  {preferredStartPath === "/estudio"
                    ? "Santuario silencioso"
                    : "Biblioteca compartida"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container pixel-border p-6 lg:p-8">
        {currentStep === 0 ? (
          <div className="space-y-6">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                Paso 1 de 3
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                Define tu nombre visible
              </h2>
            </div>

            <label className="block max-w-2xl space-y-2">
              <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                Nombre visible
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                placeholder="Cómo te verá el resto"
              />
            </label>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="space-y-6">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                Paso 2 de 3
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                Ajusta tu objetivo y la sala de entrada
              </h2>
            </div>

            <label className="block space-y-2">
              <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                Objetivo inicial
              </span>
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                rows={4}
                className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                placeholder="Ejemplo: estudiar 4 pomodoros al día sin romper la racha."
              />
            </label>

            <div className="space-y-3">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                Sala preferida al entrar
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPreferredStartPath("/estudio")}
                  className={`pixel-border p-4 text-left ${
                    preferredStartPath === "/estudio"
                      ? "bg-primary/15 border-primary"
                      : "bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-primary" />
                    <span className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                      Santuario silencioso
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                    Entrar directamente al foco individual.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPreferredStartPath("/biblioteca-compartida")
                  }
                  className={`pixel-border p-4 text-left ${
                    preferredStartPath === "/biblioteca-compartida"
                      ? "bg-primary/15 border-primary"
                      : "bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Castle size={16} className="text-primary" />
                    <span className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                      Biblioteca compartida
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                    Abrir antes la sala pública y tu círculo social.
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="space-y-6">
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                Paso 3 de 3
              </p>
              <h2 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
                Elige un preset de avatar inicial
              </h2>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {starterPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.avatar)}
                  className={`pixel-border flex flex-col gap-4 p-4 text-left ${
                    selectedPresetId === preset.id
                      ? "border-primary bg-primary/12"
                      : "bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                        {preset.label}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                        {preset.description}
                      </p>
                    </div>
                    {selectedPresetId === preset.id ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center border-2 border-primary bg-surface">
                        <Check size={16} className="text-primary" />
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-center bg-surface-container pixel-border p-4">
                    <PixelAvatar
                      avatar={preset.avatar}
                      size="lg"
                      state="idle"
                      stage="plain"
                      anchor="center"
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Sexo
                </span>
                <select
                  value={avatarPreview.sex}
                  onChange={(event) =>
                    sanctuaryActions.updateAvatar(
                      "sex",
                      event.target.value as typeof avatarPreview.sex,
                    )
                  }
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                >
                  {avatarOptions.sex.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Piel
                </span>
                <select
                  value={avatarPreview.skinTone}
                  onChange={(event) =>
                    sanctuaryActions.updateAvatar(
                      "skinTone",
                      event.target.value as typeof avatarPreview.skinTone,
                    )
                  }
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                >
                  {avatarOptions.skinTone.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Pelo
                </span>
                <select
                  value={avatarPreview.hairStyle}
                  onChange={(event) =>
                    sanctuaryActions.updateAvatar(
                      "hairStyle",
                      event.target.value as typeof avatarPreview.hairStyle,
                    )
                  }
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                >
                  {avatarOptions.hairStyle.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Color del pelo
                </span>
                <select
                  value={avatarPreview.hairColor}
                  onChange={(event) =>
                    sanctuaryActions.updateAvatar(
                      "hairColor",
                      event.target.value as typeof avatarPreview.hairColor,
                    )
                  }
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                >
                  {avatarOptions.hairColor.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Parte superior
                </span>
                <select
                  value={avatarPreview.upper}
                  onChange={(event) =>
                    sanctuaryActions.updateAvatar(
                      "upper",
                      event.target.value as typeof avatarPreview.upper,
                    )
                  }
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                >
                  {avatarOptions.upper.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Parte inferior
                </span>
                <select
                  value={avatarPreview.lower}
                  onChange={(event) =>
                    sanctuaryActions.updateAvatar(
                      "lower",
                      event.target.value as typeof avatarPreview.lower,
                    )
                  }
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                >
                  {avatarOptions.lower.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-4 border-surface-container-highest pt-6">
          <button
            type="button"
            onClick={() =>
              setCurrentStep((step) => Math.max(0, step - 1) as OnboardingStep)
            }
            disabled={currentStep === 0 || isSaving}
            className="inline-flex items-center justify-center gap-2 border-2 border-outline-variant bg-surface-container-low px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSaving || displayName.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowRight size={16} />
              {isSaving ? "Guardando..." : "Entrar al santuario"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setCurrentStep(
                  (step) => Math.min(2, step + 1) as OnboardingStep,
                )
              }
              disabled={!canContinue || isSaving}
              className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowRight size={16} />
              Continuar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
