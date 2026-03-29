import { BookOpen, Castle, Sparkles, Users } from "lucide-react";
import {
  getCurrentProfileSummary,
  getCurrentRoom,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";

export function HubPulsePanel() {
  const sanctuary = useSanctuaryStore();
  const summary = getCurrentProfileSummary(sanctuary);
  const activeRoom = getCurrentRoom(sanctuary);

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <div className="relative overflow-hidden bg-surface-container-highest pixel-border">
          <div className="absolute inset-0 dither-bg opacity-15" />
          <div className="relative flex h-full flex-col gap-6 p-8 md:flex-row md:items-center">
            <div className="shrink-0">
              <PixelAvatar
                avatar={summary.profile.avatar}
                state="idle"
                size="lg"
                highlighted={true}
              />
            </div>
            <div className="flex-1">
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                Pulso real del archivo
              </p>
              <h2 className="mt-2 font-headline text-3xl font-black uppercase tracking-tighter text-on-surface">
                {summary.profile.displayName}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                {sanctuary.sessionState === "anonymous"
                  ? "Estás viendo el santuario en solo lectura. Inicia sesión para activar presencia, archivo y progreso sincronizado."
                  : `Tu sala social activa es ${activeRoom?.name ?? "la biblioteca compartida"}. El archivo ya está registrando sesiones y hitos reales.`}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="border-l-4 border-primary bg-surface-container-low px-4 py-3">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                    Sesiones
                  </p>
                  <p className="mt-2 font-headline text-2xl font-black text-primary">
                    {summary.sessionsCount}
                  </p>
                </div>
                <div className="border-l-4 border-tertiary bg-surface-container-low px-4 py-3">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                    Horas de foco
                  </p>
                  <p className="mt-2 font-headline text-2xl font-black text-tertiary">
                    {summary.focusHours} h
                  </p>
                </div>
                <div className="border-l-4 border-secondary bg-surface-container-low px-4 py-3">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                    Racha visible
                  </p>
                  <p className="mt-2 font-headline text-2xl font-black text-secondary">
                    {summary.streakDays} días
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="xl:col-span-5">
        <div className="grid h-full gap-4">
          <a
            href="/estudio"
            className="bg-surface-container-low pixel-border p-5 transition hover:bg-surface-container"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Ruta privada
                </p>
                <h3 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-primary">
                  Santuario silencioso
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Pomodoro individual y avatar personal en una sala privada.
                </p>
              </div>
              <Castle size={20} className="text-primary" />
            </div>
          </a>

          <a
            href="/biblioteca-compartida"
            className="bg-surface-container-low pixel-border p-5 transition hover:bg-surface-container"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Ruta social
                </p>
                <h3 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-tertiary">
                  Biblioteca compartida
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Sala pública, salas privadas e invitaciones a tu círculo.
                </p>
              </div>
              <Users size={20} className="text-tertiary" />
            </div>
          </a>

          <a
            href="/cronicas"
            className="bg-surface-container-low pixel-border p-5 transition hover:bg-surface-container"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Archivo
                </p>
                <h3 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-secondary">
                  Crónicas e hitos
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {summary.latestChronicle
                    ? summary.latestChronicle.title
                    : "Todavía no hay entradas; la primera sesión real abrirá el archivo."}
                </p>
              </div>
              {summary.latestChronicle ? (
                <BookOpen size={20} className="text-secondary" />
              ) : (
                <Sparkles size={20} className="text-secondary" />
              )}
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
