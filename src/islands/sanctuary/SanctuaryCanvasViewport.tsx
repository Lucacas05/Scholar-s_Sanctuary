import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { AvatarConfig } from "@/lib/sanctuary/store";
import { SanctuaryCanvasEngine } from "@/lib/sanctuary/canvas/engine";
import type {
  CanvasRemotePlayer,
  SanctuaryCanvasHandle,
  SceneKind,
} from "@/lib/sanctuary/canvas/types";

interface SanctuaryCanvasViewportProps {
  sceneKind: SceneKind;
  avatar: AvatarConfig;
  className?: string;
}

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

export const SanctuaryCanvasViewport = forwardRef<
  SanctuaryCanvasHandle,
  SanctuaryCanvasViewportProps
>(function SanctuaryCanvasViewport({ sceneKind, avatar, className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SanctuaryCanvasEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const engine = new SanctuaryCanvasEngine(
      canvasRef.current,
      sceneKind,
      avatar,
    );
    engineRef.current = engine;
    window.render_game_to_text = () => engine.getTextState();
    window.advanceTime = (ms: number) => engine.advanceTime(ms);

    const observer = new ResizeObserver(() => engine.resizeToContainer());
    if (canvasRef.current.parentElement) {
      observer.observe(canvasRef.current.parentElement);
    }

    return () => {
      observer.disconnect();
      if (window.render_game_to_text && engineRef.current === engine) {
        delete window.render_game_to_text;
      }
      if (window.advanceTime && engineRef.current === engine) {
        delete window.advanceTime;
      }
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setScene(sceneKind);
  }, [sceneKind]);

  useEffect(() => {
    engineRef.current?.setAvatar(avatar);
  }, [avatar]);

  useImperativeHandle(
    ref,
    (): SanctuaryCanvasHandle => ({
      iniciarFocus() {
        return engineRef.current?.iniciarFocus() ?? Promise.resolve();
      },
      iniciarBreak() {
        return engineRef.current?.iniciarBreak() ?? Promise.resolve();
      },
      mostrarMensaje(texto: string) {
        engineRef.current?.mostrarMensaje(texto);
      },
      actualizarOtrosJugadores(datos: CanvasRemotePlayer[]) {
        engineRef.current?.actualizarOtrosJugadores(datos);
      },
    }),
    [],
  );

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "block max-h-full max-w-full"}
      style={{ imageRendering: "pixelated" }}
    />
  );
});
