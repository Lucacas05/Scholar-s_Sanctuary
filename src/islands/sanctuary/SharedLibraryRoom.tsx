import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, DoorOpen, Plus, UsersRound } from "lucide-react";
import {
  getCurrentPresence,
  getCurrentRoom,
  getRenderableCurrentProfile,
  getFriendsForCurrentProfile,
  getPrivateRoomsForCurrentProfile,
  getRoomMembers,
  sanctuaryActions,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
import { StudyTimer } from "@/islands/StudyTimer";
import { SanctuaryCanvasScene } from "@/islands/sanctuary/SanctuaryCanvasScene";
import type { SanctuaryCanvasHandle } from "@/lib/sanctuary/canvas/types";
import { toCanvasRemotePlayers } from "@/islands/sanctuary/canvasRoomHelpers";
import * as realtime from "@/lib/sanctuary/realtime";

interface SharedLibraryRoomProps {
  backgroundUrl: string;
}

export function SharedLibraryRoom({
  backgroundUrl: _backgroundUrl,
}: SharedLibraryRoomProps) {
  const sanctuary = useSanctuaryStore();
  const currentRoom = getCurrentRoom(sanctuary);
  const privateRooms = getPrivateRoomsForCurrentProfile(sanctuary);
  const friends = getFriendsForCurrentProfile(sanctuary);
  const libraryMembers = currentRoom
    ? getRoomMembers(sanctuary, currentRoom.code, "library")
    : [];
  const gardenMembers = currentRoom
    ? getRoomMembers(sanctuary, currentRoom.code, "garden")
    : [];
  const [roomName, setRoomName] = useState("Círculo de estudio");
  const [joinCode, setJoinCode] = useState("");
  const [inviteIds, setInviteIds] = useState<string[]>(
    friends.slice(0, 2).map((friend) => friend.id),
  );
  const sceneRef = useRef<SanctuaryCanvasHandle | null>(null);
  const previousStateRef = useRef("");
  const shareUrl = useMemo(
    () =>
      currentRoom?.kind === "private"
        ? `/biblioteca-compartida?codigo=${currentRoom.code}`
        : "",
    [currentRoom],
  );
  const sceneKind =
    currentRoom?.kind === "public" ? "public-library" : "shared-library";
  const currentPresence = getCurrentPresence(sanctuary);
  const currentAvatar = getRenderableCurrentProfile(sanctuary).avatar;
  const isAnonymous = sanctuary.sessionState === "anonymous";

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("codigo");
    if (code) {
      sanctuaryActions.joinPrivateRoom(code);
      setJoinCode(code);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      sceneRef.current?.actualizarOtrosJugadores(
        toCanvasRemotePlayers(sceneKind, libraryMembers),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [libraryMembers, sceneKind]);

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
    if (!currentPresence || isAnonymous) return;

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
    sanctuary.timer.status,
    sanctuary.timer.phase,
    sanctuary.timer.remainingSeconds,
  ]);

  if (isAnonymous) {
    return (
      <div className="space-y-6">
        <SanctuaryCanvasScene
          ref={sceneRef}
          title="Biblioteca compartida"
          subtitle="Vista previa del lectorio público con el mismo visor 2D que usará el modo social real."
          badge="Vista social"
          sceneKind="public-library"
          avatar={currentAvatar}
          locked={true}
          lockedLabel="Esta biblioteca se abre al conectar tu cuenta, con presencia real, amistades e invitaciones."
        />
        <div className="bg-surface-container pixel-border p-6">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Pulso social
          </p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            El visor ya puede mostrar biblioteca pública, biblioteca compartida
            y personajes remotos. Inicia sesión para desbloquear presencia real
            y salas privadas.
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

  return (
    <div className="grid gap-8 xl:grid-cols-12">
      <div className="space-y-8 xl:col-span-8">
        <div className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => sanctuaryActions.selectPublicRoom()}
            className={`pixel-border p-5 text-left transition ${currentRoom?.kind === "public" ? "bg-tertiary-container" : "bg-surface-container-low hover:bg-surface-container"}`}
          >
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Sala abierta
            </p>
            <h3 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-on-surface">
              Gran lectorio
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Estudia con todo el mundo y observa el pulso general.
            </p>
          </button>

          <div className="pixel-border bg-surface-container-low p-5 md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Sala privada
                </p>
                <h3 className="mt-2 font-headline text-xl font-black uppercase tracking-tight text-on-surface">
                  {currentRoom?.kind === "private"
                    ? currentRoom.name
                    : "Crear o entrar"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Usa invitaciones para levantar una sala propia de amistades.
                </p>
              </div>
              {currentRoom?.kind === "private" && (
                <div className="rounded-none border-2 border-outline-variant bg-surface px-3 py-2 text-right">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                    Código
                  </p>
                  <p className="font-headline text-sm font-black uppercase tracking-widest text-primary">
                    {currentRoom.code}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                className="min-w-0 rounded-none border-2 border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                placeholder="Nombre de sala privada"
              />
              <button
                type="button"
                onClick={() =>
                  sanctuaryActions.createPrivateRoom(roomName, inviteIds)
                }
                className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
              >
                <Plus size={16} />
                Crear sala
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {friends.map((friend) => {
                const active = inviteIds.includes(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() =>
                      setInviteIds((current) =>
                        current.includes(friend.id)
                          ? current.filter((id) => id !== friend.id)
                          : [...current, friend.id],
                      )
                    }
                    className={`rounded-none border-2 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.2em] ${active ? "border-primary bg-primary/15 text-primary" : "border-outline-variant bg-surface-container text-outline"}`}
                  >
                    {friend.displayName}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                className="min-w-0 rounded-none border-2 border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                placeholder="Código de invitación"
              />
              <button
                type="button"
                onClick={() => sanctuaryActions.joinPrivateRoom(joinCode)}
                className="inline-flex items-center justify-center gap-2 border-2 border-outline-variant bg-surface-container-low px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface"
              >
                <DoorOpen size={16} />
                Entrar
              </button>
            </div>
          </div>
        </div>

        {currentRoom && (
          <SanctuaryCanvasScene
            ref={sceneRef}
            title={currentRoom.name}
            subtitle={
              currentRoom.kind === "public"
                ? "El foco visible para quien entra a la biblioteca general."
                : "Una sala de estudio reservada para tu círculo invitado."
            }
            badge={
              currentRoom.kind === "public"
                ? "Biblioteca pública"
                : "Sala privada"
            }
            sceneKind={sceneKind}
            avatar={currentAvatar}
          />
        )}
      </div>

      <aside className="space-y-6 xl:col-span-4">
        {currentRoom && (
          <StudyTimer
            roomKind={currentRoom.kind}
            roomCode={currentRoom.code}
            roomName={currentRoom.name}
            showGardenHint={true}
          />
        )}

        {currentRoom?.kind === "private" && (
          <div className="bg-surface-container pixel-border p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  Invitación
                </p>
                <h3 className="font-headline text-lg font-black uppercase tracking-tight text-primary">
                  Comparte el acceso
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="inline-flex items-center justify-center gap-2 border-2 border-outline-variant bg-surface-container-low px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface"
              >
                <Copy size={14} />
                Copiar ruta
              </button>
            </div>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Usa{" "}
              <span className="font-headline font-bold text-tertiary">
                {shareUrl}
              </span>{" "}
              para volver a esta sala o enviársela a otra pestaña local.
            </p>
          </div>
        )}

        <div className="bg-surface-container pixel-border p-6">
          <div className="mb-4 flex items-center gap-3">
            <UsersRound size={18} className="text-tertiary" />
            <h3 className="font-headline text-lg font-black uppercase tracking-tight text-tertiary">
              Miembros visibles
            </h3>
          </div>
          <div className="space-y-3">
            {currentRoom &&
              currentRoom.memberIds.map((memberId) => {
                const profile = sanctuary.profiles[memberId];
                const presence = sanctuary.presences[memberId];
                const label =
                  presence?.state === "studying"
                    ? "Estudiando"
                    : presence?.state === "break"
                      ? "Descansando"
                      : presence?.state === "away"
                        ? "Ausente"
                        : "Disponible";

                return (
                  <div
                    key={memberId}
                    className="flex items-center justify-between gap-4 border-b border-outline-variant/30 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                        {profile?.displayName}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                        {label}
                      </p>
                    </div>
                    <span className="rounded-none border-2 border-outline-variant bg-surface-container-low px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                      {memberId === sanctuary.currentUserId ? "Tú" : "Círculo"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-surface-container pixel-border p-6">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Pulso de pausa
          </p>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {gardenMembers.length > 0
              ? `${gardenMembers.length} integrante${gardenMembers.length === 1 ? "" : "s"} se encuentra en descanso y ya puede verse en el jardín.`
              : "Nadie está en descanso ahora mismo. Cuando una vigilia cierre, el personaje pasará al jardín."}
          </p>
          <a
            href="/jardin"
            className="mt-4 inline-flex items-center justify-center gap-2 border-b-[3px] border-on-tertiary-fixed-variant bg-tertiary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-tertiary"
          >
            Ver jardín de descanso
          </a>
        </div>

        {privateRooms.length > 0 && (
          <div className="bg-surface-container pixel-border p-6">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Tus salas privadas
            </p>
            <div className="mt-4 space-y-3">
              {privateRooms.map((room) => (
                <button
                  key={room.code}
                  type="button"
                  onClick={() => sanctuaryActions.joinPrivateRoom(room.code)}
                  className={`w-full rounded-none border-2 px-4 py-3 text-left ${currentRoom?.code === room.code ? "border-primary bg-primary/15" : "border-outline-variant bg-surface-container-low"}`}
                >
                  <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                    {room.name}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                    {room.code}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
