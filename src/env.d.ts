/// <reference types="astro/client" />

declare module "*.sql?raw" {
  const content: string;
  export default content;
}

type SessionUser = import("./lib/server/session").SessionUser;

declare namespace App {
  interface Locals {
    user: SessionUser | null;
    sessionId: string | null;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    SITE_URL?: string;
  }
}

interface ImportMetaEnv {
  readonly GITHUB_CLIENT_ID?: string;
  readonly GITHUB_CLIENT_SECRET?: string;
  readonly SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
