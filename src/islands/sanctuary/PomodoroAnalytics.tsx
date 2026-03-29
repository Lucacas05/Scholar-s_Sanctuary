import { useCallback, useEffect, useState } from "react";
import { BarChart3, Clock, Flame, TrendingUp, Zap } from "lucide-react";
import { ErrorBlock } from "@/islands/sanctuary/ErrorBlock";

interface DailyEntry {
  day: string;
  sessions: number;
  focusSeconds: number;
}

interface PomodoroStats {
  totalSessions: number;
  totalFocusSeconds: number;
  avgFocusSeconds: number;
  streakDays: number;
  daily: DailyEntry[];
}

function formatMinutes(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r > 0 ? `${h} h ${r} min` : `${h} h`;
  }
  return `${m} min`;
}

function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}

function buildChartData(daily: DailyEntry[], range: "weekly" | "monthly") {
  const days = range === "weekly" ? 7 : 30;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const map = new Map(daily.map((d) => [d.day, d]));
  const result: Array<{
    label: string;
    focusMinutes: number;
    sessions: number;
  }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400000);
    const key = date.toISOString().slice(0, 10);
    const entry = map.get(key);
    const dayLabel = date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });

    result.push({
      label: dayLabel,
      focusMinutes: entry ? Math.round(entry.focusSeconds / 60) : 0,
      sessions: entry?.sessions ?? 0,
    });
  }

  return result;
}

function TrendChart({ data }: { data: ReturnType<typeof buildChartData> }) {
  if (data.length === 0) return null;

  const maxMinutes = Math.max(1, ...data.map((d) => d.focusMinutes));
  const chartHeight = 120;
  const barGap = 2;
  const barWidth = Math.max(
    4,
    Math.floor((600 - barGap * data.length) / data.length),
  );
  const chartWidth = data.length * (barWidth + barGap);

  const labelStep = data.length <= 7 ? 1 : data.length <= 14 ? 2 : 5;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 28}`}
        className="w-full"
        style={{ minWidth: data.length > 14 ? 480 : undefined }}
        aria-label="Gráfica de tendencias de foco"
      >
        {data.map((entry, i) => {
          const barHeight =
            maxMinutes > 0
              ? (entry.focusMinutes / maxMinutes) * chartHeight
              : 0;
          const x = i * (barWidth + barGap);
          const y = chartHeight - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={chartHeight}
                width={barWidth}
                height={0}
                rx={1}
                className="fill-primary/80"
              >
                <animate
                  attributeName="y"
                  from={chartHeight}
                  to={y}
                  dur="0.4s"
                  begin={`${i * 0.02}s`}
                  fill="freeze"
                />
                <animate
                  attributeName="height"
                  from="0"
                  to={barHeight}
                  dur="0.4s"
                  begin={`${i * 0.02}s`}
                  fill="freeze"
                />
              </rect>
              {entry.focusMinutes > 0 && barHeight > 14 && (
                <text
                  x={x + barWidth / 2}
                  y={y + 10}
                  textAnchor="middle"
                  className="fill-on-primary text-[7px] font-bold"
                >
                  {entry.focusMinutes}
                </text>
              )}
              {i % labelStep === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  className="fill-outline text-[7px]"
                >
                  {entry.label}
                </text>
              )}
            </g>
          );
        })}

        <line
          x1={0}
          y1={chartHeight}
          x2={chartWidth}
          y2={chartHeight}
          className="stroke-outline-variant/40"
          strokeWidth={0.5}
        />
      </svg>
    </div>
  );
}

export function PomodoroAnalytics() {
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = useCallback((currentRange: "weekly" | "monthly") => {
    let cancelled = false;

    setLoading(true);
    setError(false);
    fetch(`/api/pomodoro/stats?range=${currentRange}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch"))))
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => fetchStats(range), [range, fetchStats]);

  if (loading && !stats) {
    return (
      <div className="bg-surface-container pixel-border p-6">
        <p className="text-sm text-on-surface-variant">Cargando analíticas…</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-surface-container pixel-border p-6">
        <ErrorBlock
          message="No se pudieron cargar las analíticas."
          onRetry={() => fetchStats(range)}
        />
      </div>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <div className="bg-surface-container pixel-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 size={18} className="text-primary" />
          <h3 className="text-lg font-headline font-black uppercase tracking-tight text-primary">
            Analíticas de foco
          </h3>
        </div>
        <p className="text-sm text-on-surface-variant">
          Completa tu primera sesión Pomodoro para ver las analíticas
          persistentes aquí.
        </p>
      </div>
    );
  }

  const chartData = buildChartData(stats.daily, range);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-surface-container pixel-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-primary" />
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Tiempo total
            </p>
          </div>
          <p className="font-headline text-3xl font-black text-primary">
            {formatHours(stats.totalFocusSeconds)} h
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Persistido en la base de datos del santuario.
          </p>
        </div>

        <div className="bg-surface-container pixel-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-secondary" />
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Promedio por sesión
            </p>
          </div>
          <p className="font-headline text-3xl font-black text-secondary">
            {formatMinutes(stats.avgFocusSeconds)}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            De {stats.totalSessions} vigilias registradas.
          </p>
        </div>

        <div className="bg-surface-container pixel-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={14} className="text-tertiary" />
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Racha actual
            </p>
          </div>
          <p className="font-headline text-3xl font-black text-tertiary">
            {stats.streakDays} días
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Días consecutivos con sesiones completadas.
          </p>
        </div>

        <div className="bg-surface-container pixel-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-primary" />
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
              Sesiones totales
            </p>
          </div>
          <p className="font-headline text-3xl font-black text-primary">
            {stats.totalSessions}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Guardadas permanentemente en el archivo.
          </p>
        </div>
      </section>

      <section className="bg-surface-container pixel-border p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <BarChart3 size={18} className="text-primary" />
            <h3 className="text-lg font-headline font-black uppercase tracking-tight text-primary">
              Tendencias de foco
            </h3>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRange("weekly")}
              className={`px-3 py-1 text-[10px] font-headline font-bold uppercase tracking-widest transition-colors ${
                range === "weekly"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
              }`}
            >
              7 días
            </button>
            <button
              type="button"
              onClick={() => setRange("monthly")}
              className={`px-3 py-1 text-[10px] font-headline font-bold uppercase tracking-widest transition-colors ${
                range === "monthly"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
              }`}
            >
              30 días
            </button>
          </div>
        </div>

        <p className="mb-4 font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
          Minutos de foco por día
        </p>

        <TrendChart data={chartData} />
      </section>
    </div>
  );
}
