import type http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/session";
import type { AvatarConfig } from "@/lib/sanctuary/store";
import type {
  ClientMessage,
  ServerMessage,
  RoomMemberPresence,
  PresenceState,
  TimerPhase,
  TimerStatus,
} from "@/lib/server/ws-types";

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

/** userId -> WebSocket */
const connectedClients = new Map<string, WebSocket>();

/** roomCode -> Set<userId> */
const roomOccupants = new Map<string, Set<string>>();

/** userId -> current presence data */
interface PresenceData {
  state: PresenceState;
  phase: TimerPhase;
  status: TimerStatus;
  remainingSeconds: number;
  message: string;
  lastSeenAt: string | null;
}
const userPresences = new Map<string, PresenceData>();

/** userId -> roomCode the user is currently in */
const userRooms = new Map<string, string>();

/** userId -> cached profile (populated on connect) */
interface CachedProfile {
  username: string;
  displayName: string;
  avatar: AvatarConfig;
  lastSeenAt: string | null;
}
const userProfiles = new Map<string, CachedProfile>();

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const checkRoomMembership = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

const getUserProfile = db.prepare(
  "SELECT id, username, display_name, avatar_url, state_json, last_seen_at FROM users WHERE id = ?",
);

const setUserOnlineStatement = db.prepare(
  "UPDATE users SET last_seen_at = NULL, updated_at = datetime('now') WHERE id = ?",
);

const setUserLastSeenStatement = db.prepare(
  "UPDATE users SET last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
);

// ---------------------------------------------------------------------------
// Default avatar used when state_json has no avatar for the user
// ---------------------------------------------------------------------------

const defaultAvatar: AvatarConfig = {
  sex: "masculino",
  skinTone: "peach",
  hairStyle: "short-01-buzzcut",
  hairColor: "brown",
  accessory: "ninguno",
  upper: "shirt-01-longsleeve",
  upperColor: "navy",
  lower: "pants-03-pants",
  lowerColor: "black",
  socks: "socks-01-ankle",
  socksColor: "white",
};

// ---------------------------------------------------------------------------
// Cookie parsing helper
// ---------------------------------------------------------------------------

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const [name, ...rest] = pair.trim().split("=");
    if (name) cookies[name] = rest.join("=");
  });
  return cookies;
}

// ---------------------------------------------------------------------------
// Avatar extraction from state_json
// ---------------------------------------------------------------------------

function extractAvatar(
  stateJson: string | null | undefined,
  userId: string,
): AvatarConfig {
  if (!stateJson) return defaultAvatar;

  try {
    const state = JSON.parse(stateJson);
    const avatar = state?.profiles?.[userId]?.avatar;
    if (avatar && typeof avatar === "object") {
      return avatar as AvatarConfig;
    }
  } catch {
    // Malformed JSON — fall back to default
  }

  return defaultAvatar;
}

// ---------------------------------------------------------------------------
// Profile loading
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  state_json: string | null;
  last_seen_at: string | null;
}

function loadAndCacheProfile(userId: string): CachedProfile | null {
  const row = getUserProfile.get(userId) as UserRow | undefined;
  if (!row) return null;

  const profile: CachedProfile = {
    username: row.username,
    displayName: row.display_name,
    avatar: extractAvatar(row.state_json, userId),
    lastSeenAt: row.last_seen_at,
  };

  userProfiles.set(userId, profile);
  return profile;
}

// ---------------------------------------------------------------------------
// Build a RoomMemberPresence from in-memory state
// ---------------------------------------------------------------------------

function buildMemberPresence(userId: string): RoomMemberPresence | null {
  const profile = userProfiles.get(userId) ?? loadAndCacheProfile(userId);
  if (!profile) return null;

  const presence = userPresences.get(userId) ?? {
    state: "idle" as const,
    phase: "focus" as const,
    status: "idle" as const,
    remainingSeconds: 0,
    message: "",
    lastSeenAt: profile.lastSeenAt,
  };

  return {
    userId,
    username: profile.username,
    displayName: profile.displayName,
    avatar: profile.avatar,
    state: presence.state,
    phase: presence.phase,
    status: presence.status,
    remainingSeconds: presence.remainingSeconds,
    message: presence.message,
    lastSeenAt: presence.lastSeenAt,
  };
}

