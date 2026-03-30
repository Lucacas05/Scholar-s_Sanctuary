import {
  avatarOptions,
  type AvatarConfig,
  type AvatarOption,
} from "@/lib/sanctuary/store";
import {
  getCustomWardrobeItem,
  isCustomWardrobeValue,
  listCustomWardrobeOptions,
  loadCustomWardrobeCatalog,
  type CustomWardrobeCatalog,
} from "@/lib/sanctuary/customWardrobe";

export type WardrobeField = "accessory" | "upper" | "lower" | "socks";

export type WardrobeValueMap = {
  accessory: AvatarConfig["accessory"];
  upper: AvatarConfig["upper"];
  lower: AvatarConfig["lower"];
  socks: AvatarConfig["socks"];
};

export interface WardrobeUnlockRule<T extends WardrobeField = WardrobeField> {
  id: string;
  field: T;
  value: WardrobeValueMap[T];
  label: string;
  unlockLevel: number;
  enabled: boolean;
}

export interface WardrobeMilestone {
  id: string;
  label: string;
  description: string;
  unlockLevel: number;
  enabled: boolean;
}

export interface WardrobeConfig {
  levelStepFocusSeconds: number;
  rules: WardrobeUnlockRule[];
  milestones: WardrobeMilestone[];
}

const WARDROBE_CONFIG_STORAGE_KEY = "lumina:wardrobe-config";
const WARDROBE_CONFIG_ENDPOINT = "/api/editor/wardrobe";
export const WARDROBE_CONFIG_EVENT = "lumina:wardrobe-config-changed";
const DEFAULT_LEVEL_STEP_FOCUS_SECONDS = 60 * 60;

const ruleValueSets: Record<WardrobeField, Set<string>> = {
  accessory: new Set(avatarOptions.accessory.map((option) => option.value)),
  upper: new Set(avatarOptions.upper.map((option) => option.value)),
  lower: new Set(avatarOptions.lower.map((option) => option.value)),
  socks: new Set(avatarOptions.socks.map((option) => option.value)),
};

function hasWardrobeValue(field: WardrobeField, value: unknown) {
  if (
    (field === "upper" || field === "lower" || field === "socks") &&
    isCustomWardrobeValue(field, value)
  ) {
    return true;
  }

  switch (field) {
    case "accessory":
      return ruleValueSets.accessory.has(
        value as WardrobeValueMap["accessory"],
      );
    case "upper":
      return ruleValueSets.upper.has(value as WardrobeValueMap["upper"]);
    case "lower":
      return ruleValueSets.lower.has(value as WardrobeValueMap["lower"]);
    case "socks":
      return ruleValueSets.socks.has(value as WardrobeValueMap["socks"]);
  }
}

export function createWardrobeRuleId<T extends WardrobeField>(
  field: T,
  value: WardrobeValueMap[T],
) {
  return `${field}:${value}`;
}

