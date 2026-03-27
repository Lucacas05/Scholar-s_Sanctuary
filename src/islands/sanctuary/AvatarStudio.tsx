import { useMemo, useRef, useState } from "react";
import { Palette, Sparkles, WandSparkles } from "lucide-react";
import {
  avatarOptions,
  sanctuaryActions,
  useSanctuaryStore,
  type AvatarConfig,
} from "@/lib/sanctuary/store";
import { ItemModelPreview } from "@/islands/sanctuary/ItemModelPreview";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";

type AvatarField = keyof AvatarConfig;

const fieldLabels: Record<AvatarField, string> = {
  base: "Base",
  skinTone: "Piel",
  hairStyle: "Peinado",
  hairColor: "Color",
  facialHair: "Bigote",
  outfit: "Vestuario",
  accessory: "Objeto",
  expression: "Rostro",
};

const fieldCaptions: Record<AvatarField, string> = {
  base: "Escoge la silueta con la que quieres entrar en sala.",
  skinTone: "Ajusta el tono general antes de tocar detalles finos.",
  hairStyle: "Define la caída del pelo y la lectura del rostro.",
  hairColor: "El matiz del pelo cambia toda la presencia del personaje.",
  facialHair: "Pulsa el carácter con un gesto mínimo o limpio.",
  outfit: "El vestuario marca el rol visual dentro del santuario.",
  accessory: "Añade un objeto que cuente algo del ritual de estudio.",
  expression: "Afina la mirada con una actitud más serena o más viva.",
};

const fieldOrder: AvatarField[] = [
  "base",
  "skinTone",
  "hairStyle",
  "hairColor",
  "facialHair",
  "outfit",
  "accessory",
  "expression",
];

const atelierTags: Array<{ title: string; value: AvatarField }> = [
  { title: "Rostro", value: "expression" },
  { title: "Vestuario", value: "outfit" },
  { title: "Objeto", value: "accessory" },
];