// ---------------------------------------------------------------------------
// Broadcast / notify helpers
// ---------------------------------------------------------------------------

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(
  roomCode: string,
  message: ServerMessage,
  excludeUserId?: string,
): void {
  const occupants = roomOccupants.get(roomCode);
  if (!occupants) return;

  for (const uid of occupants) {
    if (uid === excludeUserId) continue;
    const ws = connectedClients.get(uid);
    if (ws) send(ws, message);
  }
}

/**
 * Push a message to a specific user if they are connected.
 * Exported so REST API handlers can send real-time notifications
 * (e.g. friend requests, room invitations) through the WebSocket channel.
 */
function notifyUser(userId: string, message: ServerMessage): void {
  const ws = connectedClients.get(userId);
  if (ws) send(ws, message);
}

// ---------------------------------------------------------------------------
// Room join / leave logic
// ---------------------------------------------------------------------------

function leaveCurrentRoom(userId: string): void {
  const roomCode = userRooms.get(userId);
  if (!roomCode) return;

  const occupants = roomOccupants.get(roomCode);
  if (occupants) {
    occupants.delete(userId);
    if (occupants.size === 0) {
      roomOccupants.delete(roomCode);
    }
  }

  userRooms.delete(userId);

  broadcastToRoom(roomCode, { type: "member-left", userId });
}

function handleJoinRoom(userId: string, roomCode: string, ws: WebSocket): void {
  // Verify the user is a member of this room in the database
  const isMember = checkRoomMembership.get(roomCode, userId);
  if (!isMember) {
    console.debug(
      `[ws] join-room denied: user ${userId} is not a member of room ${roomCode}`,
    );
    send(ws, { type: "error", message: "You are not a member of this room." });
    return;
  }

  // If already in a different room, leave it first
  const currentRoom = userRooms.get(userId);
  if (currentRoom && currentRoom !== roomCode) {
    leaveCurrentRoom(userId);
  }

  // Add to room occupants
  if (!roomOccupants.has(roomCode)) {
    roomOccupants.set(roomCode, new Set());
  }
  roomOccupants.get(roomCode)!.add(userId);
  userRooms.set(userId, roomCode);

  // Initialize presence if the user doesn't have one yet
  if (!userPresences.has(userId)) {
    userPresences.set(userId, {
      state: "idle",
      phase: "focus",
      status: "idle",
      remainingSeconds: 0,
      message: "",
      lastSeenAt: null,
    });
  }

  // Build the presence object for the joining user
  const joinerPresence = buildMemberPresence(userId);
  if (joinerPresence) {
    broadcastToRoom(
      roomCode,
      { type: "member-joined", member: joinerPresence },
      userId,
    );
  }

  // Send the full room state to the user who just joined
  const occupants = roomOccupants.get(roomCode)!;
  const members: RoomMemberPresence[] = [];
  for (const uid of occupants) {
    const mp = buildMemberPresence(uid);
    if (mp) members.push(mp);
  }
  console.debug(
    `[ws] user ${userId} joined room ${roomCode}, occupants: ${occupants.size}`,
  );
  send(ws, { type: "room-state", members });
}

function handleLeaveRoom(userId: string): void {
  leaveCurrentRoom(userId);
}

// ---------------------------------------------------------------------------
// Presence update
// ---------------------------------------------------------------------------

function handlePresenceUpdate(
  userId: string,
  state: PresenceState,
  phase: TimerPhase,
  status: TimerStatus,
  remainingSeconds: number,
  message: string,
): void {
  userPresences.set(userId, {
    state,
    phase,
    status,
    remainingSeconds,
    message,
    lastSeenAt: state === "offline" ? new Date().toISOString() : null,
  });

  const roomCode = userRooms.get(userId);
  if (roomCode) {
    broadcastToRoom(
      roomCode,
      {
        type: "presence-changed",
        userId,
        state,
        phase,
        status,
        remainingSeconds,
        message,
        lastSeenAt: state === "offline" ? new Date().toISOString() : null,
      },
      userId,
    );
  }
}

