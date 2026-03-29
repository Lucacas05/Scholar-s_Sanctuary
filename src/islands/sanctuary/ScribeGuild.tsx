import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Crown,
  DoorOpen,
  Lock,
  LogIn,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Shield,
  Sword,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { siteContent } from "@/data/site";
import { useGsapReveal } from "@/islands/sanctuary/useGsapReveal";
import {
  getFullState,
  sanctuaryActions,
  useSanctuaryStore,
} from "@/lib/sanctuary/store";
import { ErrorBlock } from "@/islands/sanctuary/ErrorBlock";
import * as realtime from "@/lib/sanctuary/realtime";
import type { ServerMessage } from "@/lib/server/ws-types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Friend {
  friendshipId: string;
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
}

interface PendingRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface SearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface RoomSummary {
  code: string;
  name: string;
  ownerId: string;
  privacy: "public" | "private";
  memberCount: number;
  createdAt: string;
}

interface RoomInvitation {
  id: string;
  roomCode: string;
  roomName: string;
  inviteCode: string | null;
  inviteLink: string | null;
  expiresAt: string | null;
  inviter: { id: string; username: string; displayName: string };
  createdAt: string;
}

interface ActiveInvitation {
  id: string;
  inviteCode: string;
  inviteLink: string;
  expiresAt: string | null;
  invitee: { id: string; username: string; displayName: string };
}

interface FeedItem {
  id: string;
  type: "session" | "streak";
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  message: string;
  happenedAt: string;
}

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  focusMinutes: number;
  sessionsCount: number;
  isCurrentUser: boolean;
}

/* ------------------------------------------------------------------ */
/*  Static labels                                                      */
/* ------------------------------------------------------------------ */

const { social } = siteContent;