export function createWardrobeMilestoneId() {
  return `hito-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createRule<T extends WardrobeField>(
  field: T,
  value: WardrobeValueMap[T],
  label: string,
  unlockLevel: number,
  enabled = true,
): WardrobeUnlockRule<T> {
  return {
    id: createWardrobeRuleId(field, value),
    field,
    value,
    label,
    unlockLevel,
    enabled,
  };
}

function createMilestone(
  label: string,
  unlockLevel: number,
  description: string,
  enabled = true,
  id = createWardrobeMilestoneId(),
): WardrobeMilestone {
  return {
    id,
    label,
    description,
    unlockLevel,
    enabled,
  };
}

function getOptionLabel(
  field: WardrobeField,
  value: WardrobeValueMap[WardrobeField],
) {
  if (field === "upper" || field === "lower" || field === "socks") {
    const garmentField = field;
    const customItem = getCustomWardrobeItem(
      garmentField,
      value as AvatarConfig[typeof garmentField],
      loadCustomWardrobeCatalog(),
    );
    if (customItem) {
      return customItem.label;
    }
  }

  return (
    avatarOptions[field].find((option) => option.value === value)?.label ??
    String(value)
  );
}

function buildDefaultWardrobeUnlockRules(): WardrobeUnlockRule[] {
  return [
    createRule("upper", "shirt-01-longsleeve", "Camisa larga 01", 1),
    createRule("upper", "shirt-04-tee", "Camiseta 01", 1),
    createRule("upper", "shirt-02-vneck-longsleeve", "Camisa larga 02", 3),
    createRule("upper", "shirt-03-scoop-longsleeve", "Camisa larga 03", 6),
    createRule("upper", "shirt-05-vneck-tee", "Camiseta 02", 10),
    createRule("upper", "shirt-06-scoop-tee", "Camiseta 03", 15),
    createRule("lower", "pants-03-pants", "Pantalón 03", 1),
    createRule("lower", "pants-01-hose", "Pantalón 01", 2),
    createRule("lower", "pants-02-leggings", "Pantalón 02", 4),
    createRule("lower", "pants-04-cuffed", "Pantalón 04", 8),
    createRule("lower", "pants-05-overalls", "Pantalón 05", 13),
    createRule("socks", "socks-01-ankle", "Calcetines bajos", 1),
    createRule("socks", "socks-02-high", "Calcetines altos", 3),
    createRule("accessory", "ninguno", "Sin accesorio", 1),
    createRule("accessory", "bigote", "Bigote", 2),
    createRule("accessory", "barba-corta", "Barba corta", 3),
    createRule("accessory", "barbarian", "Casco bárbaro", 5),
    createRule("accessory", "barbarian-nasal", "Casco bárbaro nasal", 7),
    createRule("accessory", "barbarian-viking", "Casco vikingo", 9),
    createRule("accessory", "barbuta", "Barbuta", 11),
    createRule("accessory", "barbuta-simple", "Barbuta simple", 13),
    createRule("accessory", "close", "Casco cerrado", 15),
    createRule("accessory", "flattop", "Flat top", 17),
    createRule("accessory", "greathelm", "Greathelm", 19),
    createRule("accessory", "nasal", "Casco nasal", 21),
    createRule("accessory", "spangenhelm", "Spangenhelm", 23),
    createRule("accessory", "spangenhelm-viking", "Spangenhelm vikingo", 25),
    createRule("accessory", "sugarloaf", "Sugarloaf", 27),
    createRule("accessory", "sugarloaf-simple", "Sugarloaf simple", 29),
  ];
}

function buildDefaultWardrobeMilestones(): WardrobeMilestone[] {
  return [
    createMilestone(
      "Nivel 1",
      1,
      "Despiertas el armario base y las primeras prendas del santuario.",
      true,
      "milestone-1",
    ),
    createMilestone(
      "Nivel 5",
      5,
      "Empiezan a aparecer piezas intermedias y accesorios más marcados.",
      true,
      "milestone-5",
    ),
    createMilestone(
      "Nivel 10",
      10,
      "Abres combinaciones avanzadas y el armario gana variedad real.",
      true,
      "milestone-10",
    ),
    createMilestone(
      "Nivel 20",
      20,
      "El santuario entra en su tramo raro con cascos y prendas tardías.",
      true,
      "milestone-20",
    ),
  ];
}

const defaultWardrobeConfig: WardrobeConfig = {
  levelStepFocusSeconds: DEFAULT_LEVEL_STEP_FOCUS_SECONDS,
  rules: buildDefaultWardrobeUnlockRules(),
  milestones: buildDefaultWardrobeMilestones(),
};

function cloneRule(rule: WardrobeUnlockRule): WardrobeUnlockRule {
  return { ...rule };
}

function cloneMilestone(milestone: WardrobeMilestone): WardrobeMilestone {
  return { ...milestone };
}

function dispatchWardrobeConfigEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(WARDROBE_CONFIG_EVENT));
}

export function getDefaultWardrobeConfig(): WardrobeConfig {
  return {
    levelStepFocusSeconds: defaultWardrobeConfig.levelStepFocusSeconds,
    rules: defaultWardrobeConfig.rules.map(cloneRule),
    milestones: defaultWardrobeConfig.milestones.map(cloneMilestone),
  };
}

function isValidWardrobeField(value: unknown): value is WardrobeField {
  return (
    value === "accessory" ||
    value === "upper" ||
    value === "lower" ||
    value === "socks"
  );
}

function normalizeLevel(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value));
}

function normalizeLevelStepFocusSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_LEVEL_STEP_FOCUS_SECONDS;
  }

  return Math.max(15 * 60, Math.round(value));
}

function buildFallbackRule<T extends WardrobeField>(
  field: T,
  value: WardrobeValueMap[T],
) {
  return createRule(field, value, getOptionLabel(field, value), 1);
}

function buildFallbackMilestone(id?: string) {
  return createMilestone("Nuevo hito", 1, "", true, id);
}

function normalizeStoredRule(
  value: unknown,
  fallbackRule: WardrobeUnlockRule,
): WardrobeUnlockRule {
  if (!value || typeof value !== "object") {
    return cloneRule(fallbackRule);
  }

  const record = value as Record<string, unknown>;
  if (!isValidWardrobeField(record.field)) {
    return cloneRule(fallbackRule);
  }

  if (!hasWardrobeValue(record.field, record.value)) {
    return cloneRule(fallbackRule);
  }

  return {
    id: createWardrobeRuleId(
      record.field,
      record.value as WardrobeValueMap[typeof record.field],
    ),
    field: record.field,
    value: record.value as WardrobeValueMap[typeof record.field],
    label:
      typeof record.label === "string" && record.label.trim().length > 0
        ? record.label.trim()
        : fallbackRule.label,
    unlockLevel: normalizeLevel(record.unlockLevel, fallbackRule.unlockLevel),
    enabled:
      typeof record.enabled === "boolean"
        ? record.enabled
        : fallbackRule.enabled,
  };
}

function normalizeStoredMilestone(
  value: unknown,
  fallbackMilestone: WardrobeMilestone,
) {
  if (!value || typeof value !== "object") {
    return cloneMilestone(fallbackMilestone);
  }

  const record = value as Record<string, unknown>;
  return {
    id:
      typeof record.id === "string" && record.id.trim().length > 0
        ? record.id.trim()
        : fallbackMilestone.id,
    label:
      typeof record.label === "string" && record.label.trim().length > 0
        ? record.label.trim()
        : fallbackMilestone.label,
    description:
      typeof record.description === "string" ? record.description.trim() : "",
    unlockLevel: normalizeLevel(
      record.unlockLevel,
      fallbackMilestone.unlockLevel,
    ),
    enabled:
      typeof record.enabled === "boolean"
        ? record.enabled
        : fallbackMilestone.enabled,
  };
}

export function normalizeWardrobeConfig(value: unknown): WardrobeConfig {
  const fallback = getDefaultWardrobeConfig();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const storedRules = Array.isArray(record.rules) ? record.rules : [];
  const storedRuleMap = new Map<string, unknown>();
  const fallbackRuleIdSet = new Set(fallback.rules.map((rule) => rule.id));

  storedRules.forEach((rule) => {
    if (!rule || typeof rule !== "object") {
      return;
    }

    const entry = rule as Record<string, unknown>;
    if (!isValidWardrobeField(entry.field)) {
      return;
    }

    if (!hasWardrobeValue(entry.field, entry.value)) {
      return;
    }

    storedRuleMap.set(
      createWardrobeRuleId(
        entry.field,
        entry.value as WardrobeValueMap[typeof entry.field],
      ),
      rule,
    );
  });

  const normalizedRules = fallback.rules.map((rule) =>
    normalizeStoredRule(storedRuleMap.get(rule.id), rule),
  );

  storedRuleMap.forEach((rawRule, ruleId) => {
    if (fallbackRuleIdSet.has(ruleId)) {
      return;
    }

    const [fieldValue, valueKey] = ruleId.split(":");
    if (
      !isValidWardrobeField(fieldValue) ||
      !hasWardrobeValue(fieldValue, valueKey)
    ) {
      return;
    }

    normalizedRules.push(
      normalizeStoredRule(
        rawRule,
        buildFallbackRule(
          fieldValue,
          valueKey as WardrobeValueMap[typeof fieldValue],
        ),
      ),
    );
  });

  const storedMilestones = Array.isArray(record.milestones)
    ? record.milestones
    : [];
  const storedMilestoneMap = new Map<string, unknown>();
  const fallbackMilestoneIds = new Set(
    fallback.milestones.map((milestone) => milestone.id),
  );

  storedMilestones.forEach((milestone) => {
    if (!milestone || typeof milestone !== "object") {
      return;
    }

    const entry = milestone as Record<string, unknown>;
    if (typeof entry.id !== "string" || entry.id.trim().length === 0) {
      return;
    }

    storedMilestoneMap.set(entry.id.trim(), milestone);
  });

  const normalizedMilestones = fallback.milestones.map((milestone) =>
    normalizeStoredMilestone(storedMilestoneMap.get(milestone.id), milestone),
  );

  storedMilestoneMap.forEach((rawMilestone, milestoneId) => {
    if (fallbackMilestoneIds.has(milestoneId)) {
      return;
    }

    normalizedMilestones.push(
      normalizeStoredMilestone(
        rawMilestone,
        buildFallbackMilestone(milestoneId),
      ),
    );
  });

  return {
    levelStepFocusSeconds: normalizeLevelStepFocusSeconds(
      record.levelStepFocusSeconds,
    ),
    rules: normalizedRules,
    milestones: normalizedMilestones.sort(
      (left, right) =>
        left.unlockLevel - right.unlockLevel ||
        left.label.localeCompare(right.label, "es"),
    ),
  };
}

export function loadWardrobeConfig(): WardrobeConfig {
  if (typeof window === "undefined") {
    return getDefaultWardrobeConfig();
  }

  const raw = window.localStorage.getItem(WARDROBE_CONFIG_STORAGE_KEY);
  if (!raw) {
    return getDefaultWardrobeConfig();
  }

  try {
    return normalizeWardrobeConfig(JSON.parse(raw));
  } catch {
    return getDefaultWardrobeConfig();
  }
}

export function saveWardrobeConfig(config: WardrobeConfig) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeWardrobeConfig(config);
  window.localStorage.setItem(
    WARDROBE_CONFIG_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  dispatchWardrobeConfigEvent();
}

export function resetWardrobeConfig() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(WARDROBE_CONFIG_STORAGE_KEY);
  dispatchWardrobeConfigEvent();
}

async function parseWardrobeConfigResponse(response: Response) {
  if (!response.ok) {
    throw new Error("No se pudo sincronizar el armario.");
  }

  const payload = (await response.json()) as { config?: unknown };
  const normalized = normalizeWardrobeConfig(payload.config);
  saveWardrobeConfig(normalized);
  return normalized;
}

export async function syncWardrobeConfigFromServer() {
  if (typeof window === "undefined") {
    return getDefaultWardrobeConfig();
  }

  const response = await fetch(WARDROBE_CONFIG_ENDPOINT, {
    credentials: "same-origin",
  });
  return parseWardrobeConfigResponse(response);
}

export async function saveWardrobeConfigToServer(config: WardrobeConfig) {
  if (typeof window === "undefined") {
    return normalizeWardrobeConfig(config);
  }

  const response = await fetch(WARDROBE_CONFIG_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      config,
    }),
  });

  return parseWardrobeConfigResponse(response);
}

export async function resetWardrobeConfigOnServer() {
  if (typeof window === "undefined") {
    return getDefaultWardrobeConfig();
  }

  const response = await fetch(WARDROBE_CONFIG_ENDPOINT, {
    method: "DELETE",
    credentials: "same-origin",
  });

  return parseWardrobeConfigResponse(response);
}

export function formatWardrobeDuration(totalFocusSeconds: number) {
  const totalMinutes = Math.max(0, Math.round(totalFocusSeconds / 60));

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  return `${totalMinutes} min`;
}

export function getFocusSecondsForLevel(
  unlockLevel: number,
  levelStepFocusSeconds = DEFAULT_LEVEL_STEP_FOCUS_SECONDS,
) {
  return (
    Math.max(0, normalizeLevel(unlockLevel, 1) - 1) *
    normalizeLevelStepFocusSeconds(levelStepFocusSeconds)
  );
}

export function getWardrobeLevel(
  totalFocusSeconds: number,
  levelStepFocusSeconds = DEFAULT_LEVEL_STEP_FOCUS_SECONDS,
) {
  return (
    Math.floor(
      Math.max(0, totalFocusSeconds) /
        normalizeLevelStepFocusSeconds(levelStepFocusSeconds),
    ) + 1
  );
}

export function getWardrobeUnlockRule<T extends WardrobeField>(
  field: T,
  value: WardrobeValueMap[T],
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  return config.rules.find(
    (rule) => rule.field === field && rule.value === value,
  ) as WardrobeUnlockRule<T> | undefined;
}

export function isWardrobeRuleEnabled<T extends WardrobeField>(
  field: T,
  value: WardrobeValueMap[T],
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  return getWardrobeUnlockRule(field, value, config)?.enabled ?? false;
}

export function getWardrobeRequirementLevel<T extends WardrobeField>(
  field: T,
  value: WardrobeValueMap[T],
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  return getWardrobeUnlockRule(field, value, config)?.unlockLevel ?? 1;
}

export function getWardrobeRequirement<T extends WardrobeField>(
  field: T,
  value: WardrobeValueMap[T],
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  return getFocusSecondsForLevel(
    getWardrobeRequirementLevel(field, value, config),
    config.levelStepFocusSeconds,
  );
}

export function isWardrobeItemUnlocked<T extends WardrobeField>(
  field: T,
  value: WardrobeValueMap[T],
  totalFocusSeconds: number,
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  if (!isWardrobeRuleEnabled(field, value, config)) {
    return false;
  }

  return totalFocusSeconds >= getWardrobeRequirement(field, value, config);
}

export function listWardrobeRulesByField(
  field: WardrobeField,
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  return config.rules
    .filter((rule) => rule.field === field)
    .sort(
      (left, right) =>
        left.unlockLevel - right.unlockLevel ||
        left.label.localeCompare(right.label, "es"),
    );
}

export function listVisibleWardrobeRulesByField(
  field: WardrobeField,
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  return listWardrobeRulesByField(field, config).filter((rule) => rule.enabled);
}

export function listVisibleWardrobeOptionsByField<T extends WardrobeField>(
  field: T,
  totalFocusSeconds: number,
  config: WardrobeConfig = defaultWardrobeConfig,
  catalog: CustomWardrobeCatalog = loadCustomWardrobeCatalog(),
) {
  const visibleRules = listVisibleWardrobeRulesByField(field, config);
  const orderMap = new Map(
    visibleRules.map((rule, index) => [
      String(rule.value),
      {
        unlockLevel: rule.unlockLevel,
        index,
        unlocked: isWardrobeItemUnlocked(
          field,
          rule.value as WardrobeValueMap[T],
          totalFocusSeconds,
          config,
        ),
      },
    ]),
  );

  const baseOptions = avatarOptions[field] as AvatarOption<AvatarConfig[T]>[];
  const mergedOptions =
    field === "upper" || field === "lower" || field === "socks"
      ? [...baseOptions, ...listCustomWardrobeOptions(field, catalog)]
      : baseOptions;

  return mergedOptions
    .filter((option) => orderMap.has(String(option.value)))
    .sort((left, right) => {
      const leftMeta = orderMap.get(String(left.value));
      const rightMeta = orderMap.get(String(right.value));

      if (!leftMeta || !rightMeta) {
        return left.label.localeCompare(right.label, "es");
      }

      return (
        Number(rightMeta.unlocked) - Number(leftMeta.unlocked) ||
        leftMeta.unlockLevel - rightMeta.unlockLevel ||
        leftMeta.index - rightMeta.index ||
        left.label.localeCompare(right.label, "es")
      );
    });
}

export function listWardrobeCandidates(
  field: WardrobeField,
  catalog: CustomWardrobeCatalog = loadCustomWardrobeCatalog(),
) {
  const baseOptions = avatarOptions[field].map((option) => ({
    field,
    value: option.value,
    label: option.label,
    description: option.description,
  }));

  if (field === "accessory") {
    return baseOptions;
  }

  return [
    ...baseOptions,
    ...listCustomWardrobeOptions(field, catalog).map((option) => ({
      field,
      value: option.value,
      label: option.label,
      description: option.description,
    })),
  ];
}

export function listWardrobeMilestones(
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  return [...config.milestones].sort(
    (left, right) =>
      left.unlockLevel - right.unlockLevel ||
      left.label.localeCompare(right.label, "es"),
  );
}

export function listEnabledWardrobeMilestones(
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  return listWardrobeMilestones(config).filter(
    (milestone) => milestone.enabled,
  );
}

export function getWardrobeUnlockSummary(
  totalFocusSeconds: number,
  config: WardrobeConfig = defaultWardrobeConfig,
) {
  const enabledRules = config.rules.filter((rule) => rule.enabled);
  const enabledMilestones = listEnabledWardrobeMilestones(config).map(
    (milestone) => {
      const requiredFocusSeconds = getFocusSecondsForLevel(
        milestone.unlockLevel,
        config.levelStepFocusSeconds,
      );

      return {
        ...milestone,
        requiredFocusSeconds,
        unlocked: totalFocusSeconds >= requiredFocusSeconds,
      };
    },
  );
  const enrichedRules = enabledRules.map((rule) => {
    const requiredFocusSeconds = getFocusSecondsForLevel(
      rule.unlockLevel,
      config.levelStepFocusSeconds,
    );

    return {
      ...rule,
      requiredFocusSeconds,
      unlocked: totalFocusSeconds >= requiredFocusSeconds,
    };
  });

  const unlockedCount = enrichedRules.filter((rule) => rule.unlocked).length;
  const nextUnlock =
    enrichedRules
      .filter((rule) => !rule.unlocked)
      .sort((left, right) => left.unlockLevel - right.unlockLevel)[0] ?? null;
  const nextMilestone =
    enabledMilestones
      .filter((milestone) => !milestone.unlocked)
      .sort((left, right) => left.unlockLevel - right.unlockLevel)[0] ?? null;
  const currentLevel = getWardrobeLevel(
    totalFocusSeconds,
    config.levelStepFocusSeconds,
  );
  const maxLevel = Math.max(
    1,
    ...enabledRules.map((rule) => rule.unlockLevel),
    ...enabledMilestones.map((milestone) => milestone.unlockLevel),
  );

  return {
    unlockedCount,
    totalItems: enabledRules.length,
    currentLevel,
    maxLevel,
    milestones: enabledMilestones,
    nextUnlock: nextUnlock
      ? {
          ...nextUnlock,
          remainingFocusSeconds:
            nextUnlock.requiredFocusSeconds - totalFocusSeconds,
        }
      : null,
    nextMilestone: nextMilestone
      ? {
          ...nextMilestone,
          remainingFocusSeconds:
            nextMilestone.requiredFocusSeconds - totalFocusSeconds,
        }
      : null,
  };
}
