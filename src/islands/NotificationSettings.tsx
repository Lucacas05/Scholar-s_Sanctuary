import { useCallback } from "react";
import { Bell, BellOff, Globe, Volume2, VolumeX } from "lucide-react";
import {
  sanctuaryActions,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";

function Toggle({
  enabled,
  onToggle,
  label,
  iconOn,
  iconOff,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 border-2 border-outline-variant bg-surface-container-low px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container"
      aria-pressed={enabled}
      title={label}
    >
      {enabled ? iconOn : iconOff}
      <span className="hidden sm:inline">{label}</span>
      <span
        className={[
          "ml-auto h-2 w-2 rounded-full",
          enabled ? "bg-tertiary" : "bg-outline",
        ].join(" ")}
      />
    </button>
  );
}

export function NotificationSettings() {
  const sanctuary = useSanctuaryStore();
  const prefs = sanctuary.notificationPreferences;

  const toggleInApp = useCallback(() => {
    sanctuaryActions.updateNotificationPreferences({ inAppEnabled: !prefs.inAppEnabled });
  }, [prefs.inAppEnabled]);

  const toggleBrowser = useCallback(() => {
    if (!prefs.browserEnabled) {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            sanctuaryActions.updateNotificationPreferences({ browserEnabled: true });
          }
        });
        return;
      }

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        sanctuaryActions.updateNotificationPreferences({ browserEnabled: true });
        return;
      }

      // Permission denied — cannot enable
      return;
    }

    sanctuaryActions.updateNotificationPreferences({ browserEnabled: false });
  }, [prefs.browserEnabled]);

  const toggleSound = useCallback(() => {
    sanctuaryActions.updateNotificationPreferences({ soundEnabled: !prefs.soundEnabled });
  }, [prefs.soundEnabled]);

  const browserBlocked =
    typeof Notification !== "undefined" && Notification.permission === "denied";

  return (
    <div className="flex flex-wrap gap-2">
      <Toggle
        enabled={prefs.inAppEnabled}
        onToggle={toggleInApp}
        label="Avisos"
        iconOn={<Bell size={14} className="text-primary" />}
        iconOff={<BellOff size={14} className="text-outline" />}
      />
      <Toggle
        enabled={prefs.soundEnabled}
        onToggle={toggleSound}
        label="Sonido"
        iconOn={<Volume2 size={14} className="text-primary" />}
        iconOff={<VolumeX size={14} className="text-outline" />}
      />
      <Toggle
        enabled={prefs.browserEnabled}
        onToggle={toggleBrowser}
        label={browserBlocked ? "Bloqueado" : "Navegador"}
        iconOn={<Globe size={14} className="text-primary" />}
        iconOff={<Globe size={14} className={browserBlocked ? "text-error" : "text-outline"} />}
      />
    </div>
  );
}
