import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { wsDevIntegration } from "./src/integrations/ws-dev";

export default defineConfig({
  site: process.env.SITE_URL || "http://localhost:3000",
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [react(), wsDevIntegration()],
  session: {
    driver: "fs-lite",
    options: {
      // Keep runtime-written session files in the same writable data area as SQLite.
      base: fileURLToPath(new URL("./data/sessions", import.meta.url)),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          indent: "  ",
        },
      },
    },
  },
});
