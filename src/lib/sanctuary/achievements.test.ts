import { describe, expect, it } from "vitest";
import {
  computeAchievementUnlocks,
  normalizeAchievementDefinitions,
} from "./achievements";

describe("logros del santuario", () => {
  it("desbloquea las ocho insignias previstas cuando se cumplen todos los hitos", () => {
    const sessions = [
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-01T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-02T09:00:00.000Z",
      },
      {
        roomKind: "public",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-03T09:00:00.000Z",
      },
      {
        roomKind: "private",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-04T09:00:00.000Z",
      },
      {
        roomKind: "public",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-05T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-06T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-07T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-08T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-09T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-10T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-11T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-12T09:00:00.000Z",
      },
    ];

    const unlocks = computeAchievementUnlocks(sessions);

    expect(unlocks).toHaveLength(8);
    expect(new Set(unlocks.map((unlock) => unlock.id)).size).toBe(8);
  });

  it("es determinista aunque las sesiones entren desordenadas", () => {
    const ordered = [
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-01T09:00:00.000Z",
      },
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-02T09:00:00.000Z",
      },
      {
        roomKind: "public",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-03T09:00:00.000Z",
      },
      {
        roomKind: "private",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-04T09:00:00.000Z",
      },
    ];
    const shuffled = [ordered[2], ordered[0], ordered[3], ordered[1]];

    expect(computeAchievementUnlocks(shuffled)).toEqual(
      computeAchievementUnlocks(ordered),
    );
  });

  it("permite recalcular hitos con reglas personalizadas", () => {
    const sessions = [
      {
        roomKind: "solo",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-01T09:00:00.000Z",
      },
      {
        roomKind: "public",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-02T09:00:00.000Z",
      },
      {
        roomKind: "public",
        focusSeconds: 25 * 60,
        completedAt: "2026-03-03T09:00:00.000Z",
      },
    ];

    const definitions = normalizeAchievementDefinitions([
      {
        id: "social-2",
        title: "Doble ronda social",
        description: "",
        rule: {
          type: "social-sessions",
          value: 2,
        },
        enabled: true,
      },
      {
        id: "archivo-3",
        title: "Tres días",
        description: "",
        rule: {
          type: "archive-days",
          value: 3,
        },
        enabled: true,
      },
    ]);

    expect(computeAchievementUnlocks(sessions, definitions)).toEqual([
      {
        id: "social-2",
        unlockedAt: Date.parse("2026-03-03T09:00:00.000Z"),
      },
      {
        id: "archivo-3",
        unlockedAt: Date.parse("2026-03-03T09:00:00.000Z"),
      },
    ]);
  });
});
