import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import {
  getPlannedSessionsForCurrentProfile,
  sanctuaryActions,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";

interface ReminderToast {
  id: string;
  title: string;
  scheduledFor: number;
}

const TOAST_MS = 6000;

function sendBrowserReminder(title: string, body: string) {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    new Notification(title, { body, icon: "/pwa-192.png" });
  } catch {
    // Browser reminder is optional.
  }
}

export function PlannerReminderBridge() {
  const sanctuary = useSanctuaryStore();
  const plannedSessions = getPlannedSessionsForCurrentProfile(sanctuary);
  const [toasts, setToasts] = useState<ReminderToast[]>([]);

  useEffect(() => {
    if (
      sanctuary.sessionState !== "authenticated" ||
      !sanctuary.plannerPreferences.remindersEnabled
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      const dueReminders = plannedSessions.filter((session) => {
        if (
          session.status !== "scheduled" ||
          session.remindedAt ||
          session.scheduledFor <= now
        ) {
          return false;
        }

        return (
          session.scheduledFor - session.reminderLeadMinutes * 60 * 1000 <= now
        );
      });

      dueReminders.forEach((session) => {
        sanctuaryActions.markPlannedSessionReminder(session.id, now);

        if (sanctuary.notificationPreferences.inAppEnabled) {
          const toast = {
            id: `${session.id}-${now}`,
            title: session.title,
            scheduledFor: session.scheduledFor,
          };
          setToasts((current) => [...current, toast]);
          window.setTimeout(() => {
            setToasts((current) =>
              current.filter((entry) => entry.id !== toast.id),
            );
          }, TOAST_MS);
        }

        if (sanctuary.notificationPreferences.browserEnabled) {
          sendBrowserReminder(
            "Lumina — Bloque próximo",
            `${session.title} empieza a las ${new Date(
              session.scheduledFor,
            ).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}.`,
          );
        }
      });
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [
    plannedSessions,
    sanctuary.notificationPreferences.browserEnabled,
    sanctuary.notificationPreferences.inAppEnabled,
    sanctuary.plannerPreferences.remindersEnabled,
    sanctuary.sessionState,
  ]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed left-4 bottom-24 z-50 flex max-w-xs flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 border-2 border-outline-variant bg-surface-container-high px-4 py-3 shadow-lg"
        >
          <BellRing size={16} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
              Recordatorio
            </p>
            <p className="truncate font-headline text-xs font-bold uppercase tracking-widest text-on-surface">
              {toast.title}
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Empieza a las{" "}
              {new Date(toast.scheduledFor).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setToasts((current) =>
                current.filter((entry) => entry.id !== toast.id),
              )
            }
            className="text-outline hover:text-on-surface"
            aria-label="Cerrar recordatorio"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
