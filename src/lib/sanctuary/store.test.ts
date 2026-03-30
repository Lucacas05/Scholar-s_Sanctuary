import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetSanctuaryStoreForTests,
  getCurrentPresence,
  getCurrentTimer,
  getFullState,
  hydrateFromServer,
  sanctuaryActions,
} from "./store";

describe("store del santuario", () => {
  beforeEach(() => {
    __resetSanctuaryStoreForTests();
  });

  it("completa el onboarding y guarda las preferencias base", () => {
    sanctuaryActions.connectGitHubAccount({
      id: "github-1",
      displayName: "Faby",
      username: "faby",
    });

    sanctuaryActions.completeOnboarding({
      displayName: "Fabian",
      goal: "Estudiar sin romper la racha",
      preferredStartPath: "/estudio",
    });

    const state = getFullState();

    expect(state.onboardingCompleted).toBe(true);
    expect(state.onboardingGoal).toBe("Estudiar sin romper la racha");
    expect(state.preferredStartPath).toBe("/estudio");
    expect(state.profiles[state.currentUserId!]?.displayName).toBe("Fabian");
  });

  it("mueve el timer entre iniciar, pausar y reiniciar con la presencia correcta", () => {
    sanctuaryActions.connectGitHubAccount({
      id: "github-2",
      displayName: "Lucas",
      username: "lucas",
    });

    sanctuaryActions.startTimer("solo", "santuario-silencioso");
    let state = getFullState();
    let timer = getCurrentTimer(state);
    let presence = getCurrentPresence(state);

    expect(timer.status).toBe("running");
    expect(timer.phase).toBe("focus");
    expect(presence?.state).toBe("studying");

    sanctuaryActions.pauseTimer();
    state = getFullState();
    timer = getCurrentTimer(state);
    presence = getCurrentPresence(state);

    expect(timer.status).toBe("paused");
    expect(presence?.state).toBe("idle");

    sanctuaryActions.resetTimer("solo", "santuario-silencioso");
    state = getFullState();
    timer = getCurrentTimer(state);
    presence = getCurrentPresence(state);

    expect(timer.status).toBe("idle");
    expect(timer.phase).toBe("focus");
    expect(presence?.state).toBe("idle");
  });

  it("arranca sin perfiles demo en la biblioteca pública", () => {
    const state = getFullState();

    expect(Object.keys(state.profiles)).toHaveLength(0);
    expect(state.rooms["gran-lectorio"]?.memberIds).toEqual([]);
    expect(Object.keys(state.presences)).toHaveLength(0);
    expect(state.friendIds).toEqual([]);
  });

  it("conserva el avatar local si el servidor hidrata un estado más viejo", () => {
    sanctuaryActions.connectGitHubAccount({
      id: "github-3",
      displayName: "Inés",
      username: "ines",
    });

    const staleServerState = getFullState();

    sanctuaryActions.updateAvatar("upper", "shirt-05-vneck-tee");
    sanctuaryActions.updateAvatar("upperColor", "cerise");
    sanctuaryActions.updateAvatar("accessory", "bigote");

    hydrateFromServer(staleServerState);

    const state = getFullState();
    expect(state.profiles["github-3"]?.avatar.upper).toBe("shirt-05-vneck-tee");
    expect(state.profiles["github-3"]?.avatar.upperColor).toBe("cerise");
    expect(state.profiles["github-3"]?.avatar.accessory).toBe("bigote");
  });

  it("limpia perfiles demo de estados viejos guardados", () => {
    hydrateFromServer({
      version: 9,
      sessionState: "authenticated",
      currentUserId: "github-1",
      currentRoomCode: "gran-lectorio",
      profiles: {
        "github-1": {
          id: "github-1",
          displayName: "Faby",
          handle: "@faby",
          avatar: {
            sex: "masculino",
            skinTone: "amber",
            hairStyle: "short-02-parted",
            hairColor: "brown",
            accessory: "ninguno",
            upper: "shirt-01-longsleeve",
            upperColor: "smoke",
            lower: "pants-03-pants",
            lowerColor: "umber",
            socks: "socks-01-ankle",
            socksColor: "cream",
          },
          bio: "",
          createdAt: Date.now(),
        },
        "demo-lyra": {
          id: "demo-lyra",
          displayName: "Lyra",
          handle: "@lyra",
          avatar: {},
          bio: "",
          createdAt: Date.now(),
        },
      },
      rooms: {
        "gran-lectorio": {
          code: "gran-lectorio",
          kind: "public",
          name: "Gran lectorio compartido",
          description: "",
          memberIds: ["github-1", "demo-lyra"],
          createdAt: Date.now(),
        },
      },
      presences: {
        "github-1": {
          userId: "github-1",
          roomCode: "gran-lectorio",
          roomKind: "public",
          state: "idle",
          space: "library",
          message: "",
          updatedAt: Date.now(),
          lastSeenAt: null,
        },
        "demo-lyra": {
          userId: "demo-lyra",
          roomCode: "gran-lectorio",
          roomKind: "public",
          state: "idle",
          space: "library",
          message: "",
          updatedAt: Date.now(),
          lastSeenAt: null,
        },
      },
      sessions: [],
      plannedSessions: [],
      plannerPreferences: {
        remindersEnabled: false,
        defaultLeadMinutes: 10,
      },
      notificationPreferences: {
        inAppEnabled: true,
        browserEnabled: false,
        soundEnabled: true,
      },
      socialPrivacy: {
        shareActivity: true,
        showOnLeaderboard: true,
      },
      ambientMixer: {
        enabled: false,
        masterVolume: 55,
        tracks: { rain: 40, fire: 25, library: 18, wind: 22 },
      },
      timer: {
        roomKind: "public",
        roomCode: "gran-lectorio",
        phase: "focus",
        status: "idle",
        focusDurationSeconds: 1500,
        breakDurationSeconds: 300,
        durationSeconds: 1500,
        remainingSeconds: 1500,
        endsAt: null,
        updatedAt: Date.now(),
      },
      onboardingCompleted: true,
      onboardingGoal: "",
      preferredStartPath: "/biblioteca-compartida",
      chronicleEntries: [],
      achievementUnlocks: [],
      friendIds: ["demo-lyra"],
      activePlannedSessionId: null,
    });

    const state = getFullState();

    expect(state.profiles["demo-lyra"]).toBeUndefined();
    expect(state.presences["demo-lyra"]).toBeUndefined();
    expect(state.rooms["gran-lectorio"]?.memberIds).toEqual(["github-1"]);
    expect(state.friendIds).toEqual([]);
  });
});
