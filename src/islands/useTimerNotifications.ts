import { useEffect, useCallback, useRef, useState } from "react";
import {
  subscribeTimerEvents,
  useSanctuaryStore,
  type TimerEvent,
  type NotificationPreferences,
} from "@/lib/sanctuary/store";

export interface TimerToastData {
  id: string;
  message: string;
  icon: "focus-start" | "focus-end" | "break-start" | "break-end";
}

const EVENT_LABELS: Record<TimerEvent["kind"], { message: string; browserTitle: string; browserBody: string }> = {
  "focus-start": {
    message: "Sesión de foco iniciada",
    browserTitle: "Lumina — Foco iniciado",
    browserBody: "Tu sesión de estudio ha comenzado. ¡Buena suerte!",
  },
  "focus-end": {
    message: "Sesión de foco completada",
    browserTitle: "Lumina — Foco completado",
    browserBody: "¡Bien hecho! Tu sesión de foco ha terminado.",
  },
  "break-start": {
    message: "Descanso iniciado",
    browserTitle: "Lumina — Descanso",
    browserBody: "Tiempo de descanso. Relájate un momento.",
  },
  "break-end": {
    message: "Descanso terminado",
    browserTitle: "Lumina — Descanso terminado",
    browserBody: "Tu descanso ha terminado. ¿Listo para otra ronda?",
  },
};

const TOAST_DURATION_MS = 4000;

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    // Second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15); // G5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.65);
  } catch {
    // AudioContext not available — silently skip
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(title, { body, icon: "/favicon.svg" });
  } catch {
    // Notification blocked or unavailable
  }
}

export function useTimerNotifications(): {
  toasts: TimerToastData[];
  dismissToast: (id: string) => void;
} {
  const sanctuary = useSanctuaryStore();
  const prefsRef = useRef<NotificationPreferences>(sanctuary.notificationPreferences);
  prefsRef.current = sanctuary.notificationPreferences;

  const [toasts, setToasts] = useState<TimerToastData[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleEvent = (event: TimerEvent) => {
      const prefs = prefsRef.current;
      const labels = EVENT_LABELS[event.kind];

      if (prefs.inAppEnabled) {
        const id = `${event.kind}-${Date.now()}`;
        const toast: TimerToastData = { id, message: labels.message, icon: event.kind };
        setToasts((prev) => [...prev, toast]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, TOAST_DURATION_MS);
      }

      if (prefs.soundEnabled) {
        playNotificationSound();
      }

      if (prefs.browserEnabled) {
        sendBrowserNotification(labels.browserTitle, labels.browserBody);
      }
    };

    return subscribeTimerEvents(handleEvent);
  }, []);

  return { toasts, dismissToast };
}