// ---------------------------------------------------------------------------
// Connection cleanup
// ---------------------------------------------------------------------------

function handleDisconnect(userId: string): void {
  leaveCurrentRoom(userId);
  setUserLastSeenStatement.run(userId);
  connectedClients.delete(userId);
  userPresences.delete(userId);
  userProfiles.delete(userId);
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

function handleMessage(userId: string, ws: WebSocket, raw: string): void {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    send(ws, { type: "error", message: "Invalid JSON" });
    return;
  }

  switch (msg.type) {
    case "join-room":
      handleJoinRoom(userId, msg.roomCode, ws);
      break;
    case "leave-room":
      handleLeaveRoom(userId);
      break;
    case "presence-update":
      handlePresenceUpdate(
        userId,
        msg.state,
        msg.phase,
        msg.status,
        msg.remainingSeconds,
        msg.message,
      );
      break;
    case "ping":
      send(ws, { type: "pong" });
      break;
    default:
      send(ws, { type: "error", message: "Unknown message type" });
  }
}

// ---------------------------------------------------------------------------
// Heartbeat — detect stale connections
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 30_000;
const ALIVE_KEY = Symbol("alive");

type ExtendedWebSocket = WebSocket & { [ALIVE_KEY]?: boolean };

function setupHeartbeat(wss: WebSocketServer): NodeJS.Timeout {
  return setInterval(() => {
    for (const rawWs of wss.clients) {
      const ws = rawWs as ExtendedWebSocket;
      if (ws[ALIVE_KEY] === false) {
        ws.terminate();
        continue;
      }
      ws[ALIVE_KEY] = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Main entry point — attach WS server to an existing http.Server
// ---------------------------------------------------------------------------

function attachWebSocketServer(server: http.Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // Start heartbeat timer
  const heartbeatTimer = setupHeartbeat(wss);

  // Clean up on server close
  server.on("close", () => {
    clearInterval(heartbeatTimer);
    wss.close();
  });

  // Handle HTTP upgrade requests
  server.on("upgrade", (req, socket, head) => {
    // Only handle upgrades to /ws — let everything else through (e.g. Vite HMR)
    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "localhost"}`,
    );
    if (url.pathname !== "/ws") return;

    // Parse session cookie
    const cookieHeader = req.headers.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies["sanctuary_session"];

    if (!sessionId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const session = getSession(sessionId);
    if (!session) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const userId = session.user.id;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, userId);
    });
  });

  // Handle new connections
  wss.on(
    "connection",
    (rawWs: WebSocket, _req: http.IncomingMessage, userId: string) => {
      const ws = rawWs as ExtendedWebSocket;
      ws[ALIVE_KEY] = true;

      // If the user already has an active connection, close the old one
      const existingWs = connectedClients.get(userId);
      if (existingWs) {
        send(existingWs as WebSocket, {
          type: "error",
          message: "Connection replaced by a new session.",
        });
        existingWs.close(4000, "Replaced");
        handleDisconnect(userId);
      }

      connectedClients.set(userId, ws);
      setUserOnlineStatement.run(userId);

      // Pre-load the user's profile into cache
      loadAndCacheProfile(userId);

      // Message handler
      ws.on("message", (data) => {
        const raw = typeof data === "string" ? data : data.toString("utf-8");
        handleMessage(userId, ws, raw);
      });

      // Pong handler for heartbeat
      ws.on("pong", () => {
        (ws as ExtendedWebSocket)[ALIVE_KEY] = true;
      });

      // Cleanup on close
      ws.on("close", () => {
        handleDisconnect(userId);
      });

      // Cleanup on error
      ws.on("error", (err) => {
        console.error(`[ws] Error for user ${userId}:`, err.message);
        handleDisconnect(userId);
      });
    },
  );

  console.log("[ws] WebSocket server initialized on path /ws");
}

export { attachWebSocketServer, notifyUser };
