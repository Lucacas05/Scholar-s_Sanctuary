import type http from "node:http";
import type { AstroIntegration } from "astro";

/**
 * Astro integration that attaches the WebSocket server to Vite's
 * underlying http.Server during development.
 *
 * Only the /ws path is intercepted; all other upgrade requests
 * (including Vite HMR) pass through untouched.
 *
 * The WS module is loaded lazily via Vite's `ssrLoadModule` to ensure
 * path aliases (@/) resolve correctly and the module runner is ready.
 */
export function wsDevIntegration(): AstroIntegration {
  return {
    name: "ws-dev",
    hooks: {
      "astro:server:setup": ({ server }) => {
        // Wait for the underlying http server to be listening before
        // loading the WS module through Vite's SSR pipeline.
        const attach = () => {
          if (!server.httpServer) {
            setTimeout(attach, 100);
            return;
          }

          const httpServer = server.httpServer as unknown as http.Server;

          if (httpServer.listening) {
            loadAndAttach(server, httpServer);
          } else {
            httpServer.on("listening", () => {
              loadAndAttach(server, httpServer);
            });
          }
        };

        attach();
      },
    },
  };
}

async function loadAndAttach(
  viteServer: Parameters<
    NonNullable<AstroIntegration["hooks"]["astro:server:setup"]>
  >[0]["server"],
  httpServer: http.Server,
): Promise<void> {
  try {
    // Use Vite's SSR module loader so @/ aliases and TS work correctly
    const mod = await viteServer.ssrLoadModule("/src/lib/server/ws.ts");
    const { attachWebSocketServer } = mod as {
      attachWebSocketServer: (server: http.Server) => void;
    };
    attachWebSocketServer(httpServer);
    console.log("[ws] WebSocket server attached (dev mode)");
  } catch (err) {
    console.error("[ws] Failed to attach WebSocket server:", err);
  }
}