/* ------------------------------------------------------------------ */
/*  Shared button base classes (matching PixelButton patterns)         */
/* ------------------------------------------------------------------ */
const btnBase =
  "inline-flex items-center justify-center gap-2 font-headline font-bold uppercase tracking-widest steps-bezel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function AvatarBubble({
  url,
  fallback,
}: {
  url: string | null;
  fallback: string;
}) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center border-4 border-surface-container-highest bg-surface-container-low overflow-hidden">
      {url ? (
        <SafeImage
          src={url}
          fallbackSrc="/site/placeholder-avatar.svg"
          alt={fallback}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="font-headline text-sm font-black text-primary">
          {fallback}
        </span>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLastSeen(value: string | null) {
  if (!value) {
    return "Activo recientemente";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Activo recientemente";
  }

  return `Última vez ${new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp)}`;
}

async function readActionError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return typeof payload?.error === "string" ? payload.error : fallback;
}

function formatFeedTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "ahora";
  }

  return new Intl.RelativeTimeFormat("es", { numeric: "auto" }).format(
    Math.round((timestamp - Date.now()) / (60 * 60 * 1000)),
    "hour",
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function ScribeGuild() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useGsapReveal(rootRef);

  const sanctuary = useSanctuaryStore();
  const isAnonymous = sanctuary.sessionState === "anonymous";

  /* ---- Friends data ---- */
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{
    incoming: PendingRequest[];
    outgoing: PendingRequest[];
  }>({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  /* ---- Rooms data ---- */
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomInvitations, setRoomInvitations] = useState<RoomInvitation[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [roomPrivacy, setRoomPrivacy] = useState<"public" | "private">(
    "private",
  );
  const [joinCode, setJoinCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [activeInvitesByRoom, setActiveInvitesByRoom] = useState<
    Record<string, ActiveInvitation[]>
  >({});
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardRange, setLeaderboardRange] = useState("");
  const [isSocialMetricsLoading, setIsSocialMetricsLoading] = useState(false);

  /* ---- UI state ---- */
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [inviteDropdownFor, setInviteDropdownFor] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [requestsError, setRequestsError] = useState(false);
  const ownedRooms = rooms.filter(
    (room) => room.ownerId === sanctuary.currentUserId,
  );

  /* ================================================================ */
  /*  Data fetching                                                    */
  /* ================================================================ */

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data.friends ?? []);
        setFriends(
          rows.map(
            (row: {
              friendshipId?: string;
              id?: string;
              friend?: {
                id: string;
                username: string;
                displayName: string;
                avatarUrl: string | null;
                lastSeenAt: string | null;
              };
            }) => ({
              friendshipId: row.friendshipId ?? row.id ?? "",
              id: row.friend?.id ?? "",
              username: row.friend?.username ?? "",
              displayName: row.friend?.displayName ?? "",
              avatarUrl: row.friend?.avatarUrl ?? null,
              lastSeenAt: row.friend?.lastSeenAt ?? null,
            }),
          ),
        );
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/requests");
      if (res.ok) {
        const data = await res.json();
        const mapRow = (row: {
          id: string;
          user?: {
            id: string;
            username: string;
            displayName: string;
            avatarUrl: string | null;
          };
          userId?: string;
          username?: string;
          displayName?: string;
          avatarUrl?: string | null;
        }): PendingRequest => ({
          id: row.id,
          userId: row.user?.id ?? row.userId ?? "",
          username: row.user?.username ?? row.username ?? "",
          displayName: row.user?.displayName ?? row.displayName ?? "",
          avatarUrl: row.user?.avatarUrl ?? row.avatarUrl ?? null,
        });
        setPendingRequests({
          incoming: (data.incoming ?? []).map(mapRow),
          outgoing: (data.outgoing ?? []).map(mapRow),
        });
        setRequestsError(false);
      } else {
        setRequestsError(true);
      }
    } catch {
      setRequestsError(true);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms ?? []);
      }
    } catch {
      /* network error */
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms/invitations");
      if (res.ok) {
        const data = await res.json();
        setRoomInvitations(data.invitations ?? []);
      }
    } catch {
      /* network error */
    }
  }, []);

  const fetchSocialMetrics = useCallback(async () => {
    setIsSocialMetricsLoading(true);

    try {
      const [feedRes, leaderboardRes] = await Promise.all([
        fetch("/api/social/feed"),
        fetch("/api/social/leaderboard"),
      ]);

      if (feedRes.ok) {
        const data = await feedRes.json();
        setFeedItems(data.feed ?? []);
      }

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data.leaderboard ?? []);
        setLeaderboardRange(data.rangeLabel ?? "");
      }
    } catch {
      /* network error */
    } finally {
      setIsSocialMetricsLoading(false);
    }
  }, []);

  const persistCurrentStateSnapshot = useCallback(async () => {
    const snapshot = getFullState();
    await fetch("/api/me", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: snapshot }),
    });
  }, []);

  const fetchActiveInvitations = useCallback(async (roomCode: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/invite`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveInvitesByRoom((current) => ({
        ...current,
        [roomCode]: data.invitations ?? [],
      }));
    } catch {
      /* network error */
    }
  }, []);

  const reloadAll = useCallback(() => {
    setLoadError(false);
    fetchFriends();
    fetchRequests();
    fetchRooms();
    fetchInvitations();
    void fetchSocialMetrics();
  }, [
    isAnonymous,
    fetchFriends,
    fetchInvitations,
    fetchRequests,
    fetchRooms,
    fetchSocialMetrics,
  ]);

  useEffect(() => {
    if (isAnonymous) return;
    reloadAll();
  }, [isAnonymous, reloadAll]);

  useEffect(() => {
    if (isAnonymous) return;

    const currentUserId = sanctuary.currentUserId;
    if (!currentUserId) return;

    const ownedRooms = rooms.filter((room) => room.ownerId === currentUserId);
    ownedRooms.forEach((room) => {
      void fetchActiveInvitations(room.code);
    });
  }, [isAnonymous, rooms, sanctuary.currentUserId, fetchActiveInvitations]);

  /* ---- WS listeners ---- */
  useEffect(() => {
    if (isAnonymous) return;
    const unsub = realtime.onMessage((msg: ServerMessage) => {
      if (msg.type === "friend-request") {
        fetchRequests();
      } else if (msg.type === "room-invitation") {
        fetchInvitations();
      }
    });
    return unsub;
  }, [isAnonymous, fetchRequests, fetchInvitations]);

  useEffect(() => {
    if (isAnonymous) return;

    const params = new URLSearchParams(window.location.search);
    const prefillRoom = params.get("codigo") ?? "";
    const prefillInvite = params.get("invite") ?? "";

    if (prefillRoom) setJoinCode(prefillRoom);
    if (prefillInvite) setInviteCode(prefillInvite);
  }, [isAnonymous]);

  /* ================================================================ */
  /*  Action handlers                                                  */
  /* ================================================================ */

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setFeedback(null);

    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );

      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data.users) ? data.users : []);
      } else {
        setSearchResults([]);
        setFeedback(
          await readActionError(res, "No se pudo completar la búsqueda."),
        );
      }
    } catch {
      setSearchResults([]);
      setFeedback("No se pudo completar la búsqueda.");
    }

    setIsSearching(false);
  };

  const handleSendRequest = async (username: string) => {
    setFeedback(null);

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        void fetchRequests();
        setSearchResults((prev) => prev.filter((r) => r.username !== username));
      } else {
        setFeedback(
          await readActionError(res, "No se pudo enviar la solicitud."),
        );
      }
    } catch {
      setFeedback("No se pudo enviar la solicitud.");
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setFeedback(null);

    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });

      if (res.ok) {
        void fetchFriends();
        void fetchRequests();
      } else {
        setFeedback(
          await readActionError(res, "No se pudo aceptar la solicitud."),
        );
      }
    } catch {
      setFeedback("No se pudo aceptar la solicitud.");
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    setFeedback(null);

    try {
      const res = await fetch("/api/friends/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });

      if (res.ok) {
        void fetchRequests();
      } else {
        setFeedback(
          await readActionError(res, "No se pudo rechazar la solicitud."),
        );
      }
    } catch {
      setFeedback("No se pudo rechazar la solicitud.");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setFeedback(null);

    try {
      const res = await fetch(`/api/friends/${friendId}`, { method: "DELETE" });

      if (res.ok) {
        void fetchFriends();
      } else {
        setFeedback(
          await readActionError(res, "No se pudo eliminar el amigo."),
        );
      }
    } catch {
      setFeedback("No se pudo eliminar el amigo.");
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    setFeedback(null);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoomName.trim(),
          privacy: roomPrivacy,
        }),
      });

      if (res.ok) {
        void fetchRooms();
        setNewRoomName("");
        setRoomPrivacy("private");
        setShowCreateRoom(false);
      } else {
        setFeedback(await readActionError(res, "No se pudo crear la sala."));
      }
    } catch {
      setFeedback("No se pudo crear la sala.");
    }
  };

  const handleJoinRoom = async (code: string, inviteCodeValue?: string) => {
    setFeedback(null);

    try {
      const payload = inviteCodeValue?.trim()
        ? { inviteCode: inviteCodeValue.trim().toUpperCase() }
        : undefined;

      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });

      if (res.ok) {
        void fetchRooms();
        void fetchInvitations();
        setJoinCode("");
        setInviteCode("");
      } else {
        setFeedback(await readActionError(res, "No se pudo entrar a la sala."));
      }
    } catch {
      setFeedback("No se pudo entrar a la sala.");
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    setFeedback(null);

    try {
      const res = await fetch("/api/rooms/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action: "accept" }),
      });

      if (res.ok) {
        void fetchRooms();
        void fetchInvitations();
      } else {
        setFeedback(
          await readActionError(res, "No se pudo aceptar la invitación."),
        );
      }
    } catch {
      setFeedback("No se pudo aceptar la invitación.");
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setFeedback(null);

    try {
      const res = await fetch("/api/rooms/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action: "decline" }),
      });

      if (res.ok) {
        void fetchInvitations();
      } else {
        setFeedback(
          await readActionError(res, "No se pudo rechazar la invitación."),
        );
      }
    } catch {
      setFeedback("No se pudo rechazar la invitación.");
    }
  };

  const handleInviteToRoom = async (userId: string, roomCode: string) => {
    setFeedback(null);

    try {
      const res = await fetch(`/api/rooms/${roomCode}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, expiresInHours: 72 }),
      });

      if (res.ok) {
        void fetchActiveInvitations(roomCode);
      } else {
        setFeedback(
          await readActionError(res, "No se pudo enviar la invitación."),
        );
      }
    } catch {
      setFeedback("No se pudo enviar la invitación.");
    }
    setInviteDropdownFor(null);
  };

  const handleRevokeInvitation = async (
    roomCode: string,
    invitationId: string,
  ) => {
    setFeedback(null);

    try {
      const res = await fetch(`/api/rooms/${roomCode}/invite`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (res.ok) {
        void fetchActiveInvitations(roomCode);
      } else {
        setFeedback(
          await readActionError(res, "No se pudo revocar la invitación."),
        );
      }
    } catch {
      setFeedback("No se pudo revocar la invitación.");
    }
  };

  const handleTogglePrivacy = async (
    key: "shareActivity" | "showOnLeaderboard",
  ) => {
    const nextValue = !sanctuary.socialPrivacy[key];
    sanctuaryActions.updateSocialPrivacy({ [key]: nextValue });

    try {
      await persistCurrentStateSnapshot();
      await fetchSocialMetrics();
    } catch {
      setFeedback("No se pudo guardar la privacidad social.");
    }
  };

  /* ================================================================ */
  /*  Pending counts for badges                                        */
  /* ================================================================ */

  const incomingCount = pendingRequests.incoming.length;
  const invitationCount = roomInvitations.length;

  /* ================================================================ */
  /*  Anonymous locked state                                           */
  /* ================================================================ */

  if (isAnonymous) {
    return (
      <div ref={rootRef} className="mx-auto max-w-7xl space-y-8 pb-8">
        <section className="gsap-rise relative overflow-hidden bg-surface-container-low pixel-border">
          <div className="absolute inset-0 dither-bg opacity-[0.12]" />
          <div className="absolute top-0 right-0 h-56 w-56 bg-tertiary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 bg-primary/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-xl">
              <div className="mb-2 inline-block bg-tertiary-container px-3 py-1">
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-on-tertiary-container">
                  {social.badge}
                </span>
              </div>
              <h2 className="text-4xl font-headline font-black uppercase tracking-tighter text-primary leading-none md:text-5xl">
                {social.title}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant font-body">
                {social.description}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center border-2 border-outline-variant bg-surface-container-highest">
              <Lock size={20} className="text-outline" />
            </div>
          </div>
        </section>

        <div className="gsap-rise bg-surface-container pixel-border p-6">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
            Acceso restringido
          </p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            El Gremio de Escribas requiere una identidad verificada. Inicia
            sesion con tu cuenta de GitHub para desbloquear amistades, salas de
            estudio compartidas e invitaciones.
          </p>
          <a
            href="/api/auth/login"
            className="mt-4 inline-flex items-center justify-center gap-2 border-b-[3px] border-on-primary-fixed-variant bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-on-primary"
          >
            <LogIn size={16} />
            Iniciar sesion
          </a>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Authenticated view                                               */
  /* ================================================================ */

  return (
    <div ref={rootRef} className="mx-auto max-w-7xl space-y-8 pb-8">
      {/* ====== HERO ====== */}
      <section className="gsap-rise relative overflow-hidden bg-surface-container-low pixel-border">
        <div className="absolute inset-0 dither-bg opacity-[0.12]" />
        <div className="absolute top-0 right-0 h-56 w-56 bg-tertiary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-xl">
            <div className="mb-2 inline-block bg-tertiary-container px-3 py-1">
              <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-on-tertiary-container">
                {social.badge}
              </span>
            </div>
            <h2 className="text-4xl font-headline font-black uppercase tracking-tighter text-primary leading-none md:text-5xl">
              {social.title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant font-body">
              {social.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateRoom(true)}
            className={`${btnBase} bg-tertiary-container text-on-tertiary-container border-b-4 border-on-tertiary-fixed-variant px-8 py-4 text-xs hover:brightness-105`}
          >
            <Sword size={16} />
            {social.missionCta}
          </button>
        </div>
      </section>

      {loadError && (
        <div className="gsap-rise">
          <ErrorBlock
            message="No se pudieron cargar los datos del gremio."
            onRetry={reloadAll}
          />
        </div>
      )}

      {feedback ? (
        <div
          role="alert"
          className="gsap-rise border-2 border-error/40 bg-error/10 px-5 py-4 font-body text-sm text-on-surface"
        >
          {feedback}
        </div>
      ) : null}

      {/* ====== MAIN GRID ====== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ---- LEFT: Friends Panel ---- */}
        <section className="xl:col-span-8">
          <div className="gsap-rise bg-surface-container pixel-border">
            {/* Search bar */}
            <div className="border-b-4 border-surface-container-highest p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-surface-container-highest">
                  <Users size={16} className="text-primary" />
                </div>
                <h3 className="text-lg font-headline font-black uppercase tracking-tighter text-on-surface">
                  {social.rosterTitle}
                </h3>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSearch();
                }}
                className="grid gap-3 sm:grid-cols-[1fr_auto]"
              >
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por @usuario de GitHub..."
                    className="w-full rounded-none border-2 border-outline-variant bg-surface-container-low pl-9 pr-4 py-3 text-sm text-on-surface outline-none focus:border-primary font-body"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className={`${btnBase} bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant px-5 py-3 text-[10px] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <Search size={14} />
                  {isSearching ? "Buscando..." : "Buscar"}
                </button>
              </form>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border-b-4 border-surface-container-highest">
                <div className="px-5 pt-4 pb-2">
                  <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">
                    Resultados de busqueda
                  </span>
                </div>
                <div className="divide-y divide-surface-container-highest">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <AvatarBubble
                          url={user.avatarUrl}
                          fallback={initials(user.displayName)}
                        />
                        <div>
                          <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                            {user.displayName}
                          </p>
                          <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSendRequest(user.username)}
                        className={`${btnBase} bg-tertiary-container text-on-tertiary-container border-b-[3px] border-on-tertiary-fixed-variant px-4 py-2 text-[10px] hover:brightness-105`}
                      >
                        <UserPlus size={12} />
                        Enviar solicitud
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab toggle */}
            <div className="flex border-b-4 border-surface-container-highest">
              <button
                type="button"
                onClick={() => setActiveTab("friends")}
                className={`flex-1 px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-center transition ${
                  activeTab === "friends"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-outline hover:text-on-surface"
                }`}
              >
                Amigos ({friends.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className={`relative flex-1 px-5 py-3 font-headline text-xs font-bold uppercase tracking-widest text-center transition ${
                  activeTab === "requests"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-outline hover:text-on-surface"
                }`}
              >
                Solicitudes
                {incomingCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1 font-headline text-[10px] font-bold text-on-primary">
                    {incomingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Friends tab */}
            {activeTab === "friends" && (
              <div className="divide-y divide-surface-container-highest">
                {friends.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users
                      size={32}
                      className="mx-auto mb-3 text-outline-variant"
                    />
                    <p className="font-headline text-sm font-bold uppercase tracking-tight text-outline">
                      Sin amigos todavia
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant font-body">
                      Busca usuarios por su @usuario de GitHub para enviar
                      solicitudes.
                    </p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div
                      key={friend.friendshipId}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <AvatarBubble
                          url={friend.avatarUrl}
                          fallback={initials(friend.displayName)}
                        />
                        <div>
                          <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                            {friend.displayName}
                          </p>
                          <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                            @{friend.username}
                          </p>
                          <p className="mt-1 text-[11px] text-on-surface-variant">
                            {formatLastSeen(friend.lastSeenAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Invite to room dropdown */}
                        {ownedRooms.length > 0 && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setInviteDropdownFor(
                                  inviteDropdownFor === friend.id
                                    ? null
                                    : friend.id,
                                )
                              }
                              className={`${btnBase} bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant px-4 py-2 text-[10px] hover:brightness-105`}
                            >
                              <Shield size={12} />
                              {social.inviteCta}
                              <ChevronDown size={10} />
                            </button>
                            {inviteDropdownFor === friend.id && (
                              <div className="absolute right-0 top-full z-10 mt-1 min-w-48 border-2 border-outline-variant bg-surface-container shadow-lg">
                                {ownedRooms.map((room) => (
                                  <button
                                    key={room.code}
                                    type="button"
                                    onClick={() =>
                                      void handleInviteToRoom(
                                        friend.id,
                                        room.code,
                                      )
                                    }
                                    className="flex w-full items-center gap-2 px-4 py-3 text-left font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-highest transition"
                                  >
                                    <Crown
                                      size={12}
                                      className="text-secondary"
                                    />
                                    {room.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {ownedRooms.length === 0 && (
                          <span
                            className={`${btnBase} bg-surface-container-highest text-outline border-2 border-outline-variant/30 px-4 py-2 text-[10px] cursor-not-allowed opacity-60`}
                          >
                            <Lock size={12} />
                            {social.inviteCta}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => void handleRemoveFriend(friend.id)}
                          className="flex h-9 w-9 items-center justify-center border-2 border-outline-variant/50 bg-surface-container-highest text-outline hover:border-primary/50 hover:text-primary steps-bezel"
                          aria-label={`Eliminar a ${friend.displayName}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Requests tab */}
            {activeTab === "requests" && (
              <div>
                {/* Incoming */}
                <div className="px-5 pt-4 pb-2">
                  <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">
                    Recibidas ({pendingRequests.incoming.length})
                  </span>
                </div>
                <div className="divide-y divide-surface-container-highest">
                  {pendingRequests.incoming.length === 0 ? (
                    <div className="px-5 pb-4">
                      <p className="text-xs text-on-surface-variant font-body">
                        No hay solicitudes pendientes.
                      </p>
                    </div>
                  ) : (
                    pendingRequests.incoming.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between gap-4 px-5 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <AvatarBubble
                            url={req.avatarUrl}
                            fallback={initials(req.displayName)}
                          />
                          <div>
                            <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                              {req.displayName}
                            </p>
                            <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                              @{req.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAcceptRequest(req.id)}
                            className={`${btnBase} bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant px-4 py-2 text-[10px] hover:brightness-105`}
                          >
                            <Check size={12} />
                            Aceptar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeclineRequest(req.id)}
                            className="flex h-9 w-9 items-center justify-center border-2 border-outline-variant/50 bg-surface-container-highest text-outline hover:border-primary/50 hover:text-primary steps-bezel"
                            aria-label={`Rechazar a ${req.displayName}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Outgoing */}
                <div className="px-5 pt-4 pb-2 border-t-4 border-surface-container-highest">
                  <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                    Enviadas ({pendingRequests.outgoing.length})
                  </span>
                </div>
                <div className="divide-y divide-surface-container-highest">
                  {requestsError ? (
                    <div className="px-5 pb-4">
                      <ErrorBlock
                        message="No se pudieron cargar las solicitudes enviadas."
                        onRetry={() => void fetchRequests()}
                      />
                    </div>
                  ) : pendingRequests.outgoing.length === 0 ? (
                    <div className="px-5 pb-4">
                      <p className="text-xs text-on-surface-variant font-body">
                        No has enviado solicitudes.
                      </p>
                    </div>
                  ) : (
                    pendingRequests.outgoing.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between gap-4 px-5 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <AvatarBubble
                            url={req.avatarUrl}
                            fallback={initials(req.displayName)}
                          />
                          <div>
                            <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                              {req.displayName}
                            </p>
                            <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                              @{req.username}
                            </p>
                          </div>
                        </div>
                        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-primary-container">
                          Pendiente
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Footer link */}
            <div className="border-t-4 border-surface-container-highest p-4">
              <span className="inline-flex items-center gap-1 font-headline text-xs font-bold uppercase tracking-widest text-primary">
                {friends.length} amigo{friends.length !== 1 ? "s" : ""} en el
                gremio
                <ArrowUpRight size={14} />
              </span>
            </div>
          </div>
        </section>

        {/* ---- RIGHT: Rooms + Invitations ---- */}
        <aside className="space-y-6 xl:col-span-4">
          {/* Rooms Panel */}
          <div className="gsap-rise bg-surface-container pixel-border">
            <div className="border-b-4 border-surface-container-highest p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border-2 border-secondary bg-surface-container-highest">
                  <Crown size={16} className="text-secondary" />
                </div>
                <h3 className="text-lg font-headline font-black uppercase tracking-tighter text-secondary">
                  {social.partyTitle}
                </h3>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* Create room inline */}
              {showCreateRoom && (
                <div className="border-2 border-tertiary bg-surface-container-low p-4">
                  <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">
                    Crear nueva sala
                  </p>
                  <div className="grid gap-3">
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Nombre de la sala..."
                      className="w-full rounded-none border-2 border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-primary font-body"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomPrivacy("private")}
                        className={`border-2 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-widest ${roomPrivacy === "private" ? "border-primary bg-primary/15 text-primary" : "border-outline-variant bg-surface-container text-outline"}`}
                      >
                        Privada
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomPrivacy("public")}
                        className={`border-2 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-widest ${roomPrivacy === "public" ? "border-primary bg-primary/15 text-primary" : "border-outline-variant bg-surface-container text-outline"}`}
                      >
                        Publica
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCreateRoom()}
                        className={`${btnBase} flex-1 bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant px-4 py-2 text-[10px] hover:brightness-105`}
                      >
                        <Plus size={12} />
                        Crear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateRoom(false);
                          setNewRoomName("");
                          setRoomPrivacy("private");
                        }}
                        className="flex h-9 w-9 items-center justify-center border-2 border-outline-variant/50 bg-surface-container-highest text-outline hover:text-primary steps-bezel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Join room by code */}
              <div className="border-2 border-dashed border-outline-variant/50 bg-surface-container-low p-4">
                <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Unirse con codigo
                </p>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Codigo de sala..."
                    className="w-full rounded-none border-2 border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary font-body"
                  />
                  <button
                    type="button"
                    onClick={() => void handleJoinRoom(joinCode, inviteCode)}
                    disabled={!joinCode.trim()}
                    className={`${btnBase} bg-surface-container-highest text-on-surface border-2 border-outline-variant px-3 py-2 text-[10px] hover:border-primary/50 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <DoorOpen size={12} />
                    Entrar
                  </button>
                </div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Codigo de invitacion (si la sala es privada)"
                  className="mt-2 w-full rounded-none border-2 border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary font-body"
                />
              </div>

              {/* My rooms list */}
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <div
                    key={room.code}
                    className="border-2 border-secondary/30 bg-surface-container-low p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-4 border-secondary bg-secondary-container">
                          <Crown size={14} className="text-secondary" />
                        </div>
                        <div>
                          <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                            {room.name}
                          </p>
                          <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                            {room.memberCount} miembro
                            {room.memberCount !== 1 ? "s" : ""} ·{" "}
                            {room.privacy === "private" ? "Privada" : "Publica"}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 border-2 border-outline-variant bg-surface-container px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
                        {room.code}
                      </span>
                    </div>
                    {room.ownerId === sanctuary.currentUserId &&
                      (activeInvitesByRoom[room.code]?.length ?? 0) > 0 && (
                        <div className="mt-3 space-y-2 border-t border-outline-variant/30 pt-3">
                          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                            Invitaciones activas (
                            {activeInvitesByRoom[room.code].length})
                          </p>
                          {activeInvitesByRoom[room.code].map((invitation) => (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between gap-2 border-2 border-outline-variant/40 bg-surface-container px-2 py-2"
                            >
                              <div>
                                <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface">
                                  {invitation.invitee.displayName}
                                </p>
                                <p className="text-[10px] text-outline">
                                  {invitation.inviteCode}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRevokeInvitation(
                                    room.code,
                                    invitation.id,
                                  )
                                }
                                className="flex h-7 items-center justify-center border-2 border-outline-variant/50 bg-surface-container-highest px-2 text-[10px] font-headline font-bold uppercase tracking-widest text-outline hover:text-primary steps-bezel"
                              >
                                Revocar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(true)}
                  className="flex w-full items-center gap-3 border-2 border-dashed border-outline-variant/50 bg-surface-container-low p-4 text-left hover:border-primary/50 steps-bezel group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-dashed border-outline-variant/30 bg-surface-container">
                    <Plus
                      size={16}
                      className="text-outline group-hover:text-primary steps-bezel"
                    />
                  </div>
                  <div>
                    <p className="font-headline text-sm font-bold uppercase tracking-tight text-outline group-hover:text-on-surface steps-bezel">
                      {social.emptySlotLabel}
                    </p>
                    <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline-variant">
                      {social.emptySlotHint}
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Invitations Board */}
          <div className="gsap-rise bg-surface-container pixel-border">
            <div className="border-b-4 border-surface-container-highest p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border-2 border-tertiary bg-surface-container-highest">
                  <MessageSquare size={16} className="text-tertiary" />
                </div>
                <h3 className="text-lg font-headline font-black uppercase tracking-tighter text-tertiary">
                  {social.boardTitle}
                </h3>
                {invitationCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center bg-tertiary px-1 font-headline text-[10px] font-bold text-on-tertiary">
                    {invitationCount}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-0 divide-y divide-surface-container-highest">
              {roomInvitations.length === 0 && incomingCount === 0 ? (
                <div className="p-6 text-center">
                  <Mail
                    size={24}
                    className="mx-auto mb-2 text-outline-variant"
                  />
                  <p className="font-headline text-xs font-bold uppercase tracking-tight text-outline">
                    Sin novedades
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant font-body">
                    Las invitaciones a salas y solicitudes de amistad apareceran
                    aqui.
                  </p>
                </div>
              ) : (
                <>
                  {/* Room invitations */}
                  {roomInvitations.map((inv) => (
                    <div key={inv.id} className="p-5">
                      <div className="border-l-4 border-tertiary bg-surface-container-low pixel-border-inset px-4 py-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="font-headline text-xs font-black uppercase tracking-tight text-on-surface">
                            {inv.inviter.displayName}
                          </span>
                          <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                            Sala
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-on-surface-variant font-body">
                          Te invita a unirte a{" "}
                          <span className="font-headline font-bold text-tertiary">
                            {inv.roomName}
                          </span>
                        </p>
                        {inv.expiresAt && (
                          <p className="mt-1 text-[10px] font-headline uppercase tracking-widest text-outline">
                            Expira: {new Date(inv.expiresAt).toLocaleString()}
                          </p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAcceptInvitation(inv.id)}
                            className={`${btnBase} bg-primary text-on-primary border-b-[3px] border-on-primary-fixed-variant px-3 py-2 text-[10px] hover:brightness-105`}
                          >
                            <Check size={12} />
                            Aceptar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeclineInvitation(inv.id)}
                            className="flex h-8 items-center justify-center border-2 border-outline-variant/50 bg-surface-container-highest px-3 text-[10px] font-headline font-bold uppercase tracking-widest text-outline hover:text-primary steps-bezel"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pending friend requests as notifications */}
                  {pendingRequests.incoming.map((req) => (
                    <div key={req.id} className="p-5">
                      <div className="border-l-4 border-primary bg-surface-container-low pixel-border-inset px-4 py-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="font-headline text-xs font-black uppercase tracking-tight text-on-surface">
                            {req.displayName}
                          </span>
                          <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                            Amistad
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-on-surface-variant font-body">
                          Quiere unirse a tu gremio de escribas.
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="gsap-rise bg-surface-container pixel-border">
          <div className="border-b-4 border-surface-container-highest p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-surface-container-highest">
                  <MessageSquare size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-headline font-black uppercase tracking-tighter text-on-surface">
                    Feed del gremio
                  </h3>
                  <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                    Actividad reciente entre amistades
                  </p>
                </div>
              </div>
              {isSocialMetricsLoading ? (
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Actualizando...
                </span>
              ) : null}
            </div>
          </div>

          <div className="divide-y divide-surface-container-highest">
            {feedItems.length === 0 ? (
              <div className="p-6 text-center">
                <Users
                  size={24}
                  className="mx-auto mb-2 text-outline-variant"
                />
                <p className="font-headline text-xs font-bold uppercase tracking-tight text-outline">
                  El feed está tranquilo
                </p>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Completa sesiones con tu círculo o mantén la racha para que el
                  gremio empiece a moverse.
                </p>
              </div>
            ) : (
              feedItems.map((item) => (
                <article key={item.id} className="flex items-start gap-4 p-5">
                  <AvatarBubble
                    url={item.actor.avatarUrl}
                    fallback={initials(item.actor.displayName)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                        {item.actor.displayName}
                      </p>
                      <span
                        className={`border px-2 py-1 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ${
                          item.type === "streak"
                            ? "border-tertiary bg-tertiary/10 text-tertiary"
                            : "border-primary bg-primary/10 text-primary"
                        }`}
                      >
                        {item.type === "streak" ? "Racha" : "Sesión"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                      {item.message}
                    </p>
                    <p className="mt-2 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                      @{item.actor.username} · {formatFeedTime(item.happenedAt)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="gsap-rise bg-surface-container pixel-border">
            <div className="border-b-4 border-surface-container-highest p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center border-2 border-tertiary bg-surface-container-highest">
                    <Crown size={16} className="text-tertiary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-headline font-black uppercase tracking-tighter text-tertiary">
                      Ranking semanal
                    </h3>
                    <p className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
                      {leaderboardRange || "Semana actual"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-surface-container-highest">
              {leaderboard.length === 0 ? (
                <div className="p-6 text-center">
                  <Crown
                    size={24}
                    className="mx-auto mb-2 text-outline-variant"
                  />
                  <p className="font-headline text-xs font-bold uppercase tracking-tight text-outline">
                    Sin puntos esta semana
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    El ranking se llenará en cuanto vuelvan a caer sesiones de
                    foco.
                  </p>
                </div>
              ) : (
                leaderboard.map((entry) => (
                  <div
                    key={entry.user.id}
                    className={`flex items-center gap-4 p-4 ${
                      entry.isCurrentUser ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-outline-variant bg-surface-container-highest font-headline text-sm font-black text-primary">
                      {entry.rank}
                    </div>
                    <AvatarBubble
                      url={entry.user.avatarUrl}
                      fallback={initials(entry.user.displayName)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-headline text-sm font-black uppercase tracking-tight text-on-surface">
                        {entry.user.displayName}
                      </p>
                      <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-outline">
                        @{entry.user.username}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-headline text-sm font-black text-tertiary">
                        {entry.focusMinutes} min
                      </p>
                      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                        {entry.sessionsCount} sesiones
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="gsap-rise bg-surface-container pixel-border p-6">
            <div className="mb-4 flex items-center gap-3">
              <Shield size={18} className="text-secondary" />
              <h3 className="text-lg font-headline font-black uppercase tracking-tight text-secondary">
                Privacidad social
              </h3>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void handleTogglePrivacy("shareActivity")}
                className={`inline-flex w-full items-center justify-between border-2 px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.2em] ${
                  sanctuary.socialPrivacy.shareActivity
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant bg-surface-container-low text-on-surface"
                }`}
              >
                <span>Compartir actividad</span>
                <span>
                  {sanctuary.socialPrivacy.shareActivity ? "Visible" : "Oculta"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => void handleTogglePrivacy("showOnLeaderboard")}
                className={`inline-flex w-full items-center justify-between border-2 px-4 py-3 font-headline text-[10px] font-bold uppercase tracking-[0.2em] ${
                  sanctuary.socialPrivacy.showOnLeaderboard
                    ? "border-tertiary bg-tertiary/10 text-tertiary"
                    : "border-outline-variant bg-surface-container-low text-on-surface"
                }`}
              >
                <span>Salir del ranking</span>
                <span>
                  {sanctuary.socialPrivacy.showOnLeaderboard
                    ? "Mostrado"
                    : "Oculto"}
                </span>
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
              Estos controles se guardan en tu cuenta y afectan al feed y al
              ranking semanal del gremio.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
