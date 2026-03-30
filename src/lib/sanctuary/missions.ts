import { isCustomWardrobeValue } from "@/lib/sanctuary/customWardrobe";
import { avatarOptions } from "@/lib/sanctuary/store";
import type { WardrobeField, WardrobeValueMap } from "@/lib/sanctuary/wardrobe";

export type MissionRoomKind = "any" | "solo" | "public" | "private";

export interface MissionRewardNone {
  type: "none";
}

export interface MissionRewardWardrobe {
  type: "wardrobe";
  field: WardrobeField;
  value: string;
}

export type MissionReward = MissionRewardNone | MissionRewardWardrobe;

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  requiredFocusSeconds: number;
  requiredSessions: number;
  roomKind: MissionRoomKind;
  reward: MissionReward;
  enabled: boolean;
}

const MISSION_STORAGE_KEY = "lumina:mission-definitions";
const MISSION_DEFINITIONS_ENDPOINT = "/api/editor/missions";
export const MISSION_DEFINITIONS_EVENT = "lumina:mission-definitions-changed";

const wardrobeValueSets: Record<WardrobeField, Set<string>> = {
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
      return wardrobeValueSets.accessory.has(
        value as WardrobeValueMap["accessory"],
      );
    case "upper":
      return wardrobeValueSets.upper.has(value as WardrobeValueMap["upper"]);
    case "lower":
      return wardrobeValueSets.lower.has(value as WardrobeValueMap["lower"]);
    case "socks":
      return wardrobeValueSets.socks.has(value as WardrobeValueMap["socks"]);
  }
}

export const defaultMissionDefinitions: MissionDefinition[] = [
  {
    id: "primera-capa",
    title: "Primera capa",
    description:
      "Suma una hora completa de foco para abrir tu primer accesorio menor.",
    requiredFocusSeconds: 60 * 60,
    requiredSessions: 2,
    roomKind: "any",
    reward: {
      type: "wardrobe",
      field: "accessory",
      value: "bigote",
    },
    enabled: true,
  },
  {
    id: "vigilia-publica",
    title: "Vigilia pública",
    description:
      "Completa varias sesiones en la biblioteca pública y gana una pieza más formal.",
    requiredFocusSeconds: 3 * 60 * 60,
    requiredSessions: 4,
    roomKind: "public",
    reward: {
      type: "wardrobe",
      field: "upper",
      value: "shirt-02-vneck-longsleeve",
    },
    enabled: true,
  },
  {
    id: "guardian-del-archivo",
    title: "Guardián del archivo",
    description:
      "Mantén el ritmo suficiente para desbloquear un casco pesado del santuario.",
    requiredFocusSeconds: 8 * 60 * 60,
    requiredSessions: 10,
    roomKind: "any",
    reward: {
      type: "wardrobe",
      field: "accessory",
      value: "barbarian-viking",
    },
    enabled: true,
  },
];

function cloneMission(mission: MissionDefinition): MissionDefinition {
  return {
    ...mission,
    reward:
      mission.reward.type === "wardrobe"
        ? { ...mission.reward }
        : { type: "none" },
  };
}

function dispatchMissionDefinitionsEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(MISSION_DEFINITIONS_EVENT));
}

export function getDefaultMissionDefinitions() {
  return defaultMissionDefinitions.map(cloneMission);
}

export function formatMissionDuration(totalFocusSeconds: number) {
  const totalMinutes = Math.max(0, Math.round(totalFocusSeconds / 60));

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  return `${totalMinutes} min`;
}

