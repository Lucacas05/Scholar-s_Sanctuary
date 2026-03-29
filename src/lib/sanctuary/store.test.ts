import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetSanctuaryStoreForTests,
  getCurrentPresence,
  getCurrentTimer,
  getFullState,
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
});
