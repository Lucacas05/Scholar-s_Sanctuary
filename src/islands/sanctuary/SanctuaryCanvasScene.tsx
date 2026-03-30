import { forwardRef } from "react";
import type { AvatarConfig } from "@/lib/sanctuary/store";
import { SanctuaryCanvasViewport } from "@/islands/sanctuary/SanctuaryCanvasViewport";
import type { SanctuaryCanvasHandle } from "@/lib/sanctuary/canvas/types";
import type { SceneKind } from "@/lib/sanctuary/canvas/types";

interface SanctuaryCanvasSceneProps {
  title: string;
  subtitle: string;
  badge: string;
  sceneKind: SceneKind;
  avatar: AvatarConfig;
  locked?: boolean;
  lockedLabel?: string;
}

export const SanctuaryCanvasScene = forwardRef<
  SanctuaryCanvasHandle,
  SanctuaryCanvasSceneProps
>(function SanctuaryCanvasScene(
  { title, subtitle, badge, sceneKind, avatar, locked = false, lockedLabel },
  ref,
) {
  return (
    <div className="relative overflow-hidden bg-surface-container-lowest pixel-border">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,185,97,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(173,208,168,0.12),transparent_26%)]" />

      <div className="relative flex min-h-[28rem] flex-col p-5 md:min-h-[30rem] md:p-6">
        <div className="mb-5 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 border-l-4 border-primary bg-secondary-container px-3 py-1">
            <span className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-primary-fixed">
              {badge}
            </span>
          </div>
          <h2 className="font-headline text-3xl font-black uppercase tracking-tighter text-on-surface md:text-4xl">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">
            {subtitle}
          </p>
        </div>

        <div className="relative flex-1 overflow-hidden border border-outline-variant/35 bg-surface shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="flex h-full min-h-[20rem] bg-[radial-gradient(circle_at_50%_45%,rgba(255,185,97,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-4">
            <div className="relative flex h-full w-full items-center justify-center border border-primary/25 bg-black/10 p-2 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
              <SanctuaryCanvasViewport
                ref={ref}
                sceneKind={sceneKind}
                avatar={avatar}
                className="h-full w-full"
              />
            </div>
          </div>

          {locked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[linear-gradient(180deg,rgba(18,13,11,0.16),rgba(18,13,11,0.65))] backdrop-blur-[2px]">
              <div className="max-w-sm border-2 border-outline-variant bg-surface/90 px-5 py-4 text-center shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                <p className="font-headline text-xs font-black uppercase tracking-[0.24em] text-primary">
                  Inicia sesión
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {lockedLabel ??
                    "Esta sala social se abrirá cuando esté listo el acceso real a tu círculo."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
