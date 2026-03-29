import { X, Play, CheckCircle, Coffee, Sun } from "lucide-react";
import type { TimerToastData } from "./useTimerNotifications";

const ICON_MAP = {
  "focus-start": Play,
  "focus-end": CheckCircle,
  "break-start": Coffee,
  "break-end": Sun,
} as const;

interface TimerToastStackProps {
  toasts: TimerToastData[];
  onDismiss: (id: string) => void;
}

export function TimerToastStack({ toasts, onDismiss }: TimerToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.icon];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 border-2 border-outline-variant bg-surface-container-high px-4 py-3 pixel-border shadow-lg animate-in slide-in-from-right"
          >
            <Icon size={16} className="shrink-0 text-primary" />
            <span className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface">
              {toast.message}
            </span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="ml-2 shrink-0 text-outline hover:text-on-surface"
              aria-label="Cerrar notificación"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
