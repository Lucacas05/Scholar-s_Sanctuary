import { useRef } from "react";
import {
  BookOpen,
  Flame,
  History,
  ScrollText,
  Trophy,
  Users,
} from "lucide-react";
import { siteContent } from "@/data/site";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import { PomodoroAnalytics } from "@/islands/sanctuary/PomodoroAnalytics";
import {
  SOLO_ROOM_CODE,
  type ChronicleTone,
  getAchievementsForCurrentProfile,
  getCurrentProfileSummary,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";

type TimelineEntry = {
  key: string;
  date: string;
  title: string;
  duration: string;
  context: string;
  note: string;
  tone: ChronicleTone;
};

type CadenceEntry = {
  label: string;
  value: string;
  width: string;
  tone: string;
};

const buttonBaseClass =
  "inline-flex items-center justify-center gap-2 font-headline font-bold uppercase tracking-widest steps-bezel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const buttonVariants = {
  primary:
    "bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant hover:brightness-105 px-6 py-2 text-xs",
  tertiary:
    "bg-surface-container-highest text-on-surface border-2 border-outline-variant/50 hover:border-primary/50 px-6 py-2 text-xs",
} as const;

const accentClasses: Record<ChronicleTone, string> = {
  primary: "bg-primary border-primary text-on-primary",
  secondary: "bg-secondary border-secondary text-on-secondary",
  tertiary: "bg-tertiary border-tertiary text-on-tertiary",
};

