import { LockKeyhole, Sparkles } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { images, siteContent } from "@/data/site";
import { useSanctuaryStore } from "@/lib/sanctuary/store";

export function HubSocialSpaces() {
  const sanctuary = useSanctuaryStore();
  const { sharedLibrary, garden } = siteContent.dashboard.spaces;
  const isAnonymous = sanctuary.sessionState === "anonymous";
  const sharedCard = (
    <>
      <SafeImage
        src={images.silentWing}
        fallbackSrc="/site/placeholder-landscape.svg"
        alt={sharedLibrary.title}
        className={[
          "absolute inset-0 h-full w-full object-cover transition-transform duration-500",
          !isAnonymous ? "group-hover:scale-[1.03]" : "blur-[3px] scale-[1.02]",
        ].join(" ")}
        style={{ objectPosition: "center 46%" }}
        loading="lazy"
        decoding="async"
        width={512}
        height={512}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,18,16,0.92)_0%,rgba(24,18,16,0.86)_28%,rgba(24,18,16,0.38)_56%,rgba(24,18,16,0.18)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-black/10" />
      <div
        className={["absolute inset-0", isAnonymous ? "blur-[4px]" : ""].join(
          " ",
        )}
      >
        <div className="absolute left-4 top-4 bg-tertiary px-3 py-1 font-headline text-xs font-bold uppercase tracking-tighter text-on-tertiary">
          {sharedLibrary.badge}
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:max-w-[48%]">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full animate-pulse bg-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {sharedLibrary.status}
            </span>
          </div>
          <h3 className="font-headline text-2xl font-black uppercase tracking-tighter text-white">
            {sharedLibrary.title}
          </h3>
          <p className="mt-2 max-w-lg font-body text-sm text-on-surface-variant">
            {sharedLibrary.description}
          </p>
        </div>
      </div>
    </>
  );
  const gardenCard = (
    <>
      <SafeImage
        src={images.gardenTerrace}
        fallbackSrc="/site/placeholder-landscape.svg"
        className={[
          "h-full w-full object-cover transition-transform duration-500",
          isAnonymous ? "scale-[1.02] blur-[3px]" : "group-hover:scale-105",
        ].join(" ")}
        alt={garden.alt}
        loading="lazy"
        decoding="async"
        width={512}
        height={512}
      />
      <div
        className={["absolute inset-0", isAnonymous ? "blur-[4px]" : ""].join(
          " ",
        )}
      >
        <div className="absolute left-4 top-4 bg-primary px-3 py-1 font-headline text-xs font-bold uppercase tracking-tighter text-on-primary">
          {garden.badge}
        </div>
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-6">
          <h3 className="font-headline text-xl font-black uppercase tracking-tighter text-white">
            {garden.title}
          </h3>
          <p className="mt-2 font-body text-xs text-on-surface-variant">
            {garden.description}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="md:col-span-8">
        <div className="relative flex h-full overflow-hidden border-4 border-surface-container-highest bg-surface-container-high p-1 text-left">
          {isAnonymous ? (
            <div className="group relative flex min-h-[18rem] flex-1 overflow-hidden bg-surface-dim md:min-h-[28rem]">
              {sharedCard}

              <div className="absolute inset-0 flex items-center justify-center bg-surface/35 backdrop-blur-[2px]">
                <div className="mx-6 max-w-sm border-2 border-outline-variant bg-surface-container px-5 py-4 text-center shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center border-2 border-primary bg-surface-container-low">
                    <LockKeyhole size={16} className="text-primary" />
                  </div>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                    Biblioteca compartida
                  </p>
                  <h3 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-on-surface">
                    Inicia sesión para entrar
                  </h3>
                  <a
                    href="/api/auth/login"
                    className="mt-4 inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-2 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
                  >
                    <Sparkles size={14} />
                    Iniciar sesión
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <a
              href={sharedLibrary.href}
              className="group relative flex min-h-[18rem] flex-1 overflow-hidden bg-surface-dim md:min-h-[28rem]"
            >
              {sharedCard}
            </a>
          )}
        </div>
      </div>

      <div className="md:col-span-4">
        <div className="relative flex h-full overflow-hidden border-4 border-surface-container-highest bg-surface-container-high p-1 text-left">
          {isAnonymous ? (
            <div className="group relative flex min-h-[18rem] flex-1 overflow-hidden bg-surface-dim md:min-h-[28rem]">
              {gardenCard}

              <div className="absolute inset-0 flex items-center justify-center bg-surface/35 backdrop-blur-[2px]">
                <div className="mx-6 max-w-sm border-2 border-outline-variant bg-surface-container px-5 py-4 text-center shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center border-2 border-primary bg-surface-container-low">
                    <LockKeyhole size={16} className="text-primary" />
                  </div>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                    Jardín de descanso
                  </p>
                  <h3 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-on-surface">
                    Inicia sesión para entrar
                  </h3>
                  <a
                    href="/api/auth/login"
                    className="mt-4 inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-2 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
                  >
                    <Sparkles size={14} />
                    Iniciar sesión
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <a
              href={garden.href}
              className="group relative flex min-h-[18rem] flex-1 overflow-hidden bg-surface-dim md:min-h-[28rem]"
            >
              {gardenCard}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
