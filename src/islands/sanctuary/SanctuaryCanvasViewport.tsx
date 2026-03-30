import {
  forwardRef,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  PUBLISHED_SCENE_EVENT,
  PUBLISHED_SCENE_STORAGE_KEY,
  refreshPublishedSceneMaps,
  syncPublishedSceneMapsFromServer,
} from "@/lib/sanctuary/canvas/sceneMaps";
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
  const initialSceneKindRef = useRef(sceneKind);
  const initialAvatarRef = useRef(avatar);

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!canvasRef.current || !engineRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const pixelX =
      ((event.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const pixelY =
      ((event.clientY - rect.top) / rect.height) * canvasRef.current.height;

    engineRef.current.moverA(pixelX / 16, pixelY / 16);
  }

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const engine = new SanctuaryCanvasEngine(
      canvasRef.current,
      initialSceneKindRef.current,
      initialAvatarRef.current,
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
    function syncPublishedScene() {
      refreshPublishedSceneMaps();
      engineRef.current?.setScene(sceneKind);
    }

    async function syncPublishedSceneFromServer() {
      try {
        await syncPublishedSceneMapsFromServer();
        engineRef.current?.setScene(sceneKind);
      } catch {
        syncPublishedScene();
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== PUBLISHED_SCENE_STORAGE_KEY) {
        return;
      }

      syncPublishedScene();
    }

    void syncPublishedSceneFromServer();
    window.addEventListener(PUBLISHED_SCENE_EVENT, syncPublishedScene);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncPublishedSceneFromServer);

    return () => {
      window.removeEventListener(PUBLISHED_SCENE_EVENT, syncPublishedScene);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncPublishedSceneFromServer);
    };
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
      onPointerDown={handlePointerDown}
      className={className ?? "block max-h-full max-w-full"}
      style={{ imageRendering: "pixelated", cursor: "crosshair" }}
    />
  );
});
