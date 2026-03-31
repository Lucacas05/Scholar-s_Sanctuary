import type {
  ClientMessage,
  ServerMessage,
  PresenceState,
  TimerPhase,
  TimerStatus,
} from "@/lib/server/ws-types";
import { sanctuaryActions } from "@/lib/sanctuary/store";

let ws: WebSocket | null = null;
let currentRoomCode: string | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let awayTimer: ReturnType<typeof setTimeout> | null = null;
let awayListenersBound = false;
let awayActive = false;
let desiredPresence: {
  state: PresenceState;
  phase: TimerPhase;
  status: TimerStatus;
  remainingSeconds: number;
  message: string;
} | null = null;
const messageListeners = new Set<(msg: ServerMessage) => void>();

const MAX_RECONNECT_DELAY = 30_000;
const AWAY_TIMEOUT_MS = 5 * 60 * 1000;

function isBrowser() {
  return typeof window !== "undefined";
}

function clearTimers() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (pingTimer !== null) {
    clearInterval(pingTimer);
    pingTimer = null;
  }

  if (awayTimer !== null) {
    clearTimeout(awayTimer);
    awayTimer = null;
  }
}

function rawSend(msg: ClientMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function scheduleAway() {
  if (!isBrowser() || !desiredPresence) {
    return;
  }

  if (awayTimer !== null) {
    clearTimeout(awayTimer);
  }

  awayTimer = setTimeout(() => {
    if (!desiredPresence || awayActive) {
      return;
    }

    awayActive = true;
    rawSend({
      type: "presence-update",
      state: "away",
      phase: desiredPresence.phase,
      status: desiredPresence.status,
      remainingSeconds: desiredPresence.remainingSeconds,
      message: "",
    });
  }, AWAY_TIMEOUT_MS);
}

function registerActivity() {
  if (!desiredPresence) {
    return;
  }

  if (awayActive) {
    awayActive = false;
    rawSend({
      type: "presence-update",
      ...desiredPresence,
    });
  }

  scheduleAway();
}

function bindAwayListeners() {
  if (!isBrowser() || awayListenersBound) {
    return;
  }

  awayListenersBound = true;
  ["pointerdown", "keydown", "mousemove", "touchstart", "focus"].forEach(
    (eventName) => {
      window.addEventListener(eventName, registerActivity, { passive: true });
    },
  );
}

function scheduleReconnect() {
  if (reconnectTimer !== null) {
    return;
  }

  const delay = Math.min(
    1000 * Math.pow(2, reconnectAttempts),
    MAX_RECONNECT_DELAY,
  );
  reconnectAttempts += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function handleMessage(event: MessageEvent) {
  let msg: ServerMessage;

  try {
    msg = JSON.parse(event.data as string) as ServerMessage;
  } catch {
    return;
  }

  switch (msg.type) {
    case "room-state":
      console.debug(
        "[realtime] room-state received, members:",
        msg.members.length,
      );
      sanctuaryActions.setRemotePresences(msg.members);
      break;
    case "member-joined":
      console.debug("[realtime] member-joined:", msg.member.userId);
      sanctuaryActions.addRemotePresence(msg.member);
      break;
    case "member-left":
      console.debug("[realtime] member-left:", msg.userId);
      sanctuaryActions.removeRemotePresence(msg.userId);
      break;
    case "presence-changed":
      sanctuaryActions.updateRemotePresence(msg);
      break;
    case "pong":
      break;
    case "error":
      console.warn("[realtime] server error:", msg.message);
      break;
    default:
      break;
  }

  messageListeners.forEach((listener) => listener(msg));
}

export function connect() {
  if (!isBrowser()) {
    return;
  }

  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${window.location.host}/ws`;

  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  bindAwayListeners();

  ws.addEventListener("open", () => {
    reconnectAttempts = 0;
    awayActive = false;

    pingTimer = setInterval(() => {
      rawSend({ type: "ping" });
    }, 25_000);

    if (currentRoomCode) {
      rawSend({ type: "join-room", roomCode: currentRoomCode });
    }

    if (desiredPresence) {
      rawSend({
        type: "presence-update",
        ...desiredPresence,
      });
      scheduleAway();
    }
  });

  ws.addEventListener("close", () => {
    clearTimers();
    ws = null;
    scheduleReconnect();
  });

  ws.addEventListener("error", () => {
    // close handler will schedule reconnect
  });

  ws.addEventListener("message", handleMessage);
}

export function disconnect() {
  clearTimers();
  currentRoomCode = null;
  reconnectAttempts = 0;
  awayActive = false;
  desiredPresence = null;

  if (ws) {
    ws.close();
    ws = null;
  }
}

export function send(msg: ClientMessage) {
  rawSend(msg);
}

export function joinRoom(roomCode: string) {
  currentRoomCode = roomCode;
  connect();
  rawSend({ type: "join-room", roomCode });
}

export function leaveRoom() {
  send({ type: "leave-room" });
  currentRoomCode = null;
}

export function sendPresenceUpdate(
  state: PresenceState,
  phase: TimerPhase,
  status: TimerStatus,
  remainingSeconds: number,
  message: string,
) {
  desiredPresence = {
    state,
    phase,
    status,
    remainingSeconds,
    message,
  };

  awayActive = false;
  connect();
  rawSend({
    type: "presence-update",
    state,
    phase,
    status,
    remainingSeconds,
    message,
  });
  scheduleAway();
}

export function onMessage(listener: (msg: ServerMessage) => void) {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

export function isConnected() {
  return ws?.readyState === WebSocket.OPEN;
}
