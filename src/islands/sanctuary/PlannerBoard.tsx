import { useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarDays,
  Clock3,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import {
  getPlannedSessionsForCurrentProfile,
  getPrivateRoomsForCurrentProfile,
  getCurrentRoom,
  sanctuaryActions,
  SOLO_ROOM_CODE,
  type PlannedSession,
  type RoomKind,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";

function getWeekStart(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function toDateTimeInput(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatStatus(status: PlannedSession["status"]) {
  if (status === "started") {
    return "En curso";
  }
  if (status === "completed") {
    return "Completada";
  }
  if (status === "cancelled") {
    return "Cancelada";
  }
  return "Programada";
}

function getStatusClass(status: PlannedSession["status"]) {
  if (status === "started") {
    return "border-primary bg-primary/10 text-primary";
  }
  if (status === "completed") {
    return "border-tertiary bg-tertiary/10 text-tertiary";
  }
  if (status === "cancelled") {
    return "border-outline-variant bg-surface-container-high text-outline";
  }
  return "border-secondary bg-secondary/10 text-secondary";
}

export function PlannerBoard() {
  const sanctuary = useSanctuaryStore();
  const plannedSessions = getPlannedSessionsForCurrentProfile(sanctuary);
  const privateRooms = getPrivateRoomsForCurrentProfile(sanctuary);
  const currentRoom = getCurrentRoom(sanctuary);
  const now = Date.now();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledFor, setScheduledFor] = useState(
    toDateTimeInput(Date.now() + 24 * 60 * 60 * 1000),
  );
  const [focusMinutes, setFocusMinutes] = useState("25");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const [roomCode, setRoomCode] = useState(currentRoom?.code ?? SOLO_ROOM_CODE);
  const [roomKind, setRoomKind] = useState<RoomKind>(
    currentRoom?.kind ?? "solo",
  );
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(
    String(sanctuary.plannerPreferences.defaultLeadMinutes),
  );

  const roomOptions = useMemo(() => {
    const options = [
      {
        code: SOLO_ROOM_CODE,
        kind: "solo" as const,
        label: "Santuario silencioso",
      },
      {
        code: "gran-lectorio",
        kind: "public" as const,
        label: "Gran lectorio compartido",
      },
      ...privateRooms.map((room) => ({
        code: room.code,
        kind: room.kind,
        label: room.name,
      })),
    ];

    return options;
  }, [privateRooms]);

  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        return date;
      }),
    [weekStart],
  );

  const sessionsByDay = useMemo(() => {
    return weekDays.map((date) => {
      const key = date.toDateString();
      return plannedSessions.filter(
        (session) => new Date(session.scheduledFor).toDateString() === key,
      );
    });
  }, [plannedSessions, weekDays]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setNotes("");
    setScheduledFor(toDateTimeInput(Date.now() + 24 * 60 * 60 * 1000));
    setFocusMinutes("25");
    setBreakMinutes("5");
    setRoomCode(currentRoom?.code ?? SOLO_ROOM_CODE);
    setRoomKind(currentRoom?.kind ?? "solo");
    setReminderLeadMinutes(
      String(sanctuary.plannerPreferences.defaultLeadMinutes),
    );
  }

  function loadForEdit(session: PlannedSession) {
    setEditingId(session.id);
    setTitle(session.title);
    setNotes(session.notes);
    setScheduledFor(toDateTimeInput(session.scheduledFor));
    setFocusMinutes(String(session.focusMinutes));
    setBreakMinutes(String(session.breakMinutes));
    setRoomCode(session.roomCode);
    setRoomKind(session.roomKind);
    setReminderLeadMinutes(String(session.reminderLeadMinutes));
  }

  function submitPlanner() {
    const scheduledTimestamp = new Date(scheduledFor).getTime();
    if (Number.isNaN(scheduledTimestamp) || scheduledTimestamp < now - 60_000) {
      return;
    }

    sanctuaryActions.upsertPlannedSession({
      id: editingId ?? crypto.randomUUID(),
      title,
      notes,
      scheduledFor: scheduledTimestamp,
      focusMinutes: Number(focusMinutes),
      breakMinutes: Number(breakMinutes),
      roomCode,
      roomKind,
      reminderLeadMinutes: Number(reminderLeadMinutes),
      remindedAt: null,
      startedAt: null,
      completedAt: null,
    });

    resetForm();
  }

  return (
    <section className="gsap-rise space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 text-3xl font-headline font-black uppercase tracking-tighter text-primary">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-secondary-container">
            <CalendarDays size={16} className="text-primary" />
          </span>
          Plan semanal
        </h2>
        <div className="hidden h-1 flex-1 dither-bg opacity-20 md:block" />
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
          Bloques próximos y recordatorios
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,24rem)]">
        <div className="bg-surface-container pixel-border p-6">
          <div className="grid gap-4 lg:grid-cols-7">
            {weekDays.map((day, index) => (
              <div
                key={day.toISOString()}
                className="min-h-56 border-2 border-outline-variant/40 bg-surface-container-low p-3"
              >
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  {day.toLocaleDateString("es-ES", { weekday: "short" })}
                </p>
                <p className="mt-1 font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                  {day.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>

                <div className="mt-3 space-y-3">
                  {sessionsByDay[index].length === 0 ? (
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      Sin bloques.
                    </p>
                  ) : (
                    sessionsByDay[index].map((session) => (
                      <article
                        key={session.id}
                        className="border-2 border-outline-variant/30 bg-surface px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-headline text-[11px] font-black uppercase tracking-tight text-on-surface">
                            {session.title}
                          </p>
                          <span
                            className={`border px-2 py-1 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ${getStatusClass(session.status)}`}
                          >
                            {formatStatus(session.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-on-surface-variant">
                          {new Date(session.scheduledFor).toLocaleTimeString(
                            "es-ES",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}{" "}
                          · {session.focusMinutes}/{session.breakMinutes} min
                        </p>
                        <p className="mt-1 text-[11px] text-outline">
                          {
                            roomOptions.find(
                              (option) => option.code === session.roomCode,
                            )?.label
                          }
                        </p>
                        {session.notes ? (
                          <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
                            {session.notes}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(session.status === "scheduled" ||
                            session.status === "started") && (
                            <button
                              type="button"
                              onClick={() =>
                                sanctuaryActions.startPlannedSession(session.id)
                              }
                              className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-primary"
                            >
                              <Play size={12} />
                              {session.status === "started"
                                ? "Retomar"
                                : "Iniciar"}
                            </button>
                          )}
                          {session.status === "scheduled" && (
                            <button
                              type="button"
                              onClick={() => loadForEdit(session)}
                              className="inline-flex items-center justify-center gap-2 border-2 border-outline-variant bg-surface-container px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface"
                            >
                              <Pencil size={12} />
                              Editar
                            </button>
                          )}
                          {session.status !== "completed" && (
                            <button
                              type="button"
                              onClick={() =>
                                sanctuaryActions.deletePlannedSession(
                                  session.id,
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 border-2 border-outline-variant/50 bg-surface-container-highest px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-outline"
                            >
                              <Trash2 size={12} />
                              Borrar
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-surface-container pixel-border p-6">
            <div className="mb-4 flex items-center gap-3">
              <Clock3 size={18} className="text-secondary" />
              <h3 className="font-headline text-lg font-black uppercase tracking-tight text-secondary">
                {editingId ? "Editar bloque" : "Nuevo bloque"}
              </h3>
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Título
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                  placeholder="Repaso de apuntes"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Fecha y hora
                </span>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(event) => setScheduledFor(event.target.value)}
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                    Foco
                  </span>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={focusMinutes}
                    onChange={(event) => setFocusMinutes(event.target.value)}
                    className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                    Descanso
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={breakMinutes}
                    onChange={(event) => setBreakMinutes(event.target.value)}
                    className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                    Sala
                  </span>
                  <select
                    value={`${roomKind}:${roomCode}`}
                    onChange={(event) => {
                      const [nextKind, nextCode] =
                        event.target.value.split(":");
                      setRoomKind(nextKind as RoomKind);
                      setRoomCode(nextCode);
                    }}
                    className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                  >
                    {roomOptions.map((option) => (
                      <option
                        key={`${option.kind}:${option.code}`}
                        value={`${option.kind}:${option.code}`}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                    Avisar antes
                  </span>
                  <select
                    value={reminderLeadMinutes}
                    onChange={(event) =>
                      setReminderLeadMinutes(event.target.value)
                    }
                    className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                  >
                    {[5, 10, 15, 30, 45, 60].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} min
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Nota breve
                </span>
                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value.slice(0, 220))
                  }
                  className="min-h-28 w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                  placeholder="Tema, capítulo o meta de la sesión."
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={submitPlanner}
                  className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
                >
                  <CalendarDays size={14} />
                  {editingId ? "Guardar cambios" : "Programar bloque"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center gap-2 border-2 border-outline-variant bg-surface-container-high px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-surface"
                  >
                    Cancelar edición
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bg-surface-container pixel-border p-6">
            <div className="mb-4 flex items-center gap-3">
              <AlarmClock size={18} className="text-tertiary" />
              <h3 className="font-headline text-lg font-black uppercase tracking-tight text-tertiary">
                Recordatorios
              </h3>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  sanctuaryActions.updatePlannerPreferences({
                    remindersEnabled:
                      !sanctuary.plannerPreferences.remindersEnabled,
                  })
                }
                className={`inline-flex w-full items-center justify-between border-2 px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.2em] ${
                  sanctuary.plannerPreferences.remindersEnabled
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant bg-surface-container-low text-on-surface"
                }`}
              >
                <span>Recordatorios del planner</span>
                <span>
                  {sanctuary.plannerPreferences.remindersEnabled
                    ? "Activos"
                    : "Pausados"}
                </span>
              </button>

              <label className="block">
                <span className="mb-2 block font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Aviso por defecto
                </span>
                <select
                  value={String(
                    sanctuary.plannerPreferences.defaultLeadMinutes,
                  )}
                  onChange={(event) =>
                    sanctuaryActions.updatePlannerPreferences({
                      defaultLeadMinutes: Number(event.target.value),
                    })
                  }
                  className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                >
                  {[5, 10, 15, 30, 45, 60].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} min antes
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-relaxed text-on-surface-variant">
                Los avisos usan las notificaciones del navegador si ya las has
                activado desde el reloj.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
