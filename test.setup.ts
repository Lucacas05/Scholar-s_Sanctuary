import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

class MockBroadcastChannel {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  postMessage() {}

  close() {}

  addEventListener() {}

  removeEventListener() {}
}

class MockResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

class MockIntersectionObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

class MockAudioContext {
  currentTime = 0;
  destination = {};

  createOscillator() {
    return {
      connect() {},
      start() {},
      stop() {},
      frequency: {
        setValueAtTime() {},
      },
      type: "sine",
    };
  }

  createGain() {
    return {
      connect() {},
      gain: {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
    };
  }
}

class MockNotification {
  static permission: NotificationPermission = "default";

  static requestPermission() {
    return Promise.resolve("granted" as NotificationPermission);
  }

  constructor(_title: string, _options?: NotificationOptions) {}
}

Object.defineProperty(globalThis, "BroadcastChannel", {
  value: MockBroadcastChannel,
  writable: true,
});

Object.defineProperty(globalThis, "ResizeObserver", {
  value: MockResizeObserver,
  writable: true,
});

Object.defineProperty(globalThis, "IntersectionObserver", {
  value: MockIntersectionObserver,
  writable: true,
});

Object.defineProperty(globalThis, "AudioContext", {
  value: MockAudioContext,
  writable: true,
});

Object.defineProperty(globalThis, "Notification", {
  value: MockNotification,
  writable: true,
});

Object.defineProperty(globalThis, "matchMedia", {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }),
  writable: true,
});

Object.defineProperty(window, "scrollTo", {
  value: () => {},
  writable: true,
});

process.env.LUMINA_DB_PATH ??= join(
  tmpdir(),
  `lumina-vitest-${process.env.VITEST_WORKER_ID ?? "0"}.db`,
);

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      let payload: unknown = {};

      if (url.includes("/api/pomodoro/stats")) {
        payload = {
          totalSessions: 0,
          totalFocusSeconds: 0,
          avgFocusSeconds: 0,
          streakDays: 0,
          daily: [],
        };
      }

      return new Response(JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      });
    }),
  );

  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(Date.now()), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) =>
    window.clearTimeout(id),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
