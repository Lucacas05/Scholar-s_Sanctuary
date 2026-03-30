/// <reference types="astro/client" />

declare module "*.sql?raw" {
  const content: string;
  export default content;
}

type SessionUser = import("./lib/server/session").SessionUser;
type UserStateSnapshot = import("./lib/server/user-state").UserStateSnapshot;

declare namespace App {
  interface Locals {
    user: SessionUser | null;
    sessionId: string | null;
    userState: UserStateSnapshot | null;
    onboardingCompleted: boolean;
    isAdmin: boolean;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    SITE_URL?: string;
    ADMIN_GITHUB_USERS?: string;
    CUSTOM_WARDROBE_UPLOAD_ROOT?: string;
  }
}

interface ImportMetaEnv {
  readonly GITHUB_CLIENT_ID?: string;
  readonly GITHUB_CLIENT_SECRET?: string;
  readonly SITE_URL?: string;
  readonly ADMIN_GITHUB_USERS?: string;
  readonly CUSTOM_WARDROBE_UPLOAD_ROOT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
