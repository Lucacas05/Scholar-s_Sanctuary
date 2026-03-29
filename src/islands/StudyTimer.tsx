import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import {
  getCurrentTimer,
  sanctuaryActions,
  type RoomKind,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
import { useTimerNotifications } from "./useTimerNotifications";
import { TimerToastStack } from "./TimerToast";
import { NotificationSettings } from "./NotificationSettings";

interface StudyTimerProps {
  roomKind: RoomKind;
  roomCode: string;
  roomName: string;
  showGardenHint?: boolean;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function StudyTimer({ roomKind, roomCode, roomName, showGardenHint = false }: StudyTimerProps) {
  const sanctuary = useSanctuaryStore();
  const [now, setNow] = useState(Date.now());
  const [focusMinutes, setFocusMinutes] = useState("25");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const { toasts, dismissToast } = useTimerNotifications();

  useEffect(() => {
    sanctuaryActions.syncTimer();
    const interval = window.setInterval(() => {
      setNow(Date.now());
      sanctuaryActions.syncTimer();
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const timer = useMemo(() => getCurrentTimer(sanctuary, now), [sanctuary, now]);
  const boundToCurrentRoom = timer.roomKind === roomKind && timer.roomCode === roomCode;
  const isAnonymousBlocked = sanctuary.sessionState === "anonymous";
  const canEditDurations = !isAnonymousBlocked && timer.status !== "running";
  const phaseLabel = timer.phase === "break" ? "Descanso activo" : "Foco en curso";
  const hint =
    isAnonymousBlocked
      ? "Conecta tu cuenta para activar el reloj y registrar sesiones reales."
      : boundToCurrentRoom
        ? roomKind === "solo"
          ? "Este reloj alimenta tus sesiones privadas."
          : "Este reloj actualiza tu estado visible para el resto."
        : `Tu reloj está vinculado a ${timer.roomLabel}.`;

  useEffect(() => {
    setFocusMinutes(String(Math.round(timer.focusDurationSeconds / 60)));
    setBreakMinutes(String(Math.round(timer.breakDurationSeconds / 60)));
  }, [timer.focusDurationSeconds, timer.breakDurationSeconds]);

  const handleStart = () => {
    if (isAnonymousBlocked) {
      return;
    }

    if (!boundToCurrentRoom && timer.status !== "idle") {
      sanctuaryActions.resetTimer(roomKind, roomCode);
    }

    sanctuaryActions.startTimer(roomKind, roomCode);
  };

  const handleReset = () => {
    sanctuaryActions.resetTimer(roomKind, roomCode);
  };

  const handleApplyDurations = () => {
    sanctuaryActions.updateTimerDurations(Number(focusMinutes), Number(breakMinutes));
  };

  return (
    <div className="relative w-full max-w-none bg-surface-container-high pixel-border p-1 shadow-2xl">
      <div className="absolute -top-4 left-4 bg-secondary-container px-3 py-1 font-headline text-xs font-bold uppercase tracking-widest text-primary-fixed">
        Reloj de sala
      </div>
      <div className="bg-surface-container-highest p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">{roomName}</p>
            <h3 className="font-headline text-2xl font-black uppercase tracking-tighter text-primary">
              {boundToCurrentRoom ? phaseLabel : "Reloj preparado"}
            </h3>
          </div>
          <div className="rounded-none border-2 border-outline-variant bg-surface-container px-3 py-2 text-right">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Estado</p>
            <p className="font-headline text-xs font-black uppercase tracking-widest text-tertiary">
              {timer.status === "running" ? "Activo" : timer.status === "paused" ? "Pausado" : "Listo"}
            </p>
          </div>
        </div>

        <div className="font-headline text-center text-[clamp(3.75rem,9vw,5.5rem)] leading-none font-black tracking-[0.04em] text-primary drop-shadow-[4px_4px_0px_#472a00]">
          {formatTime(boundToCurrentRoom ? timer.remainingSeconds : timer.durationSeconds)}
        </div>

        <p className="mt-4 text-center text-sm leading-relaxed text-on-surface-variant">{hint}</p>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              Foco
            </span>
            <div className="flex items-center border-2 border-outline-variant bg-surface-container-low px-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={5}
                max={180}
                step={1}
                value={focusMinutes}
                onChange={(event) => setFocusMinutes(event.target.value)}
                disabled={!canEditDurations}
                className="w-full bg-transparent py-3 text-center font-headline text-lg font-black text-on-surface outline-none disabled:cursor-not-allowed"
              />
              <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">min</span>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              Descanso
            </span>
            <div className="flex items-center border-2 border-outline-variant bg-surface-container-low px-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                max={60}
                step={1}
                value={breakMinutes}
                onChange={(event) => setBreakMinutes(event.target.value)}
                disabled={!canEditDurations}
                className="w-full bg-transparent py-3 text-center font-headline text-lg font-black text-on-surface outline-none disabled:cursor-not-allowed"
              />
              <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">min</span>
            </div>
          </label>

          <button
            type="button"
            onClick={handleApplyDurations}
            disabled={!canEditDurations}
            className="inline-flex items-center justify-center gap-2 self-end border-2 border-outline-variant bg-surface-container-low px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar
          </button>
        </div>

        {!canEditDurations && (
          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-outline">
            Pausa o reinicia el reloj para cambiar los tiempos.
          </p>
        )}

        {!isAnonymousBlocked && (
          <div className="mt-6">
            <p className="mb-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              Notificaciones
            </p>
            <NotificationSettings />
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={timer.status === "running" && boundToCurrentRoom ? sanctuaryActions.pauseTimer : handleStart}
            disabled={isAnonymousBlocked}
            className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-6 py-2 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {timer.status === "running" && boundToCurrentRoom ? <Pause size={16} /> : <Play size={16} />}
            {timer.status === "running" && boundToCurrentRoom ? "Pausar" : boundToCurrentRoom && timer.status === "paused" ? "Reanudar" : "Iniciar"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isAnonymousBlocked}
            className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-tertiary-fixed-variant bg-tertiary px-6 py-2 font-headline text-xs font-bold uppercase tracking-widest text-on-tertiary"
          >
            <RotateCcw size={16} />
            Reiniciar
          </button>
        </div>

        {isAnonymousBlocked ? (
          <a
            href="/api/auth/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 text-center font-headline text-xs font-bold uppercase tracking-[0.22em] text-on-primary"
          >
            <Sparkles size={16} />
            Iniciar sesión para activar el reloj
          </a>
        ) : null}

        {showGardenHint && !isAnonymousBlocked && boundToCurrentRoom && timer.phase === "break" && (
          <a
            href="/jardin"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 border-2 border-primary/35 bg-surface-container-low px-4 py-3 font-headline text-xs font-bold uppercase tracking-[0.22em] text-primary"
          >
            <Sparkles size={16} />
            Ir al jardín de descanso
          </a>
        )}
      </div>
      <TimerToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
