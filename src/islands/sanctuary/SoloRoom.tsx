import { useEffect, useRef } from "react";
import { BookOpen, ScrollText } from "lucide-react";
import {
  getCurrentPresence,
  getChroniclesForCurrentProfile,
  getCurrentProfileSummary,
  SOLO_ROOM_CODE,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
import { StudyTimer } from "@/islands/StudyTimer";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import { SanctuaryCanvasScene } from "@/islands/sanctuary/SanctuaryCanvasScene";
import type { SanctuaryCanvasHandle } from "@/lib/sanctuary/canvas/types";

interface SoloRoomProps {
  backgroundUrl: string;
}

export function SoloRoom({ backgroundUrl: _backgroundUrl }: SoloRoomProps) {
  const sanctuary = useSanctuaryStore();
  const summary = getCurrentProfileSummary(sanctuary);
  const chronicles = getChroniclesForCurrentProfile(sanctuary).slice(0, 3);
  const isAnonymous = sanctuary.sessionState === "anonymous";
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SanctuaryCanvasHandle | null>(null);
  const previousStateRef = useRef<string>("");
  const currentPresence = getCurrentPresence(sanctuary);

  useGsapReveal(rootRef);

  useEffect(() => {
    if (
      !currentPresence ||
      previousStateRef.current === currentPresence.state
    ) {
      return;
    }

    previousStateRef.current = currentPresence.state;
    const frame = window.requestAnimationFrame(() => {
      if (currentPresence.state === "studying") {
        void sceneRef.current?.iniciarFocus();
        return;
      }

      void sceneRef.current?.iniciarBreak();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentPresence]);

  return (
    <div
      ref={rootRef}
      className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,24rem)] 2xl:grid-cols-[minmax(0,1.8fr)_minmax(24rem,28rem)]"
    >
      <div className="space-y-8">
        {isAnonymous ? (
          <div className="gsap-rise bg-surface-container pixel-border p-5">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Sala en solo lectura
            </p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm leading-relaxed text-on-surface-variant">
                El santuario silencioso se puede recorrer sin sesión, pero el
                reloj y las crónicas se activan solo con cuenta conectada.
              </p>
              <a
                href="/api/auth/login"
                className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
              >
                Iniciar sesión
              </a>
            </div>
          </div>
        ) : null}

        <div className="gsap-rise">
          <SanctuaryCanvasScene
            ref={sceneRef}
            title="Santuario silencioso"
            subtitle="Un rincón privado con cámara top-down, mesa reservada y el reloj únicamente al servicio de tu propio ritmo."
            badge="Sala privada"
            sceneKind="solo-library"
            avatar={summary.profile.avatar}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="gsap-rise bg-surface-container-low pixel-border p-5">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Vigilias
            </p>
            <p className="mt-3 font-headline text-3xl font-black text-primary">
              {summary.sessionsCount}
            </p>
          </div>
          <div className="gsap-rise bg-surface-container-low pixel-border p-5">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Horas
            </p>
            <p className="mt-3 font-headline text-3xl font-black text-tertiary">
              {summary.focusHours} h
            </p>
          </div>
          <div className="gsap-rise bg-surface-container-low pixel-border p-5">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Días activos
            </p>
            <p className="mt-3 font-headline text-3xl font-black text-secondary">
              {summary.archiveDays}
            </p>
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="gsap-rise">
          <StudyTimer
            roomKind="solo"
            roomCode={SOLO_ROOM_CODE}
            roomName="Santuario silencioso"
          />
        </div>

        <div className="gsap-rise bg-secondary-container p-[4px]">
          <div className="bg-surface-container-low p-6">
            <div className="mb-4 flex items-center gap-3">
              <ScrollText size={18} className="text-primary" />
              <h3 className="font-headline text-lg font-black uppercase tracking-tight text-primary">
                Archivo reciente
              </h3>
            </div>
            {chronicles.length === 0 ? (
              <p className="text-sm leading-relaxed text-on-surface-variant">
                El primer cierre del reloj abrirá la primera entrada del
                santuario privado.
              </p>
            ) : (
              <div className="space-y-4">
                {chronicles.map((entry) => (
                  <div
                    key={entry.id}
                    className="border-l-2 border-primary pl-4"
                  >
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                      {new Date(entry.timestamp).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="mt-1 font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                      {entry.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                      {entry.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <a
          href="/refinar"
          className="gsap-rise inline-flex w-full items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
        >
          <BookOpen size={16} />
          Refinar avatar
        </a>
      </aside>
    </div>
  );
}
