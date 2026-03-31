import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, UserCircle } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { syncAchievementDefinitionsFromServer } from "@/lib/sanctuary/achievements";
import {
  getAchievementsForCurrentProfile,
  getFullState,
  hydrateFromServer,
  sanctuaryActions,
  useSanctuaryStore,
  type RemoteAccountIdentity,
} from "@/lib/sanctuary/store";
import * as realtime from "@/lib/sanctuary/realtime";

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

type AuthFeedback = "success" | "error" | null;

export function IdentityBadge({
  initialUser = null,
  oauthAvailable = true,
}: IdentityBadgeProps) {
  const sanctuary = useSanctuaryStore();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(
    initialUser,
  );
  const [isReady, setIsReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOAuthAvailable, setIsOAuthAvailable] = useState(oauthAvailable);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const lastSyncedStateRef = useRef<string | null>(null);
  const progressSyncInFlightRef = useRef(false);
  const sessionStateRef = useRef(sanctuary.sessionState);
  sessionStateRef.current = sanctuary.sessionState;

  async function hydrateArchiveFromServer() {
    const response = await fetch("/api/pomodoro/archive", {
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      sessions?: Array<{
        clientSessionId: string;
        serverId: string;
        roomCode: string;
        roomKind: "solo" | "public" | "private";
        focusSeconds: number;
        breakSeconds: number;
        startedAt: number;
        completedAt: number;
        persistedAt: number;
      }>;
    };

    sanctuaryActions.hydrateServerProgress(payload);
  }

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
          if (sessionStateRef.current === "authenticated") {
            sanctuaryActions.returnToAnonymousState();
          }
          setSessionUser(null);
          lastSyncedStateRef.current = null;
          return;
        }

        setSessionUser(payload.user);

        if (payload.stateJson) {
          hydrateFromServer(payload.stateJson);
        }

        await syncAchievementDefinitionsFromServer().catch(() => null);
        sanctuaryActions.connectGitHubAccount(payload.user);
        realtime.connect();
        await hydrateArchiveFromServer();

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
        // Keep the anonymous read-only experience when the backend is unavailable.
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
    const url = new URL(window.location.href);
    const status = url.searchParams.get("auth");
    const nextFeedback =
      status === "success" ? "success" : status === "error" ? "error" : null;

    if (!nextFeedback) {
      return;
    }

    setAuthFeedback(nextFeedback);
    url.searchParams.delete("auth");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, []);

  useEffect(() => {
    if (!isReady || !sessionUser) {
      return;
    }

    if (
      sanctuary.sessionState !== "authenticated" ||
      sanctuary.currentUserId !== sessionUser.id
    ) {
      return;
    }

    const nextState = getFullState();
    const serializedState = JSON.stringify(nextState);
    const unsyncedSessions = nextState.sessions.filter(
      (session) => session.userId === sessionUser.id && !session.persistedAt,
    );

    if (
      serializedState === lastSyncedStateRef.current &&
      unsyncedSessions.length === 0
    ) {
      return;
    }

    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      if (progressSyncInFlightRef.current) {
        return;
      }

      progressSyncInFlightRef.current = true;

      void (async () => {
        try {
          for (const session of unsyncedSessions) {
            const response = await fetch("/api/pomodoro/sessions", {
              body: JSON.stringify({
                clientSessionId: session.id,
                roomCode: session.roomCode,
                roomKind: session.roomKind,
                focusSeconds: session.focusSeconds,
                breakSeconds: session.breakSeconds ?? 5 * 60,
                startedAt:
                  session.startedAt ??
                  session.completedAt - session.focusSeconds * 1000,
                completedAt: session.completedAt,
              }),
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
            });

            if (response.status === 401) {
              realtime.disconnect();
              sanctuaryActions.returnToAnonymousState();
              setSessionUser(null);
              lastSyncedStateRef.current = null;
              return;
            }

            if (!response.ok) {
              continue;
            }

            const payload = (await response.json()) as {
              session?: {
                serverId: string;
                clientSessionId: string;
                persistedAt: number;
              };
            };

            if (payload.session) {
              sanctuaryActions.markSessionPersisted(
                payload.session.clientSessionId,
                payload.session.serverId,
                payload.session.persistedAt,
              );
            }
          }

          if (unsyncedSessions.length > 0) {
            await hydrateArchiveFromServer();
          }

          const stateToPersist = getFullState();
          const persistedSerializedState = JSON.stringify(stateToPersist);
          const response = await fetch("/api/me", {
            body: JSON.stringify({ state: stateToPersist }),
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          });

          if (response.status === 401) {
            realtime.disconnect();
            sanctuaryActions.returnToAnonymousState();
            setSessionUser(null);
            lastSyncedStateRef.current = null;
            return;
          }

          if (response.ok) {
            lastSyncedStateRef.current = persistedSerializedState;
          }
        } catch {
          // Keep local progress and try again on the next change.
        } finally {
          progressSyncInFlightRef.current = false;
        }
      })();
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

      realtime.disconnect();
      sanctuaryActions.returnToAnonymousState();
      setSessionUser(null);
      lastSyncedStateRef.current = null;
      window.location.assign("/");
    }
  }

  const label = sessionUser?.displayName ?? "Sin sesión";
  const detail = sessionUser ? `@${sessionUser.username}` : "Solo lectura";
  const unlockedAchievements =
    sessionUser &&
    sanctuary.sessionState === "authenticated" &&
    sanctuary.currentUserId === sessionUser.id
      ? getAchievementsForCurrentProfile(sanctuary).filter(
          (achievement) => achievement.unlockedAt,
        )
      : [];
  const feedbackText =
    authFeedback === "success"
      ? "Sesión iniciada correctamente."
      : authFeedback === "error"
        ? "No se pudo completar el acceso con GitHub."
        : null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
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

        {/* Avatar with hover tooltip — click goes to social */}
        <div className="group relative hidden lg:block">
          <a
            href="/social"
            className="flex h-10 w-10 items-center justify-center overflow-hidden border-2 border-outline-variant bg-surface-container-highest transition-colors group-hover:border-primary"
          >
            {sessionUser?.avatarUrl ? (
              <SafeImage
                src={sessionUser.avatarUrl}
                fallbackSrc="/site/placeholder-avatar.svg"
                alt={sessionUser.displayName}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <UserCircle className="text-primary" size={22} />
            )}
          </a>

          {sessionUser ? (
            <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 min-w-max opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="border-2 border-outline-variant bg-surface-container-high px-4 py-3 text-right shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                <p className="font-headline text-xs font-bold uppercase tracking-widest text-primary">
                  {label}
                </p>
                <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
                  {detail}
                </p>
                {unlockedAchievements.length > 0 ? (
                  <p className="mt-1 font-headline text-[9px] font-bold uppercase tracking-[0.2em] text-secondary">
                    {unlockedAchievements.length} insignias
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {feedbackText ? (
        <p
          className={[
            "max-w-xs text-right font-headline text-[10px] font-bold uppercase tracking-[0.18em]",
            authFeedback === "success" ? "text-secondary" : "text-primary",
          ].join(" ")}
        >
          {feedbackText}
        </p>
      ) : null}
    </div>
  );
}
