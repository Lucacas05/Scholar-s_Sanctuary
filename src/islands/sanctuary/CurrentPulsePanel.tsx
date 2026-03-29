import { LockKeyhole, Sparkles } from "lucide-react";
import {
  getCurrentProfileSummary,
  getCurrentRoom,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import { useRef } from "react";

function getPulseBadge(summary: ReturnType<typeof getCurrentProfileSummary>) {
  if (summary.streakDays > 0) {
    return `Racha de ${summary.streakDays} día${summary.streakDays === 1 ? "" : "s"}`;
  }

  if (summary.sessionsCount > 0) {
    return "Archivo en marcha";
  }

  return "Primeras páginas";
}

function getPulseSubtitle(
  latestChronicle: ReturnType<
    typeof getCurrentProfileSummary
  >["latestChronicle"],
  roomName: string | null,
) {
  if (latestChronicle) {
    return latestChronicle.title;
  }

  if (roomName) {
    return `Activo en ${roomName}`;
  }

  return "Tu archivo se escribirá con la primera sesión real.";
}

export function CurrentPulsePanel() {
  const sanctuary = useSanctuaryStore();
  const summary = getCurrentProfileSummary(sanctuary);
  const activeRoom = getCurrentRoom(sanctuary);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isAnonymous = sanctuary.sessionState === "anonymous";

  useGsapReveal(rootRef);

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden bg-surface-container-highest pixel-border"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,185,97,0.18),transparent_18%),radial-gradient(circle_at_74%_76%,rgba(173,208,168,0.12),transparent_18%)]" />

      <div
        className={[
          "relative flex flex-col gap-8 p-8 md:flex-row md:items-center",
          isAnonymous ? "blur-[5px]" : "",
        ].join(" ")}
      >
        <div className="flex justify-center md:block">
          <div className="relative flex h-48 w-48 items-center justify-center border-4 border-surface-container-highest bg-surface pixel-border-inset">
            <PixelAvatar
              avatar={summary.profile.avatar}
              size="lg"
              highlighted={!isAnonymous}
            />
            <div className="absolute -bottom-4 bg-primary px-3 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-on-primary bezel-button">
              {getPulseBadge(summary)}
            </div>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h2 className="gsap-rise mb-3 font-headline text-3xl font-black uppercase tracking-tighter text-tertiary">
            Pulso personal
          </h2>
          <h3 className="gsap-rise mb-2 font-headline text-4xl font-black uppercase tracking-tighter text-on-surface">
            {summary.profile.displayName}
          </h3>
          <p className="gsap-rise mb-4 font-headline text-sm font-bold uppercase tracking-widest text-outline">
            {getPulseSubtitle(
              summary.latestChronicle,
              activeRoom?.name ?? null,
            )}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="gsap-rise border-b-4 border-primary bg-surface-container-low p-4">
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">
                Sesiones
              </p>
              <p className="text-2xl font-headline font-black text-primary">
                {summary.sessionsCount}
              </p>
            </div>
            <div className="gsap-rise border-b-4 border-tertiary bg-surface-container-low p-4">
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">
                Horas de foco
              </p>
              <p className="text-2xl font-headline font-black text-tertiary">
                {summary.focusHours} h
              </p>
            </div>
            <div className="gsap-rise border-b-4 border-secondary bg-surface-container-low p-4">
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">
                Días activos
              </p>
              <p className="text-2xl font-headline font-black text-secondary">
                {summary.archiveDays}
              </p>
            </div>
            <div className="gsap-rise border-b-4 border-primary bg-surface-container-low p-4">
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">
                Hitos abiertos
              </p>
              <p className="text-2xl font-headline font-black text-primary">
                {summary.achievementsCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isAnonymous && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/45 backdrop-blur-[2px]">
          <div className="mx-6 max-w-md border-2 border-outline-variant bg-surface-container px-6 py-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border-2 border-primary bg-surface-container-low">
              <LockKeyhole size={18} className="text-primary" />
            </div>
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Pulso personal
            </p>
            <h3 className="mt-2 font-headline text-2xl font-black uppercase tracking-tight text-on-surface">
              Inicia sesión para verlo
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              Tu progreso, tus hitos y tu archivo personal aparecerán aquí
              cuando conectes tu cuenta.
            </p>
            <a
              href="/api/auth/login"
              className="mt-5 inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
            >
              <Sparkles size={16} />
              Iniciar sesión
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