export function AvatarStudio() {
  const sanctuary = useSanctuaryStore();
  const [activeField, setActiveField] = useState<AvatarField>("outfit");
  const currentOptions = useMemo(() => avatarOptions[activeField], [activeField]);
  const profile =
    sanctuary.profiles[sanctuary.currentUserId] ?? sanctuary.profiles["guest-current"];
  const avatar = profile.avatar;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeOption = currentOptions.find((option) => option.value === avatar[activeField]);

  useGsapReveal(rootRef);

  return (
    <div ref={rootRef} className="space-y-6">
      <section className="gsap-rise overflow-hidden bg-[linear-gradient(135deg,#221916_0%,#1a1311_48%,#17110f_100%)] pixel-border">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,24rem)] lg:px-8 lg:py-7">
          <div className="relative overflow-hidden border border-primary/18 bg-[radial-gradient(circle_at_18%_16%,rgba(255,190,110,0.18),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(26,18,16,0.76))] p-6">
            <div className="absolute right-[-3.5rem] top-[-4rem] h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.28em] text-outline">
              Taller del personaje
            </p>
            <h1 className="mt-3 max-w-xl font-headline text-3xl font-black uppercase tracking-tight text-primary sm:text-[2.6rem]">
              Refina la presencia con assets reales del santuario
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
              La base ya no es una maqueta. Ahora puedes vestir el personaje con cuerpo, ropa y
              pelo modular de pixel art para dejar preparado el perfil antes de entrar en la
              biblioteca social.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {atelierTags.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => setActiveField(tag.value)}
                  className={`border px-3 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.22em] transition ${
                    activeField === tag.value
                      ? "border-primary bg-primary/14 text-primary"
                      : "border-outline-variant bg-surface-container-low text-on-surface"
                  }`}
                >
                  {tag.title}: {avatar[tag.value]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="gsap-rise border border-outline-variant bg-surface-container px-4 py-4">
              <div className="flex items-center gap-3">
                <Sparkles className="text-primary" size={18} />
                <div>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                    Perfil actual
                  </p>
                  <p className="font-headline text-lg font-black uppercase tracking-tight text-on-surface">
                    {profile.displayName}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {fieldCaptions[activeField]}
              </p>
            </div>

            <div className="gsap-rise border border-outline-variant bg-surface-container px-4 py-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                Selección activa
              </p>
              <p className="mt-3 font-headline text-xl font-black uppercase tracking-tight text-primary">
                {fieldLabels[activeField]}
              </p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                {activeOption?.description ?? "Ajuste listo para edición."}
              </p>
            </div>

            <div className="gsap-rise border border-outline-variant bg-surface-container px-4 py-4">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                Vista modular
              </p>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Cada tarjeta enseña cómo cambia el personaje antes de guardar nada. No estás
                eligiendo a ciegas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)_minmax(21rem,25rem)]">
        <aside className="space-y-4">
          <div className="gsap-rise border border-outline-variant bg-surface-container p-3">
            {fieldOrder.map((field) => {
              const active = activeField === field;
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => setActiveField(field)}
                  className={`mb-2 flex w-full items-center justify-between gap-3 border-l-4 px-4 py-3 text-left transition last:mb-0 ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent bg-surface-container-low text-on-surface hover:border-secondary hover:text-secondary"
                  }`}
                >
                  <span className="font-headline text-sm font-black uppercase tracking-widest">
                    {fieldLabels[field]}
                  </span>
                  <span className="text-right font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                    {avatar[field]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="gsap-rise border border-outline-variant bg-surface-container-low p-4">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
              Rastro actual
            </p>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <div className="flex items-center justify-between gap-3">
                <span className="font-headline text-[11px] font-bold uppercase tracking-[0.22em]">
                  Silueta
                </span>
                <span>{avatar.base}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-headline text-[11px] font-bold uppercase tracking-[0.22em]">
                  Pelo
                </span>
                <span>
                  {avatar.hairStyle} · {avatar.hairColor}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-headline text-[11px] font-bold uppercase tracking-[0.22em]">
                  Vestuario
                </span>
                <span>{avatar.outfit}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-headline text-[11px] font-bold uppercase tracking-[0.22em]">
                  Objeto
                </span>
                <span>{avatar.accessory}</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="gsap-rise relative overflow-hidden border border-primary/22 bg-[radial-gradient(circle_at_50%_16%,rgba(255,189,105,0.18),transparent_30%),linear-gradient(180deg,#211815_0%,#18110f_56%,#120c0a_100%)] px-6 py-7 sm:px-8 sm:py-9">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(180deg,rgba(255,255,255,0.015) 1px,transparent 1px)] bg-[size:28px_28px] opacity-40" />
            <div className="absolute inset-x-[15%] bottom-8 h-24 rounded-[2rem] border border-primary/18 bg-[linear-gradient(180deg,rgba(255,190,110,0.08),rgba(20,15,13,0.14))]" />
            <div className="absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />

            <div className="relative flex min-h-[34rem] flex-col items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 border border-primary/30 bg-secondary-container px-4 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.26em] text-primary-fixed">
                Escena principal
              </div>

              <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
                <div className="flex min-h-[30rem] items-center justify-center">
                  <div className="gsap-drift relative">
                    <div className="absolute inset-x-[18%] top-[8%] h-[28%] rounded-full bg-primary/10 blur-3xl" />
                    <PixelAvatar
                      avatar={avatar}
                      size="xl"
                      highlighted={true}
                      showStatusBadge={false}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="gsap-rise border border-outline-variant bg-surface-container/80 p-4">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                      Pieza en edición
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <Palette className="text-primary" size={18} />
                      <div>
                        <p className="font-headline text-lg font-black uppercase tracking-tight text-on-surface">
                          {fieldLabels[activeField]}
                        </p>
                        <p className="text-sm leading-6 text-on-surface-variant">
                          {avatar[activeField]}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="gsap-rise border border-outline-variant bg-surface-container/80 p-4">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                      Vista rápida
                    </p>
                    <div className="mt-4 flex justify-center">
                      <ItemModelPreview field={activeField} value={avatar[activeField]} avatar={avatar} />
                    </div>
                  </div>

                  <div className="gsap-rise border border-outline-variant bg-surface-container/80 p-4">
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                      Taller
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className="border-l-2 border-primary/70 pl-3">
                        <p className="font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                          {avatar.outfit}
                        </p>
                        <p className="text-sm text-on-surface-variant">Lectura visual principal.</p>
                      </div>
                      <div className="border-l-2 border-secondary/70 pl-3">
                        <p className="font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-secondary">
                          {avatar.expression}
                        </p>
                        <p className="text-sm text-on-surface-variant">Tono del rostro y la mirada.</p>
                      </div>
                      <div className="border-l-2 border-tertiary/70 pl-3">
                        <p className="font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-tertiary">
                          {avatar.accessory}
                        </p>
                        <p className="text-sm text-on-surface-variant">Gesto extra del ritual.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid w-full gap-3 sm:grid-cols-3">
                <div className="gsap-rise border-l-4 border-primary bg-surface-container px-4 py-3">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                    Tinte
                  </p>
                  <p className="mt-2 font-headline text-sm font-black uppercase tracking-tight text-primary">
                    {avatar.hairColor}
                  </p>
                </div>
                <div className="gsap-rise border-l-4 border-secondary bg-surface-container px-4 py-3">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                    Base
                  </p>
                  <p className="mt-2 font-headline text-sm font-black uppercase tracking-tight text-secondary">
                    {avatar.base}
                  </p>
                </div>
                <div className="gsap-rise border-l-4 border-tertiary bg-surface-container px-4 py-3">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                    Pulso
                  </p>
                  <p className="mt-2 font-headline text-sm font-black uppercase tracking-tight text-tertiary">
                    {avatar.expression}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="gsap-rise border border-outline-variant bg-surface-container p-5">
            <div className="mb-5 flex items-center gap-3">
              <WandSparkles size={18} className="text-primary" />
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-outline">
                  Catálogo activo
                </p>
                <h3 className="font-headline text-xl font-black uppercase tracking-tight text-on-surface">
                  {fieldLabels[activeField]}
                </h3>
              </div>
            </div>

            <div className="grid gap-3">
              {currentOptions.map((option) => {
                const active = avatar[activeField] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      sanctuaryActions.updateAvatar(
                        activeField,
                        option.value as AvatarConfig[typeof activeField],
                      )
                    }
                    className={`gsap-rise grid gap-4 border p-4 text-left transition sm:grid-cols-[6.25rem_minmax(0,1fr)] ${
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(255,185,97,0.22)]"
                        : "border-outline-variant bg-surface-container-low text-on-surface hover:border-secondary hover:text-secondary"
                    }`}
                  >
                    <ItemModelPreview field={activeField} value={option.value} avatar={avatar} />
                    <div className="min-w-0">
                      <p className="font-headline text-sm font-black uppercase tracking-tight">
                        {option.label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
