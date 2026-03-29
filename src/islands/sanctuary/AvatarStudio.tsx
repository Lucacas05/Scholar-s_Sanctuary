import { useMemo, useRef, useState } from "react";
import {
  avatarOptions,
  getRenderableCurrentProfile,
  garmentColorMeta,
  sanctuaryActions,
  useSanctuaryStore,
  type AvatarConfig,
} from "@/lib/sanctuary/store";
import { ItemModelPreview } from "@/islands/sanctuary/ItemModelPreview";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";

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

export function AvatarStudio() {
  const sanctuary = useSanctuaryStore();
  const profile = getRenderableCurrentProfile(sanctuary);
  const avatar = profile.avatar;
  const isAnonymous = sanctuary.sessionState === "anonymous";
  const [activeField, setActiveField] = useState<EditableAvatarField>("sex");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const currentOptions = useMemo(
    () => avatarOptions[activeField],
    [activeField],
  );
  const activeColorField = isGarmentField(activeField)
    ? garmentColorFieldByField[activeField]
    : null;
  const colorOptions = activeColorField ? avatarOptions[activeColorField] : [];

  useGsapReveal(rootRef);

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

        <div className="gsap-rise border border-outline-variant bg-[radial-gradient(circle_at_50%_16%,rgba(255,193,112,0.12),transparent_38%),linear-gradient(180deg,#201714_0%,#17110f_100%)] px-6 py-8 sm:px-8">
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

        <div className="gsap-rise border border-outline-variant bg-surface-container p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
            <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-primary">
              {fieldLabels[activeField]}
            </h2>
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              {currentOptions.length} opciones
            </p>
          </div>

          <div className="grid max-h-[40rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {currentOptions.map((option) => {
              const active = avatar[activeField] === option.value;
              return (
                <div
                  key={option.value}
                  onClick={() => {
                    if (isAnonymous) {
                      return;
                    }
                    sanctuaryActions.updateAvatar(
                      activeField,
                      option.value as AvatarConfig[typeof activeField],
                    );
                  }}
                  onKeyDown={(event) => {
                    if (isAnonymous) {
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
                  tabIndex={isAnonymous ? -1 : 0}
                  className={`gsap-rise overflow-hidden border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-outline-variant bg-surface-container-low hover:border-secondary"
                  } ${isAnonymous ? "cursor-not-allowed opacity-70" : ""}`}
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
                              if (isAnonymous) {
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
                            disabled={isAnonymous}
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
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
