import { useRef } from "react";
import { UserRound } from "lucide-react";
import { useSanctuaryStore } from "@/lib/sanctuary/store";
import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";

interface AuthModePanelProps {
  contextLabel: string;
  compact?: boolean;
}

export function AuthModePanel({ contextLabel, compact = false }: AuthModePanelProps) {
  const sanctuary = useSanctuaryStore();
  const currentProfile = sanctuary.profiles[sanctuary.currentUserId] ?? sanctuary.profiles["guest-current"];
  const avatar = currentProfile.avatar;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isAccount = sanctuary.authMode === "account";
  const title = isAccount ? currentProfile.displayName : "Invitado del santuario";
  const description = isAccount
    ? `Sesión activa como ${currentProfile.handle} con progreso sincronizable entre dispositivos.`
    : "Explora el santuario en modo invitado mientras el inicio de sesión sigue en preparación.";

  useGsapReveal(rootRef);

  if (compact) {
    return (
      <div ref={rootRef} className="relative overflow-hidden bg-surface-container pixel-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,185,97,0.12),transparent_20%),radial-gradient(circle_at_84%_24%,rgba(173,208,168,0.1),transparent_18%)]" />
        <div className="relative p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="gsap-rise flex min-w-0 items-center gap-3 md:gap-4">
              <div className="hidden sm:block">
                <PixelAvatar avatar={avatar} state="idle" size="sm" />
              </div>
              <div className="min-w-0">
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">{contextLabel}</p>
                <h2 className="font-headline text-base font-black uppercase tracking-tighter text-on-surface md:text-lg">{title}</h2>
              </div>
            </div>
            <div className="gsap-rise inline-flex items-center gap-2 rounded-none border border-outline-variant bg-surface-container-low px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
              <UserRound size={12} />
              {isAccount ? "Cuenta activa" : "Invitado"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative overflow-hidden bg-surface-container pixel-border">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,185,97,0.16),transparent_22%),radial-gradient(circle_at_84%_24%,rgba(173,208,168,0.12),transparent_18%)]" />
      <div className="relative p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="gsap-rise flex items-center gap-4">
            <div className="hidden sm:block">
              <PixelAvatar avatar={avatar} state="idle" size="md" />
            </div>
            <div>
              <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">{contextLabel}</p>
              <h2 className="font-headline text-xl font-black uppercase tracking-tighter text-on-surface md:text-2xl">{title}</h2>
              <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
            </div>
          </div>
          <div className="gsap-rise inline-flex items-center gap-2 self-start rounded-none border border-outline-variant bg-surface-container-low px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline md:self-auto">
            <UserRound size={14} />
            {isAccount ? "Conectado con GitHub" : "Inicio de sesión disponible"}
          </div>
        </div>
      </div>
    </div>
  );
}
