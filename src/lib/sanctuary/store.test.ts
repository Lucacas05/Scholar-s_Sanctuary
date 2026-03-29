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
});
