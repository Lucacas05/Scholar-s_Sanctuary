import { describe, expect, it } from "vitest";
import {
  formatWardrobeDuration,
  getDefaultWardrobeConfig,
  getWardrobeUnlockSummary,
  isWardrobeItemUnlocked,
  normalizeWardrobeConfig,
} from "@/lib/sanctuary/wardrobe";

describe("wardrobe unlocks", () => {
  it("desbloquea las prendas base desde el inicio", () => {
    expect(isWardrobeItemUnlocked("upper", "shirt-01-longsleeve", 0)).toBe(
      true,
    );
    expect(isWardrobeItemUnlocked("socks", "socks-01-ankle", 0)).toBe(true);
  });

  it("mantiene bloqueadas las piezas avanzadas hasta cumplir el tiempo", () => {
    expect(
      isWardrobeItemUnlocked("accessory", "sugarloaf-simple", 10 * 3600),
    ).toBe(false);
    expect(
      isWardrobeItemUnlocked("accessory", "sugarloaf-simple", 28 * 3600),
    ).toBe(true);
  });

  it("calcula el siguiente desbloqueo pendiente", () => {
    const summary = getWardrobeUnlockSummary(3600);

    expect(summary.unlockedCount).toBeGreaterThan(0);
    expect(summary.nextUnlock?.label).toBe("Camisa larga 02");
    expect(summary.nextUnlock?.remainingFocusSeconds).toBe(3600);
  });

  it("no cuenta prendas ocultas dentro del progreso visible", () => {
    const config = getDefaultWardrobeConfig();
    const hiddenRule = config.rules.find(
      (rule) => rule.id === "upper:shirt-04-tee",
    );

    if (!hiddenRule) {
      throw new Error("No se encontro la regla esperada");
    }

    hiddenRule.enabled = false;

    expect(
      isWardrobeItemUnlocked("upper", "shirt-04-tee", 20 * 3600, config),
    ).toBe(false);
    expect(getWardrobeUnlockSummary(20 * 3600, config).totalItems).toBe(
      config.rules.length - 1,
    );
  });

  it("normaliza hitos personalizados dentro de la configuración", () => {
    const config = normalizeWardrobeConfig({
      levelStepFocusSeconds: 5400,
      rules: [],
      milestones: [
        {
          id: "milestone-custom",
          label: "Arsenal ligero",
          description: "Primer tramo.",
          unlockLevel: 4,
          enabled: true,
        },
      ],
    });

    expect(
      config.milestones.some(
        (milestone) => milestone.id === "milestone-custom",
      ),
    ).toBe(true);
    expect(config.levelStepFocusSeconds).toBe(5400);
  });

  it("formatea duraciones largas de forma legible", () => {
    expect(formatWardrobeDuration(90 * 60)).toBe("1 h 30 min");
  });
});