export function createMissionId() {
  return `mision-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isValidMissionRoomKind(value: unknown): value is MissionRoomKind {
  return (
    value === "any" ||
    value === "solo" ||
    value === "public" ||
    value === "private"
  );
}

function isValidWardrobeField(value: unknown): value is WardrobeField {
  return (
    value === "accessory" ||
    value === "upper" ||
    value === "lower" ||
    value === "socks"
  );
}

function normalizeFocusSeconds(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(15 * 60, Math.round(value));
}

function normalizeSessions(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value));
}

function normalizeReward(value: unknown): MissionReward {
  if (!value || typeof value !== "object") {
    return { type: "none" };
  }

  const record = value as Record<string, unknown>;
  if (record.type !== "wardrobe") {
    return { type: "none" };
  }

  if (!isValidWardrobeField(record.field)) {
    return { type: "none" };
  }

  const rewardValue = record.value as WardrobeValueMap[typeof record.field];
  if (!hasWardrobeValue(record.field, rewardValue)) {
    return { type: "none" };
  }

  return {
    type: "wardrobe",
    field: record.field,
    value: rewardValue,
  };
}

function normalizeMission(value: unknown, fallback?: MissionDefinition) {
  const base =
    fallback ??
    ({
      id: createMissionId(),
      title: "Nueva misión",
      description: "",
      requiredFocusSeconds: 60 * 60,
      requiredSessions: 1,
      roomKind: "any",
      reward: { type: "none" },
      enabled: true,
    } satisfies MissionDefinition);

  if (!value || typeof value !== "object") {
    return cloneMission(base);
  }

  const record = value as Record<string, unknown>;
  return {
    id:
      typeof record.id === "string" && record.id.trim().length > 0
        ? record.id.trim()
        : base.id,
    title:
      typeof record.title === "string" && record.title.trim().length > 0
        ? record.title.trim()
        : base.title,
    description:
      typeof record.description === "string" ? record.description.trim() : "",
    requiredFocusSeconds: normalizeFocusSeconds(
      record.requiredFocusSeconds,
      base.requiredFocusSeconds,
    ),
    requiredSessions: normalizeSessions(
      record.requiredSessions,
      base.requiredSessions,
    ),
    roomKind: isValidMissionRoomKind(record.roomKind)
      ? record.roomKind
      : base.roomKind,
    reward: normalizeReward(record.reward),
    enabled:
      typeof record.enabled === "boolean" ? record.enabled : base.enabled,
  };
}

export function normalizeMissionDefinitions(value: unknown) {
  if (!Array.isArray(value)) {
    return getDefaultMissionDefinitions();
  }

  return value.map((entry, index) =>
    normalizeMission(entry, defaultMissionDefinitions[index]),
  );
}

export function loadMissionDefinitions() {
  if (typeof window === "undefined") {
    return getDefaultMissionDefinitions();
  }

  const raw = window.localStorage.getItem(MISSION_STORAGE_KEY);
  if (!raw) {
    return getDefaultMissionDefinitions();
  }

  try {
    return normalizeMissionDefinitions(JSON.parse(raw));
  } catch {
    return getDefaultMissionDefinitions();
  }
}

export function saveMissionDefinitions(missions: MissionDefinition[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    MISSION_STORAGE_KEY,
    JSON.stringify(normalizeMissionDefinitions(missions)),
  );
  dispatchMissionDefinitionsEvent();
}

export function resetMissionDefinitions() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(MISSION_STORAGE_KEY);
  dispatchMissionDefinitionsEvent();
}

async function parseMissionDefinitionsResponse(response: Response) {
  if (!response.ok) {
    throw new Error("No se pudieron sincronizar las misiones.");
  }

  const payload = (await response.json()) as { missions?: unknown };
  const normalized = normalizeMissionDefinitions(payload.missions);
  saveMissionDefinitions(normalized);
  return normalized;
}

export async function syncMissionDefinitionsFromServer() {
  if (typeof window === "undefined") {
    return getDefaultMissionDefinitions();
  }

  const response = await fetch(MISSION_DEFINITIONS_ENDPOINT, {
    credentials: "same-origin",
  });
  return parseMissionDefinitionsResponse(response);
}

export async function saveMissionDefinitionsToServer(
  missions: MissionDefinition[],
) {
  if (typeof window === "undefined") {
    return normalizeMissionDefinitions(missions);
  }

  const response = await fetch(MISSION_DEFINITIONS_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      missions,
    }),
  });
  return parseMissionDefinitionsResponse(response);
}

export async function resetMissionDefinitionsOnServer() {
  if (typeof window === "undefined") {
    return getDefaultMissionDefinitions();
  }

  const response = await fetch(MISSION_DEFINITIONS_ENDPOINT, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return parseMissionDefinitionsResponse(response);
}

export function getMissionRewardLabel(reward: MissionReward) {
  if (reward.type !== "wardrobe") {
    return "Sin recompensa";
  }

  const option = avatarOptions[reward.field].find(
    (entry) => entry.value === reward.value,
  );

  return option ? `${option.label} (${reward.field})` : reward.value;
}
