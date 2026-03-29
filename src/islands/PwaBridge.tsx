import { useEffect, useState } from "react";
import { Download, WifiOff } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function getCurrentShellAssets() {
  const assets = new Set<string>();

  document.querySelectorAll<HTMLLinkElement>("link[href]").forEach((node) => {
    const href = node.getAttribute("href");
    if (href?.startsWith("/")) {
      assets.add(href);
    }
  });

  document
    .querySelectorAll<HTMLScriptElement>("script[src]")
    .forEach((node) => {
      const src = node.getAttribute("src");
      if (src?.startsWith("/")) {
        assets.add(src);
      }
    });

  document.querySelectorAll<HTMLImageElement>("img[src]").forEach((node) => {
    const src = node.getAttribute("src");
    if (src?.startsWith("/")) {
      assets.add(src);
    }
  });

  assets.add(window.location.pathname + window.location.search);

  return [...assets];
}

export function PwaBridge() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        await navigator.serviceWorker.ready;

        const cacheMessage = {
          type: "CACHE_URLS",
          urls: getCurrentShellAssets(),
        };

        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage(cacheMessage);
        } else if (registration.active) {
          registration.active.postMessage(cacheMessage);
        }
      } catch {
        // PWA support stays optional.
      }
    })();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const showInstall = Boolean(installPrompt);

  if (!showInstall && !isOffline) {
    return null;
  }

  return (
    <div className="fixed left-4 bottom-4 z-40 flex max-w-xs flex-col gap-3">
      {showInstall ? (
        <button
          type="button"
          onClick={() => {
            if (!installPrompt) {
              return;
            }

            void (async () => {
              await installPrompt.prompt();
              await installPrompt.userChoice.catch(() => null);
              setInstallPrompt(null);
            })();
          }}
          className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-on-primary shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
        >
          <Download size={14} />
          Instalar Lumina
        </button>
      ) : null}

      {isOffline ? (
        <a
          href="/offline"
          className="inline-flex items-center justify-center gap-2 border-2 border-outline-variant bg-surface-container px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
        >
          <WifiOff size={14} />
          Estás sin conexión
        </a>
      ) : null}
    </div>
  );
}
