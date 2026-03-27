import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, UserCircle } from "lucide-react";
import {
  getFullState,
  hydrateFromServer,
  sanctuaryActions,
  useSanctuaryStore,
  type RemoteAccountIdentity,
} from "@/lib/sanctuary/store";

interface SessionUser extends RemoteAccountIdentity {
  avatarUrl: string | null;
  githubId: number;
}

interface IdentityBadgeProps {
  initialUser?: SessionUser | null;
  oauthAvailable?: boolean;
}

interface MeResponse {
  oauthAvailable?: boolean;
  stateJson: unknown;
  user: SessionUser | null;
}

export function IdentityBadge({ initialUser = null, oauthAvailable = true }: IdentityBadgeProps) {
  const sanctuary = useSanctuaryStore();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(initialUser);
  const [isReady, setIsReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOAuthAvailable, setIsOAuthAvailable] = useState(oauthAvailable);
  const syncTimeoutRef = useRef<number | null>(null);
  const lastSyncedStateRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as MeResponse;
        if (cancelled) {
          return;
        }

        if (typeof payload.oauthAvailable === "boolean") {
          setIsOAuthAvailable(payload.oauthAvailable);
        }

        if (!payload.user) {
          if (sanctuary.authMode === "account") {
            sanctuaryActions.returnToGuestMode();
          }
          setSessionUser(null);
          lastSyncedStateRef.current = null;
          return;
        }

        setSessionUser(payload.user);

        if (payload.stateJson) {
          hydrateFromServer(payload.stateJson);
        }

        sanctuaryActions.connectGitHubAccount(payload.user);

        const snapshot = getFullState();
        const serializedSnapshot = JSON.stringify(snapshot);

        if (!payload.stateJson) {
          const saveResponse = await fetch("/api/me", {
            body: JSON.stringify({ state: snapshot }),
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          });

          if (saveResponse.ok) {
            lastSyncedStateRef.current = serializedSnapshot;
          }
        } else {
          lastSyncedStateRef.current = serializedSnapshot;
        }
      } catch {
        // Keep the local guest experience when the backend is unavailable.
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady || !sessionUser) {
      return;
    }

    if (sanctuary.authMode !== "account" || sanctuary.currentUserId !== sessionUser.id) {
      return;
    }

    const nextState = getFullState();
    const serializedState = JSON.stringify(nextState);

    if (serializedState === lastSyncedStateRef.current) {
      return;
    }

    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      void fetch("/api/me", {
        body: JSON.stringify({ state: nextState }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
        .then((response) => {
          if (response.status === 401) {
            sanctuaryActions.returnToGuestMode();
            setSessionUser(null);
            lastSyncedStateRef.current = null;
            return;
          }

          if (response.ok) {
            lastSyncedStateRef.current = serializedState;
          }
        })
        .catch(() => {
          // Keep local progress and try again on the next change.
        });
    }, 5000);

    return () => {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isReady, sanctuary, sessionUser]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        credentials: "include",
        method: "POST",
      });
    } finally {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }

      sanctuaryActions.returnToGuestMode();
      setSessionUser(null);
      lastSyncedStateRef.current = null;
      window.location.assign("/");
    }
  }

  const label = sessionUser?.displayName ?? "Invitado";
  const detail = sessionUser ? `@${sessionUser.username}` : "Acceso local";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="font-headline text-xs font-bold uppercase tracking-widest text-primary">{label}</p>
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
          {detail}
        </p>
      </div>

      {sessionUser ? (
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-2 font-headline text-xs font-bold uppercase tracking-widest text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={16} />
          {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
        </button>
      ) : isOAuthAvailable ? (
        <a
          href="/api/auth/login"
          className="inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-4 py-2 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
        >
          <LogIn size={16} />
          Iniciar sesión
        </a>
      ) : (
        <button
          type="button"
          disabled={true}
          title="Configura GitHub OAuth para activar el inicio de sesión"
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 border-b-[3px] border-outline-variant bg-surface-container-high px-4 py-2 font-headline text-xs font-bold uppercase tracking-widest text-outline"
        >
          <LogIn size={16} />
          Iniciar sesión
        </button>
      )}

      <div className="hidden h-10 w-10 items-center justify-center overflow-hidden border-2 border-outline-variant bg-surface-container-highest lg:flex">
        {sessionUser?.avatarUrl ? (
          <img src={sessionUser.avatarUrl} alt={sessionUser.displayName} className="h-full w-full object-cover" />
        ) : (
          <UserCircle className="text-primary" size={22} />
        )}
      </div>
    </div>
  );
}
