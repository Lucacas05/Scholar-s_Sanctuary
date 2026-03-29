import { useEffect, useRef, useState } from "react";
import { MessageSquareQuote, Shrub, Trees } from "lucide-react";
import { EmptyState } from "@/islands/sanctuary/EmptyState";
import {
  getCurrentPresence,
  getCurrentRoom,
  getRenderableCurrentProfile,
  getRoomMembers,
  sanctuaryActions,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
import { StudyTimer } from "@/islands/StudyTimer";
import { SanctuaryCanvasScene } from "@/islands/sanctuary/SanctuaryCanvasScene";
import type { SanctuaryCanvasHandle } from "@/lib/sanctuary/canvas/types";
import { toCanvasRemotePlayers } from "@/islands/sanctuary/canvasRoomHelpers";
import * as realtime from "@/lib/sanctuary/realtime";

interface GardenRoomProps {
  backgroundUrl: string;
}

export function GardenRoom({ backgroundUrl: _backgroundUrl }: GardenRoomProps) {
  const sanctuary = useSanctuaryStore();
  const currentRoom = getCurrentRoom(sanctuary);
  const gardenMembers = currentRoom
    ? getRoomMembers(sanctuary, currentRoom.code, "garden")
    : [];
  const libraryMembers = currentRoom
    ? getRoomMembers(sanctuary, currentRoom.code, "library")
    : [];
  const currentPresence = getCurrentPresence(sanctuary);
  const currentAvatar = getRenderableCurrentProfile(sanctuary).avatar;
  const [message, setMessage] = useState(currentPresence?.message ?? "");
  const sceneRef = useRef<SanctuaryCanvasHandle | null>(null);
  const previousStateRef = useRef("");
  const isAnonymous = sanctuary.sessionState === "anonymous";
  const canSpeak =
    sanctuary.sessionState === "authenticated" &&
    currentPresence?.space === "garden";

  useEffect(() => {
    setMessage(currentPresence?.message ?? "");
  }, [currentPresence?.message]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      sceneRef.current?.actualizarOtrosJugadores(
        toCanvasRemotePlayers("garden", gardenMembers),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [gardenMembers]);

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
      if (currentPresence.state === "break" && currentPresence.message) {
        sceneRef.current?.mostrarMensaje(currentPresence.message);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentPresence]);

  useEffect(() => {
    if (currentPresence?.message && currentPresence.state === "break") {
      const frame = window.requestAnimationFrame(() => {
        sceneRef.current?.mostrarMensaje(currentPresence.message);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [currentPresence?.message, currentPresence?.state]);

  useEffect(() => {
    if (!currentRoom || isAnonymous) return;

    realtime.joinRoom(currentRoom.code);

    return () => {
      realtime.leaveRoom();
    };
  }, [currentRoom?.code, isAnonymous]);

  useEffect(() => {
    if (!currentPresence || !currentRoom || isAnonymous) return;

    const timer = sanctuary.timer;
    realtime.sendPresenceUpdate(
      currentPresence.state,
      timer.phase,
      timer.status,
      timer.remainingSeconds,
      currentPresence.message,
    );
  }, [
    currentPresence?.state,
    currentPresence?.message,
    currentRoom?.code,
    isAnonymous,
    sanctuary.timer.phase,
    sanctuary.timer.remainingSeconds,
    sanctuary.timer.status,
  ]);

  if (isAnonymous) {
    return (
      <div className="space-y-6">
        <SanctuaryCanvasScene
          ref={sceneRef}
          title="Jardín de descanso"
          subtitle="El jardín ya usa el visor 2D: paseos suaves, bocadillos breves y puntos de pausa para el grupo."
          badge="Vista bloqueada"
          sceneKind="garden"
          avatar={currentAvatar}
          locked={true}
          lockedLabel="Este jardín se abre al conectar tu cuenta. De momento queda como vista previa del descanso compartido."
        />
        <div className="bg-surface-container pixel-border p-6">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Acceso restringido
          </p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            El jardín solo permite mensajes y presencia compartida cuando la
            sesión está autenticada.
          </p>
          <a
            href="/api/auth/login"
            className="mt-4 inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
          >
            Iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="bg-surface-container pixel-border">
        <EmptyState
          icon={Shrub}
          title="Ninguna sala seleccionada"
          description="Entra a la biblioteca compartida primero para que el jardín de descanso se active con tu sala."
          action={
            <a
              href="/biblioteca-compartida"
              className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-tertiary-fixed-variant bg-tertiary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-tertiary"
            >
              Ir a la biblioteca
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-12">
      <div className="space-y-8 xl:col-span-8">
        <SanctuaryCanvasScene
          ref={sceneRef}
          title={`Jardín de ${currentRoom.name}`}
          subtitle="La pausa social vive aquí: paseo ligero, bocadillos breves y transición suave antes de volver al foco."
          badge={
            currentRoom.kind === "public"
              ? "Descanso público"
              : "Descanso privado"
          }
          sceneKind="garden"
          avatar={currentAvatar}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-surface-container-low pixel-border p-5">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Actualmente en pausa
            </p>
            <p className="mt-3 font-headline text-3xl font-black text-tertiary">
              {gardenMembers.length}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Personajes visibles en el jardín mientras su reloj está en
              descanso.
            </p>
          </div>
          <div className="bg-surface-container-low pixel-border p-5">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Siguen en biblioteca
            </p>
            <p className="mt-3 font-headline text-3xl font-black text-primary">
              {libraryMembers.length}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Miembros que siguen concentrados en sus propias vigilias dentro de
              la sala.
            </p>
          </div>
        </div>
      </div>

      <aside className="space-y-6 xl:col-span-4">
        <StudyTimer
          roomKind={currentRoom.kind}
          roomCode={currentRoom.code}
          roomName={currentRoom.name}
          showGardenHint={false}
        />

        <div className="bg-surface-container pixel-border p-6">
          <div className="mb-4 flex items-center gap-3">
            <MessageSquareQuote size={18} className="text-primary" />
            <h3 className="font-headline text-lg font-black uppercase tracking-tight text-primary">
              Bocadillo de descanso
            </h3>
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 80))}
            disabled={!canSpeak}
            className="min-h-28 w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={
              canSpeak
                ? "Escribe un saludo breve para tu círculo..."
                : "Empieza una pausa para poder hablar en el jardín."
            }
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => sanctuaryActions.setQuickMessage(message)}
              disabled={!canSpeak}
              className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publicar
            </button>
            <button
              type="button"
              onClick={() => {
                setMessage("");
                sanctuaryActions.clearQuickMessage();
              }}
              className="inline-flex items-center justify-center gap-2 border-2 border-outline-variant bg-surface-container-low px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="bg-surface-container pixel-border p-6">
          <div className="mb-4 flex items-center gap-3">
            <Trees size={18} className="text-tertiary" />
            <h3 className="font-headline text-lg font-black uppercase tracking-tight text-tertiary">
              Pulso del jardín
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Cuando una pausa termine, el reloj volverá a dejarte listo para la
            biblioteca. No hay chat continuo: solo mensajes breves mientras dura
            el descanso.
          </p>
          <a
            href="/biblioteca-compartida"
            className="mt-4 inline-flex items-center justify-center gap-2 border-b-[3px] border-on-tertiary-fixed-variant bg-tertiary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-tertiary"
          >
            Volver a biblioteca compartida
          </a>
        </div>
      </aside>
    </div>
  );
}