const borderToneClasses: Record<ChronicleTone, string> = {
  primary: "border-primary",
  secondary: "border-secondary",
  tertiary: "border-tertiary",
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} h ${remainingMinutes} min`;
  }

  if (hours > 0) {
    return `${hours} h`;
  }

  return `${minutes} min`;
}

function formatChronicleDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function getRoomLabel(roomCode: string, roomName?: string) {
  if (roomCode === SOLO_ROOM_CODE) {
    return "Santuario silencioso";
  }

  return roomName ?? "Biblioteca compartida";
}

function buildTimelineEntries(
  state: ReturnType<typeof useSanctuaryStore>,
  userId: string,
): TimelineEntry[] {
  const sessions = state.sessions
    .filter((session) => session.userId === userId)
    .sort((left, right) => right.completedAt - left.completedAt);

  if (sessions.length === 0) {
    return [];
  }

  const chronicleByWindow = [...state.chronicleEntries]
    .filter((entry) => entry.userId === userId && entry.origin === "timer")
    .sort((left, right) => right.timestamp - left.timestamp);

  return sessions.slice(0, 6).map((session) => {
    const matchingChronicle =
      chronicleByWindow.find(
        (entry) =>
          Math.abs(entry.timestamp - session.completedAt) <= 10 * 60 * 1000,
      ) ?? null;

    const title =
      matchingChronicle?.title ??
      (session.roomKind === "solo"
        ? "Vigilia en el santuario silencioso"
        : "Sesión en biblioteca compartida");

    const note =
      matchingChronicle?.description ??
      (session.roomKind === "solo"
        ? "Sesión privada cerrada con el pulso del santuario en foco."
        : "Sesión social completada dentro de la biblioteca compartida.");

    const roomName = state.rooms[session.roomCode]?.name;
    const tone =
      matchingChronicle?.tone ??
      (session.roomKind === "solo" ? "primary" : "tertiary");

    return {
      key: session.id,
      date: formatChronicleDate(session.completedAt),
      title,
      duration: formatDuration(session.focusSeconds),
      context: getRoomLabel(session.roomCode, roomName),
      note,
      tone,
    };
  });
}

function buildCadenceEntries(
  state: ReturnType<typeof useSanctuaryStore>,
  userId: string,
): CadenceEntry[] {
  const sessions = state.sessions.filter(
    (session) => session.userId === userId,
  );

  if (sessions.length === 0) {
    return [
      {
        label: "Vigilias del alba",
        value: "0",
        width: "0%",
        tone: "bg-primary",
      },
      {
        label: "Anotaciones del mediodía",
        value: "0",
        width: "0%",
        tone: "bg-secondary",
      },
      {
        label: "Transcripciones nocturnas",
        value: "0",
        width: "0%",
        tone: "bg-tertiary",
      },
    ];
  }

  const buckets = {
    alba: 0,
    mediodia: 0,
    nocturnas: 0,
  };

  sessions.forEach((session) => {
    const hour = new Date(session.completedAt).getHours();

    if (hour >= 5 && hour < 12) {
      buckets.alba += 1;
      return;
    }

    if (hour >= 12 && hour < 19) {
      buckets.mediodia += 1;
      return;
    }

    buckets.nocturnas += 1;
  });

  const total = sessions.length;

  return [
    {
      label: "Vigilias del alba",
      value: String(buckets.alba),
      width: `${Math.max(12, Math.round((buckets.alba / total) * 100))}%`,
      tone: "bg-primary",
    },
    {
      label: "Anotaciones del mediodía",
      value: String(buckets.mediodia),
      width: `${Math.max(12, Math.round((buckets.mediodia / total) * 100))}%`,
      tone: "bg-secondary",
    },
    {
      label: "Transcripciones nocturnas",
      value: String(buckets.nocturnas),
      width: `${Math.max(12, Math.round((buckets.nocturnas / total) * 100))}%`,
      tone: "bg-tertiary",
    },
  ];
}

export function ChroniclesArchive() {
  const sanctuary = useSanctuaryStore();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const summary = getCurrentProfileSummary(sanctuary);
  const achievements = getAchievementsForCurrentProfile(sanctuary);
  const timelineEntries = buildTimelineEntries(sanctuary, summary.profile.id);
  const cadenceEntries = buildCadenceEntries(sanctuary, summary.profile.id);
  const isAnonymous = sanctuary.sessionState === "anonymous";

  useGsapReveal(rootRef);

  return (
    <div ref={rootRef} className="mx-auto max-w-7xl space-y-8 pb-8">
      <section className="gsap-rise relative overflow-hidden bg-surface-container-low pixel-border">
        <div className="absolute inset-0 dither-bg opacity-[0.12]" />
        <div className="absolute top-0 right-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-8 p-8 md:p-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-3 border-l-4 border-primary bg-secondary-container px-3 py-2">
              <History size={16} className="text-primary" />
              <span className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-primary-fixed">
                {siteContent.chronicles.badge}
              </span>
            </div>

            <h1 className="text-4xl font-headline font-black uppercase tracking-tighter text-on-surface md:text-6xl">
              {siteContent.chronicles.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-on-surface-variant md:text-lg">
              {siteContent.chronicles.description}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isAnonymous ? (
              <a
                href="/api/auth/login"
                className={`${buttonBaseClass} ${buttonVariants.primary}`}
              >
                <Users size={16} />
                Iniciar sesión
              </a>
            ) : (
              <>
                <a
                  href="/estudio"
                  className={`${buttonBaseClass} ${buttonVariants.primary}`}
                >
                  <BookOpen size={16} />
                  Reanudar lectura
                </a>
                <a
                  href="/biblioteca-compartida"
                  className={`${buttonBaseClass} ${buttonVariants.tertiary}`}
                >
                  <Users size={16} />
                  Ir a la biblioteca
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {isAnonymous ? (
        <section className="gsap-rise bg-surface-container pixel-border p-5">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Archivo bloqueado
          </p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            Las crónicas y los hitos aparecerán aquí cuando tengas una sesión
            activa y el santuario pueda guardar tu progreso.
          </p>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="gsap-rise bg-surface-container pixel-border p-5">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Horas totales
          </p>
          <p className="mt-2 font-headline text-3xl font-black text-primary">
            {summary.focusHours} h
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            A través de {summary.sessionsCount} vigilias registradas.
          </p>
        </div>

        <div className="gsap-rise bg-surface-container pixel-border p-5">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Sesiones completadas
          </p>
          <p className="mt-2 font-headline text-3xl font-black text-secondary">
            {summary.sessionsCount}
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            El archivo ya conserva tu ritmo de foco reciente.
          </p>
        </div>

        <div className="gsap-rise bg-surface-container pixel-border p-5">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Racha visible
          </p>
          <p className="mt-2 font-headline text-3xl font-black text-tertiary">
            {summary.streakDays} días
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            Días seguidos con actividad dentro del santuario.
          </p>
        </div>

        <div className="gsap-rise bg-surface-container pixel-border p-5">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Hitos abiertos
          </p>
          <p className="mt-2 font-headline text-3xl font-black text-primary">
            {summary.achievementsCount}
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            Marcas ya desbloqueadas por {summary.profile.displayName}.
          </p>
        </div>
      </section>

      {!isAnonymous && (
        <section className="gsap-rise">
          <PomodoroAnalytics />
        </section>
      )}

      <section>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-3 text-3xl font-headline font-black uppercase tracking-tighter text-tertiary">
            <span className="flex h-8 w-8 items-center justify-center border-2 border-tertiary bg-tertiary-container">
              <ScrollText size={16} className="text-tertiary" />
            </span>
            {siteContent.chronicles.timelineTitle}
          </h2>
          <div className="hidden h-1 flex-1 dither-bg opacity-20 md:block" />
          <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            {siteContent.chronicles.timelineHint}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="gsap-rise overflow-hidden bg-surface-container-high pixel-border p-6">
              {timelineEntries.length === 0 ? (
                <div className="border-l-4 border-outline-variant bg-surface-container-low px-5 py-4">
                  <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                    El archivo aún está en blanco
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    Completa tus primeras sesiones con el Pomodoro y las
                    crónicas empezarán a escribirse aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {timelineEntries.map((entry, index) => (
                    <div
                      key={entry.key}
                      className={`grid grid-cols-[auto_1fr] gap-4 md:gap-6 ${
                        index < timelineEntries.length - 1
                          ? "mb-6 border-b border-outline-variant/40 pb-6"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-12 w-12 items-center justify-center border-4 ${accentClasses[entry.tone]}`}
                        >
                          <History size={18} />
                        </div>
                        {index < timelineEntries.length - 1 && (
                          <div className="mt-2 min-h-16 w-1 flex-1 bg-outline-variant/70" />
                        )}
                      </div>

                      <div className="pt-1">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                              {entry.date}
                            </p>
                            <h3 className="mt-1 text-xl font-headline font-black uppercase tracking-tight text-on-surface">
                              {entry.title}
                            </h3>
                          </div>

                          <div className="grid min-w-[220px] grid-cols-2 gap-3">
                            <div className="border-b-4 border-primary bg-surface-container-low px-3 py-2">
                              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                                Duración
                              </p>
                              <p className="text-sm font-headline font-black text-primary">
                                {entry.duration}
                              </p>
                            </div>
                            <div className="border-b-4 border-tertiary bg-surface-container-low px-3 py-2">
                              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                                Contexto
                              </p>
                              <p className="text-sm font-headline font-black text-tertiary">
                                {entry.context}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                          {entry.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <div className="gsap-rise bg-surface-container pixel-border p-6">
              <div className="mb-4 flex items-center gap-3">
                <Flame size={18} className="text-tertiary" />
                <h3 className="text-lg font-headline font-black uppercase tracking-tight text-tertiary">
                  {siteContent.chronicles.cadenceTitle}
                </h3>
              </div>
              <p className="mb-5 text-[10px] font-headline font-bold uppercase tracking-[0.25em] text-outline">
                {siteContent.chronicles.cadenceSubtitle}
              </p>

              <div className="space-y-5">
                {cadenceEntries.map((entry) => (
                  <div key={entry.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-headline font-bold uppercase tracking-widest text-on-surface">
                        {entry.label}
                      </span>
                      <span className="text-xs font-headline font-black text-outline">
                        {entry.value}
                      </span>
                    </div>
                    <div className="h-4 overflow-hidden bg-surface-container-highest">
                      <div
                        className={`h-full ${entry.tone}`}
                        style={{ width: entry.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="gsap-rise bg-surface-container pixel-border p-6">
              <div className="mb-4 flex items-center gap-3">
                <Trophy size={18} className="text-secondary" />
                <h3 className="text-lg font-headline font-black uppercase tracking-tight text-secondary">
                  {siteContent.chronicles.milestonesTitle}
                </h3>
              </div>

              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`border-2 px-4 py-3 ${
                      achievement.unlockedAt
                        ? "border-secondary bg-secondary/10"
                        : `bg-surface-container-low ${borderToneClasses.secondary}`
                    }`}
                  >
                    <p className="text-sm font-headline font-black uppercase tracking-tight text-on-surface">
                      {achievement.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                      {achievement.description}
                    </p>
                    <p className="mt-2 font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                      {achievement.unlockedAt
                        ? `Desbloqueado el ${new Date(achievement.unlockedAt).toLocaleDateString("es-ES")}`
                        : "Aún bloqueado"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
