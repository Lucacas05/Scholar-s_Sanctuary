import { useSyncExternalStore } from "react";
import type { RoomMemberPresence } from "@/lib/server/ws-types";
import {
  achievementDefinitions,
  computeAchievementUnlocks,
  getDistinctSessionDays,
  getStreakDays,
} from "@/lib/sanctuary/achievements";

export type SessionState = "anonymous" | "authenticated";
export type RoomKind = "solo" | "public" | "private";
export type PresenceState = "idle" | "studying" | "break" | "offline";
export type PresenceSpace = "solo" | "library" | "garden";
export type TimerPhase = "focus" | "break";
export type TimerStatus = "idle" | "running" | "paused";
export type ChronicleTone = "primary" | "secondary" | "tertiary";

const GARMENT_COLOR_VALUES = [
  "amber",
  "amethyst",
  "barberry",
  "black",
  "blue",
  "blue-violet",
  "bronze",
  "brown",
  "burnt-orange",
  "burnt-umber",
  "cerise",
  "chocolate",
  "coffee",
  "cornflower",
  "cream",
  "cyan",
  "fern",
  "forest",
  "gray",
  "green",
  "ice",
  "indigo",
  "ivory",
  "lavender",
  "leather",
  "mustard",
  "navy",
  "neptune",
  "olivine",
  "orange",
  "peach",
  "pink",
  "plum",
  "red",
  "sepia",
  "silver",
  "smoke",
  "spring",
  "swamp",
  "tan",
  "tumeric",
  "umber",
  "white",
  "yellow",
] as const;

export type AvatarSex = "masculino" | "femenino";
export type AvatarSkinTone =
  | "amber"
  | "bronze"
  | "brown"
  | "chocolate"
  | "coffee"
  | "cream"
  | "ivory"
  | "leather"
  | "peach"
  | "sepia"
  | "tan";
export type AvatarHairStyle =
  | "short-01-buzzcut"
  | "short-02-parted"
  | "short-03-curly"
  | "short-04-cowlick"
  | "short-05-natural"
  | "short-06-balding"
  | "short-07-flat-top"
  | "short-08-flat-top-fade"
  | "medium-01-page"
  | "medium-02-curly"
  | "medium-03-idol"
  | "medium-04-bangs-bun"
  | "medium-05-cornrows"
  | "medium-06-dreadlocks"
  | "medium-07-bob-side-part"
  | "medium-08-bob-bangs"
  | "medium-09-twists"
  | "medium-10-twists-fade";
export type AvatarHairColor =
  | "ash-brown"
  | "black"
  | "blonde"
  | "blue"
  | "brown"
  | "chestnut"
  | "gray"
  | "green"
  | "orange"
  | "pink"
  | "platinum"
  | "raven"
  | "red"
  | "ruby"
  | "teal"
  | "violet"
  | "white";
export type AvatarAccessory =
  | "ninguno"
  | "bigote"
  | "barba-corta"
  | "barbarian"
  | "barbarian-nasal"
  | "barbarian-viking"
  | "barbuta"
  | "barbuta-simple"
  | "close"
  | "flattop"
  | "greathelm"
  | "nasal"
  | "spangenhelm"
  | "spangenhelm-viking"
  | "sugarloaf"
  | "sugarloaf-simple";
export type AvatarUpper =
  | "shirt-01-longsleeve"
  | "shirt-02-vneck-longsleeve"
  | "shirt-03-scoop-longsleeve"
  | "shirt-04-tee"
  | "shirt-05-vneck-tee"
  | "shirt-06-scoop-tee";
export type AvatarLower =
  | "pants-01-hose"
  | "pants-02-leggings"
  | "pants-03-pants"
  | "pants-04-cuffed"
  | "pants-05-overalls";
export type AvatarSocks = "socks-01-ankle" | "socks-02-high";
export type AvatarGarmentColor = (typeof GARMENT_COLOR_VALUES)[number];

export interface AvatarConfig {
  sex: AvatarSex;
  skinTone: AvatarSkinTone;
  hairStyle: AvatarHairStyle;
  hairColor: AvatarHairColor;
  accessory: AvatarAccessory;
  upper: AvatarUpper;
  upperColor: AvatarGarmentColor;
  lower: AvatarLower;
  lowerColor: AvatarGarmentColor;
  socks: AvatarSocks;
  socksColor: AvatarGarmentColor;
}

export interface Profile {
  id: string;
  displayName: string;
  handle: string;
  avatar: AvatarConfig;
  bio: string;
  createdAt: number;
  isDemo?: boolean;
}

export interface Room {
  code: string;
  kind: Exclude<RoomKind, "solo">;
  name: string;
  description: string;
  ownerId?: string;
  memberIds: string[];
  createdAt: number;
}

export interface Presence {
  userId: string;
  roomCode: string;
  roomKind: RoomKind;
  state: PresenceState;
  space: PresenceSpace;
  message: string;
  updatedAt: number;
}

export interface TimerState {
  roomKind: RoomKind;
  roomCode: string;
  phase: TimerPhase;
  status: TimerStatus;
  focusDurationSeconds: number;
  breakDurationSeconds: number;
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: number | null;
  updatedAt: number;
}

export interface StudySession {
  id: string;
  userId: string;
  roomCode: string;
  roomKind: RoomKind;
  focusSeconds: number;
  breakSeconds?: number;
  startedAt?: number;
  completedAt: number;
  serverId?: string | null;
  persistedAt?: number | null;
}

export interface ChronicleEntry {
  id: string;
  userId: string;
  title: string;
  description: string;
  timestamp: number;
  tone: ChronicleTone;
  origin?: "timer" | "system";
}

export interface AchievementUnlock {
  id: string;
  userId: string;
  unlockedAt: number;
  persistedAt?: number | null;
}

export interface SanctuaryState {
  version: number;
  sessionState: SessionState;
  currentUserId: string | null;
  currentRoomCode: string;
  profiles: Record<string, Profile>;
  rooms: Record<string, Room>;
  presences: Record<string, Presence>;
  timer: TimerState;
  sessions: StudySession[];
  chronicleEntries: ChronicleEntry[];
  achievementUnlocks: AchievementUnlock[];
  friendIds: string[];
}

export interface AvatarOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

export interface RemoteAccountIdentity {
  id: string;
  displayName: string;
  username: string;
}

export const garmentColorMeta: Record<
  AvatarGarmentColor,
  { label: string; description: string; source: string; swatch: string }
> = {
  amber: { label: "Ámbar", description: "Dorado cálido.", source: "Amber", swatch: "#b8782d" },
  amethyst: { label: "Amatista", description: "Violeta profundo.", source: "Amethyst", swatch: "#6a4a8c" },
  barberry: { label: "Agracejo", description: "Rojo oscuro.", source: "Barberry", swatch: "#7a2338" },
  black: { label: "Negro", description: "Negro puro.", source: "Black", swatch: "#262223" },
  blue: { label: "Azul", description: "Azul vivo.", source: "Blue", swatch: "#3d69a6" },
  "blue-violet": {
    label: "Azul violeta",
    description: "Mezcla azul y violeta.",
    source: "Blue Violet",
    swatch: "#5650a2",
  },
  bronze: { label: "Bronce", description: "Bronce mate.", source: "Bronze", swatch: "#98714f" },
  brown: { label: "Marrón", description: "Marrón clásico.", source: "Brown", swatch: "#72503b" },
  "burnt-orange": {
    label: "Naranja quemado",
    description: "Naranja tostado.",
    source: "Burnt Orange",
    swatch: "#b95c23",
  },
  "burnt-umber": {
    label: "Siena tostada",
    description: "Marrón rojizo oscuro.",
    source: "Burnt Umber",
    swatch: "#7a4b32",
  },
  cerise: { label: "Cereza", description: "Rosa cereza.", source: "Cerise", swatch: "#a13668" },
  chocolate: { label: "Chocolate", description: "Marrón oscuro.", source: "Chocolate", swatch: "#5b3323" },
  coffee: { label: "Café", description: "Café profundo.", source: "Coffee", swatch: "#5d4336" },
  cornflower: { label: "Aciano", description: "Azul aciano.", source: "Cornflower", swatch: "#6d85d5" },
  cream: { label: "Crema", description: "Crema suave.", source: "Cream", swatch: "#d8c5a3" },
  cyan: { label: "Cian", description: "Cian brillante.", source: "Cyan", swatch: "#3e9ca7" },
  fern: { label: "Helecho", description: "Verde helecho.", source: "Fern", swatch: "#4c7a45" },
  forest: { label: "Bosque", description: "Verde bosque.", source: "Forest", swatch: "#355a3d" },
  gray: { label: "Gris", description: "Gris neutro.", source: "Gray", swatch: "#6f7075" },
  green: { label: "Verde", description: "Verde limpio.", source: "Green", swatch: "#4a8244" },
  ice: { label: "Hielo", description: "Celeste pálido.", source: "Ice", swatch: "#95d3eb" },
  indigo: { label: "Índigo", description: "Índigo oscuro.", source: "Indigo", swatch: "#433f7e" },
  ivory: { label: "Marfil", description: "Marfil claro.", source: "Ivory", swatch: "#efe7d5" },
  lavender: { label: "Lavanda", description: "Lavanda suave.", source: "Lavender", swatch: "#927eb7" },
  leather: { label: "Cuero", description: "Cuero curtido.", source: "Leather", swatch: "#886048" },
  mustard: { label: "Mostaza", description: "Mostaza dorada.", source: "Mustard", swatch: "#9e8130" },
  navy: { label: "Marino", description: "Azul marino.", source: "Navy", swatch: "#2e446e" },
  neptune: { label: "Neptuno", description: "Azul verdoso profundo.", source: "Neptune", swatch: "#2f6a78" },
  olivine: { label: "Olivino", description: "Verde oliva claro.", source: "Olivine", swatch: "#728b4d" },
  orange: { label: "Naranja", description: "Naranja vivo.", source: "Orange", swatch: "#c36b22" },
  peach: { label: "Melocotón", description: "Melocotón suave.", source: "Peach", swatch: "#d8a38a" },
  pink: { label: "Rosa", description: "Rosa claro.", source: "Pink", swatch: "#c77ea4" },
  plum: { label: "Ciruela", description: "Morado ciruela.", source: "Plum", swatch: "#69415a" },
  red: { label: "Rojo", description: "Rojo intenso.", source: "Red", swatch: "#a53a36" },
  sepia: { label: "Sepia", description: "Sepia oscuro.", source: "Sepia", swatch: "#6a4d3f" },
  silver: { label: "Plata", description: "Plata fría.", source: "Silver", swatch: "#9ca5b0" },
  smoke: { label: "Humo", description: "Gris ahumado.", source: "Smoke", swatch: "#8b8583" },
  spring: { label: "Primavera", description: "Verde primavera.", source: "Spring", swatch: "#69a04f" },
  swamp: { label: "Pantano", description: "Verde oscuro apagado.", source: "Swamp", swatch: "#536246" },
  tan: { label: "Tostado", description: "Tostado medio.", source: "Tan", swatch: "#b18462" },
  tumeric: { label: "Cúrcuma", description: "Amarillo cálido.", source: "Tumeric", swatch: "#b78e28" },
  umber: { label: "Sombra", description: "Marrón umber.", source: "Umber", swatch: "#694a39" },
  white: { label: "Blanco", description: "Blanco limpio.", source: "White", swatch: "#f3f3f1" },
  yellow: { label: "Amarillo", description: "Amarillo vivo.", source: "Yellow", swatch: "#d6b730" },
};

const garmentColorOptions = GARMENT_COLOR_VALUES.map((value) => ({
  value,
  label: garmentColorMeta[value].label,
  description: garmentColorMeta[value].description,
})) satisfies AvatarOption<AvatarGarmentColor>[];

export const PUBLIC_ROOM_CODE = "gran-lectorio";
export const SOLO_ROOM_CODE = "santuario-silencioso";
export const FOCUS_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;

export const avatarOptions = {
  sex: [
    { value: "masculino", label: "Hombre", description: "Modelo masculino del pack LPC." },
    { value: "femenino", label: "Mujer", description: "Modelo femenino del pack LPC." },
  ] satisfies AvatarOption<AvatarConfig["sex"]>[],
  skinTone: [
    { value: "amber", label: "Ámbar", description: "Tono cálido claro." },
    { value: "bronze", label: "Bronce", description: "Profundo y cálido." },
    { value: "brown", label: "Moreno", description: "Moreno medio." },
    { value: "chocolate", label: "Chocolate", description: "Oscuro con base rojiza." },
    { value: "coffee", label: "Café", description: "Oscuro y neutro." },
    { value: "cream", label: "Crema", description: "Claro suave." },
    { value: "ivory", label: "Marfil", description: "Muy claro." },
    { value: "leather", label: "Cuero", description: "Bronce curtido." },
    { value: "peach", label: "Melocotón", description: "Rosado claro." },
    { value: "sepia", label: "Sepia", description: "Oscuro con matiz castaño." },
    { value: "tan", label: "Tostado", description: "Tostado medio." },
  ] satisfies AvatarOption<AvatarConfig["skinTone"]>[],
  hairStyle: [
    { value: "short-01-buzzcut", label: "Buzzcut", description: "Muy corto y limpio." },
    { value: "short-02-parted", label: "Corto con raya", description: "Peinado corto abierto." },
    { value: "short-03-curly", label: "Corto rizado", description: "Rizo compacto." },
    { value: "short-04-cowlick", label: "Corto despeinado", description: "Con mechón levantado." },
    { value: "short-05-natural", label: "Natural corto", description: "Textura natural." },
    { value: "short-06-balding", label: "Entradas", description: "Frontal despejado." },
    { value: "short-07-flat-top", label: "Flat top", description: "Plano y alto." },
    { value: "short-08-flat-top-fade", label: "Flat top fade", description: "Plano con fade." },
    { value: "medium-01-page", label: "Page", description: "Media melena recta." },
    { value: "medium-02-curly", label: "Media melena rizada", description: "Curvas amplias." },
    { value: "medium-03-idol", label: "Idol", description: "Peinado con volumen frontal." },
    { value: "medium-04-bangs-bun", label: "Flequillo y moño", description: "Recogido con fleco." },
    { value: "medium-05-cornrows", label: "Cornrows", description: "Trenzas pegadas." },
    { value: "medium-06-dreadlocks", label: "Dreadlocks", description: "Melenita de rastas." },
    { value: "medium-07-bob-side-part", label: "Bob lateral", description: "Bob con raya al lado." },
    { value: "medium-08-bob-bangs", label: "Bob con flequillo", description: "Bob recto." },
    { value: "medium-09-twists", label: "Twists", description: "Twists medios." },
    { value: "medium-10-twists-fade", label: "Twists con fade", description: "Laterales rebajados." },
  ] satisfies AvatarOption<AvatarConfig["hairStyle"]>[],
  hairColor: [
    { value: "ash-brown", label: "Ceniza", description: "Marrón ceniza." },
    { value: "black", label: "Negro", description: "Negro puro." },
    { value: "blonde", label: "Rubio", description: "Rubio claro." },
    { value: "blue", label: "Azul", description: "Azul." },
    { value: "brown", label: "Marrón", description: "Marrón." },
    { value: "chestnut", label: "Castaño", description: "Castaño rojizo." },
    { value: "gray", label: "Gris", description: "Gris." },
    { value: "green", label: "Verde", description: "Verde." },
    { value: "orange", label: "Naranja", description: "Naranja." },
    { value: "pink", label: "Rosa", description: "Rosa." },
    { value: "platinum", label: "Platino", description: "Platino." },
    { value: "raven", label: "Cuervo", description: "Negro azulado." },
    { value: "red", label: "Rojo", description: "Rojo." },
    { value: "ruby", label: "Ruby", description: "Rubí." },
    { value: "teal", label: "Turquesa", description: "Turquesa." },
    { value: "violet", label: "Violeta", description: "Violeta." },
    { value: "white", label: "Blanco", description: "Blanco." },
  ] satisfies AvatarOption<AvatarConfig["hairColor"]>[],
  accessory: [
    { value: "ninguno", label: "Sin accesorio", description: "Sin complemento extra." },
    { value: "bigote", label: "Bigote", description: "Detalle facial sencillo." },
    { value: "barba-corta", label: "Barba corta", description: "Sombra compacta." },
    { value: "barbarian", label: "Casco bárbaro", description: "Yelmo abierto con remate agresivo." },
    { value: "barbarian-nasal", label: "Casco bárbaro nasal", description: "Protección frontal con nasal." },
    { value: "barbarian-viking", label: "Casco vikingo", description: "Perfil bárbaro con alas." },
    { value: "barbuta", label: "Barbuta", description: "Yelmo medieval cerrado." },
    { value: "barbuta-simple", label: "Barbuta simple", description: "Barbuta ligera." },
    { value: "close", label: "Casco cerrado", description: "Frontal más protegido." },
    { value: "flattop", label: "Flat top", description: "Casco de copa plana." },
    { value: "greathelm", label: "Greathelm", description: "Yelmo pesado de placa." },
    { value: "nasal", label: "Casco nasal", description: "Protección con nasal clásico." },
    { value: "spangenhelm", label: "Spangenhelm", description: "Casco segmentado." },
    { value: "spangenhelm-viking", label: "Spangenhelm vikingo", description: "Variante nórdica." },
    { value: "sugarloaf", label: "Sugarloaf", description: "Yelmo puntiagudo." },
    { value: "sugarloaf-simple", label: "Sugarloaf simple", description: "Versión ligera." },
  ] satisfies AvatarOption<AvatarConfig["accessory"]>[],
  upper: [
    { value: "shirt-01-longsleeve", label: "Camisa larga 01", description: "Manga larga básica." },
    { value: "shirt-02-vneck-longsleeve", label: "Camisa larga 02", description: "Manga larga con pico." },
    { value: "shirt-03-scoop-longsleeve", label: "Camisa larga 03", description: "Manga larga redondeada." },
    { value: "shirt-04-tee", label: "Camiseta 01", description: "Camiseta recta." },
    { value: "shirt-05-vneck-tee", label: "Camiseta 02", description: "Camiseta con pico." },
    { value: "shirt-06-scoop-tee", label: "Camiseta 03", description: "Camiseta redondeada." },
  ] satisfies AvatarOption<AvatarConfig["upper"]>[],
  upperColor: garmentColorOptions,
  lower: [
    { value: "pants-01-hose", label: "Pantalón 01", description: "Base tipo hose." },
    { value: "pants-02-leggings", label: "Pantalón 02", description: "Leggings." },
    { value: "pants-03-pants", label: "Pantalón 03", description: "Pantalón recto." },
    { value: "pants-04-cuffed", label: "Pantalón 04", description: "Pantalón remangado." },
    { value: "pants-05-overalls", label: "Pantalón 05", description: "Mono/overalls." },
  ] satisfies AvatarOption<AvatarConfig["lower"]>[],
  lowerColor: garmentColorOptions,
  socks: [
    { value: "socks-01-ankle", label: "Calcetines bajos", description: "Tobilleros." },
    { value: "socks-02-high", label: "Calcetines altos", description: "Altos hasta media pierna." },
  ] satisfies AvatarOption<AvatarConfig["socks"]>[],
  socksColor: garmentColorOptions,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const avatarOptionSets = {
  sex: new Set(avatarOptions.sex.map((option) => option.value)),
  skinTone: new Set(avatarOptions.skinTone.map((option) => option.value)),
  hairStyle: new Set(avatarOptions.hairStyle.map((option) => option.value)),
  hairColor: new Set(avatarOptions.hairColor.map((option) => option.value)),
  accessory: new Set(avatarOptions.accessory.map((option) => option.value)),
  upper: new Set(avatarOptions.upper.map((option) => option.value)),
  upperColor: new Set(avatarOptions.upperColor.map((option) => option.value)),
  lower: new Set(avatarOptions.lower.map((option) => option.value)),
  lowerColor: new Set(avatarOptions.lowerColor.map((option) => option.value)),
  socks: new Set(avatarOptions.socks.map((option) => option.value)),
  socksColor: new Set(avatarOptions.socksColor.map((option) => option.value)),
};

const legacyOutfitPreset = {
  escriba: {
    upper: "shirt-01-longsleeve",
    lower: "pants-03-pants",
    socks: "socks-01-ankle",
  },
  alquimista: {
    upper: "shirt-02-vneck-longsleeve",
    lower: "pants-04-cuffed",
    socks: "socks-02-high",
  },
  guardabosques: {
    upper: "shirt-04-tee",
    lower: "pants-05-overalls",
    socks: "socks-02-high",
  },
} as const;

function normalizeAvatarValue<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  if (typeof value === "string" && allowed.has(value as T)) {
    return value as T;
  }

  return fallback;
}

export function normalizeAvatarConfig(value: unknown): AvatarConfig {
  const raw = isRecord(value) ? value : {};
  const legacyOutfit =
    typeof raw.outfit === "string" && raw.outfit in legacyOutfitPreset
      ? legacyOutfitPreset[raw.outfit as keyof typeof legacyOutfitPreset]
      : legacyOutfitPreset.escriba;

  const fallback: AvatarConfig = {
    sex:
      raw.base === "viajera" ? "femenino" : normalizeAvatarValue(raw.sex, avatarOptionSets.sex, "masculino"),
    skinTone:
      raw.skinTone === "marfil"
        ? "ivory"
        : raw.skinTone === "miel"
          ? "amber"
          : raw.skinTone === "bronce"
            ? "bronze"
            : raw.skinTone === "umbra"
              ? "sepia"
              : normalizeAvatarValue(raw.skinTone, avatarOptionSets.skinTone, "amber"),
    hairStyle:
      raw.hairStyle === "corto"
        ? "short-02-parted"
        : raw.hairStyle === "ondas"
          ? "medium-02-curly"
          : raw.hairStyle === "coleta"
            ? "medium-04-bangs-bun"
            : raw.hairStyle === "capucha"
              ? "short-06-balding"
              : normalizeAvatarValue(raw.hairStyle, avatarOptionSets.hairStyle, "short-02-parted"),
    hairColor:
      raw.hairColor === "obsidiana"
        ? "black"
        : raw.hairColor === "castano"
          ? "brown"
          : raw.hairColor === "cobre"
            ? "orange"
            : raw.hairColor === "plata"
              ? "white"
              : normalizeAvatarValue(raw.hairColor, avatarOptionSets.hairColor, "brown"),
    accessory:
      raw.facialHair === "bigote"
        ? "bigote"
        : raw.facialHair === "barba-corta"
          ? "barba-corta"
          : normalizeAvatarValue(raw.accessory, avatarOptionSets.accessory, "ninguno"),
    upper: normalizeAvatarValue(raw.upper, avatarOptionSets.upper, legacyOutfit.upper),
    upperColor: normalizeAvatarValue(raw.upperColor, avatarOptionSets.upperColor, "smoke"),
    lower: normalizeAvatarValue(raw.lower, avatarOptionSets.lower, legacyOutfit.lower),
    lowerColor: normalizeAvatarValue(raw.lowerColor, avatarOptionSets.lowerColor, "umber"),
    socks: normalizeAvatarValue(raw.socks, avatarOptionSets.socks, legacyOutfit.socks),
    socksColor: normalizeAvatarValue(raw.socksColor, avatarOptionSets.socksColor, "cream"),
  };

  if (fallback.accessory !== "ninguno") {
    return fallback;
  }

  return {
    ...fallback,
    accessory:
      raw.accessory === "linterna" || raw.accessory === "libro" || raw.accessory === "te" || raw.accessory === "pluma"
        ? "ninguno"
        : fallback.accessory,
  };
}

const STORAGE_KEY = "scholars-sanctuary-state-v3";
const CHANNEL_NAME = "scholars-sanctuary-live";
const DEFAULT_PRIVATE_DESCRIPTION = "Sala reservada para amistades invitadas y foco compartido.";

export const anonymousPreviewAvatar: AvatarConfig = normalizeAvatarConfig({
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
});

function createAnonymousPreviewProfile(createdAt: number): Profile {
  return {
    id: "anonymous-preview",
    displayName: "Visitante del santuario",
    handle: "@solo-lectura",
    avatar: anonymousPreviewAvatar,
    bio: "Explora el santuario en modo de solo lectura hasta conectar tu cuenta.",
    createdAt,
  };
}

export const anonymousPreviewProfile = createAnonymousPreviewProfile(0);

const demoProfiles: Profile[] = [
  {
    id: "demo-lyra",
    displayName: "Lyra de las estanterías",
    handle: "@lyra",
    avatar: normalizeAvatarConfig({
      sex: "femenino",
      skinTone: "ivory",
      hairStyle: "medium-07-bob-side-part",
      hairColor: "ruby",
      accessory: "ninguno",
      upper: "shirt-04-tee",
      upperColor: "cerise",
      lower: "pants-02-leggings",
      lowerColor: "plum",
      socks: "socks-02-high",
      socksColor: "cream",
    }),
    bio: "Lleva el pulso del archivo al amanecer.",
    createdAt: Date.now(),
    isDemo: true,
  },
  {
    id: "demo-bruno",
    displayName: "Bruno del campanario",
    handle: "@bruno",
    avatar: normalizeAvatarConfig({
      sex: "masculino",
      skinTone: "bronze",
      hairStyle: "short-04-cowlick",
      hairColor: "black",
      accessory: "barbuta",
      upper: "shirt-02-vneck-longsleeve",
      upperColor: "blue-violet",
      lower: "pants-04-cuffed",
      lowerColor: "coffee",
      socks: "socks-02-high",
      socksColor: "cream",
    }),
    bio: "Prefiere estudiar en silencio y descansar entre setos.",
    createdAt: Date.now(),
    isDemo: true,
  },
  {
    id: "demo-ines",
    displayName: "Inés de la mesa larga",
    handle: "@ines",
    avatar: normalizeAvatarConfig({
      sex: "femenino",
      skinTone: "sepia",
      hairStyle: "medium-05-cornrows",
      hairColor: "white",
      accessory: "ninguno",
      upper: "shirt-03-scoop-longsleeve",
      upperColor: "forest",
      lower: "pants-05-overalls",
      lowerColor: "brown",
      socks: "socks-01-ankle",
      socksColor: "cream",
    }),
    bio: "Siempre deja una cita marcada antes de dormir.",
    createdAt: Date.now(),
    isDemo: true,
  },
];

function createInitialState(): SanctuaryState {
  const createdAt = Date.now();
  const profiles = Object.fromEntries(demoProfiles.map((profile) => [profile.id, profile]));

  return {
    version: 7,
    sessionState: "anonymous",
    currentUserId: null,
    currentRoomCode: PUBLIC_ROOM_CODE,
    profiles,
    rooms: {
      [PUBLIC_ROOM_CODE]: {
        code: PUBLIC_ROOM_CODE,
        kind: "public",
        name: "Gran lectorio compartido",
        description: "La sala pública del santuario donde se ve el pulso del resto.",
        memberIds: demoProfiles.map((profile) => profile.id),
        createdAt,
      },
    },
    presences: {
      "demo-lyra": {
        userId: "demo-lyra",
        roomCode: PUBLIC_ROOM_CODE,
        roomKind: "public",
        state: "studying",
        space: "library",
        message: "Estudiando",
        updatedAt: createdAt,
      },
      "demo-bruno": {
        userId: "demo-bruno",
        roomCode: PUBLIC_ROOM_CODE,
        roomKind: "public",
        state: "break",
        space: "garden",
        message: "Vuelvo en cinco minutos",
        updatedAt: createdAt,
      },
      "demo-ines": {
        userId: "demo-ines",
        roomCode: PUBLIC_ROOM_CODE,
        roomKind: "public",
        state: "studying",
        space: "library",
        message: "Estudiando",
        updatedAt: createdAt,
      },
    },
    timer: {
      roomKind: "solo",
      roomCode: SOLO_ROOM_CODE,
      phase: "focus",
      status: "idle",
      focusDurationSeconds: FOCUS_SECONDS,
      breakDurationSeconds: BREAK_SECONDS,
      durationSeconds: FOCUS_SECONDS,
      remainingSeconds: FOCUS_SECONDS,
      endsAt: null,
      updatedAt: createdAt,
    },
    sessions: [],
    chronicleEntries: [],
    achievementUnlocks: [],
    friendIds: demoProfiles.map((profile) => profile.id),
  };
}

function toHandle(value: string) {
  return `@${value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "escriba"}`;
}

function createPrivateCode(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);

  return slug ? `sala-${slug}` : `sala-${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isAuthenticated(state: SanctuaryState) {
  return state.sessionState === "authenticated" && Boolean(state.currentUserId);
}

function normalizeStoredState(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const fallback = createInitialState();
  const parsed = cloneState(value as unknown) as SanctuaryState & {
    authMode?: "guest" | "account";
    sessionState?: SessionState;
  };
  if (
    parsed.version !== 3 &&
    parsed.version !== 4 &&
    parsed.version !== 5 &&
    parsed.version !== 6 &&
    parsed.version !== 7
  ) {
    return null;
  }

  parsed.version = 7;
  parsed.sessionState =
    parsed.sessionState === "authenticated" || parsed.authMode === "account" ? "authenticated" : "anonymous";
  parsed.currentUserId = typeof parsed.currentUserId === "string" && parsed.currentUserId ? parsed.currentUserId : null;
  parsed.currentRoomCode =
    typeof parsed.currentRoomCode === "string" && parsed.currentRoomCode
      ? parsed.currentRoomCode
      : fallback.currentRoomCode;
  parsed.profiles = {
    ...fallback.profiles,
    ...Object.fromEntries(
      Object.entries(parsed.profiles ?? {}).map(([profileId, profile]) => [
        profileId,
        {
          ...profile,
          avatar: normalizeAvatarConfig(profile.avatar),
        },
      ]),
    ),
  };
  delete parsed.profiles["guest-current"];
  parsed.rooms = {
    ...fallback.rooms,
    ...(parsed.rooms ?? {}),
  };
  parsed.presences = {
    ...fallback.presences,
    ...(parsed.presences ?? {}),
  };
  delete parsed.presences["guest-current"];
  parsed.sessions = (Array.isArray(parsed.sessions) ? parsed.sessions : [])
    .filter((session) => typeof session.userId === "string" && session.userId !== "guest-current")
    .map((session) => ({
      ...session,
      breakSeconds:
        typeof session.breakSeconds === "number" && Number.isFinite(session.breakSeconds)
          ? session.breakSeconds
          : BREAK_SECONDS,
      startedAt:
        typeof session.startedAt === "number" && Number.isFinite(session.startedAt)
          ? session.startedAt
          : typeof session.completedAt === "number"
            ? session.completedAt - session.focusSeconds * 1000
            : Date.now() - session.focusSeconds * 1000,
      serverId: typeof session.serverId === "string" ? session.serverId : null,
      persistedAt:
        typeof session.persistedAt === "number" && Number.isFinite(session.persistedAt)
          ? session.persistedAt
          : null,
    }));
  parsed.chronicleEntries = (Array.isArray(parsed.chronicleEntries) ? parsed.chronicleEntries : []).filter(
    (entry) => typeof entry.userId === "string" && entry.userId !== "guest-current",
  );
  parsed.achievementUnlocks = (Array.isArray(parsed.achievementUnlocks) ? parsed.achievementUnlocks : [])
    .filter((entry) => typeof entry.userId === "string" && entry.userId !== "guest-current")
    .map((entry) => ({
      ...entry,
      persistedAt:
        typeof entry.persistedAt === "number" && Number.isFinite(entry.persistedAt)
          ? entry.persistedAt
          : null,
    }));
  parsed.friendIds = Array.isArray(parsed.friendIds) ? parsed.friendIds : fallback.friendIds;
  parsed.timer = {
    ...fallback.timer,
    ...parsed.timer,
  };
  parsed.timer.focusDurationSeconds = parsed.timer.focusDurationSeconds ?? FOCUS_SECONDS;
  parsed.timer.breakDurationSeconds = parsed.timer.breakDurationSeconds ?? BREAK_SECONDS;
  parsed.timer.durationSeconds =
    parsed.timer.durationSeconds ??
    (parsed.timer.phase === "break" ? parsed.timer.breakDurationSeconds : parsed.timer.focusDurationSeconds);
  parsed.timer.remainingSeconds =
    parsed.timer.remainingSeconds ??
    (parsed.timer.phase === "break" ? parsed.timer.breakDurationSeconds : parsed.timer.focusDurationSeconds);

  if (!parsed.currentUserId || !parsed.profiles[parsed.currentUserId]) {
    parsed.sessionState = "anonymous";
    parsed.currentUserId = null;
  }

  if (!isAuthenticated(parsed)) {
    parsed.currentUserId = null;
    parsed.currentRoomCode = fallback.currentRoomCode;
    parsed.timer = { ...fallback.timer };
  }

  return parsed;
}

function readStoredState() {
  if (!isBrowser()) {
    return createInitialState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    return normalizeStoredState(JSON.parse(raw)) ?? createInitialState();
  } catch {
    return createInitialState();
  }
}

function getRoomKindFromCode(state: SanctuaryState, code: string): RoomKind {
  if (code === SOLO_ROOM_CODE) {
    return "solo";
  }

  return state.rooms[code]?.kind ?? "private";
}

function getCurrentProfile(state: SanctuaryState) {
  if (!state.currentUserId) {
    return null;
  }

  return state.profiles[state.currentUserId] ?? null;
}

export function getRenderableCurrentProfile(state: SanctuaryState) {
  return getCurrentProfile(state) ?? anonymousPreviewProfile;
}

export function getCurrentPresence(state: SanctuaryState) {
  if (!state.currentUserId) {
    return null;
  }

  return state.presences[state.currentUserId] ?? null;
}

function getRoomLabel(state: SanctuaryState, roomCode: string) {
  if (roomCode === SOLO_ROOM_CODE) {
    return "Santuario silencioso";
  }
  return state.rooms[roomCode]?.name ?? "Sala reservada";
}

function toRemoteHandle(username: string) {
  const trimmed = username.trim().replace(/^@+/, "");
  return `@${trimmed || "escriba"}`;
}

function setCurrentPresence(state: SanctuaryState, next: Partial<Presence>) {
  if (!state.currentUserId) {
    return;
  }

  const current = state.presences[state.currentUserId] ?? {
    userId: state.currentUserId,
    roomCode: SOLO_ROOM_CODE,
    roomKind: "solo" as RoomKind,
    state: "idle" as PresenceState,
    space: "solo" as PresenceSpace,
    message: "",
    updatedAt: Date.now(),
  };

  state.presences[state.currentUserId] = {
    ...current,
    ...next,
    updatedAt: Date.now(),
  };
}

function recalculateAchievements(state: SanctuaryState, userId: string) {
  const sessions = state.sessions.filter((session) => session.userId === userId);
  const existingById = new Map(
    state.achievementUnlocks
      .filter((entry) => entry.userId === userId)
      .map((entry) => [entry.id, entry] as const),
  );
  const nextUnlocks = computeAchievementUnlocks(sessions).map(({ id, unlockedAt }) => {
    const existing = existingById.get(id);

    return {
      id,
      userId,
      unlockedAt: existing?.unlockedAt ?? unlockedAt,
      persistedAt: existing?.persistedAt ?? null,
    };
  });

  state.achievementUnlocks = [
    ...state.achievementUnlocks.filter((entry) => entry.userId !== userId),
    ...nextUnlocks,
  ].sort((left, right) => right.unlockedAt - left.unlockedAt);
}

function pushChronicle(
  state: SanctuaryState,
  userId: string,
  title: string,
  description: string,
  tone: ChronicleTone,
  origin: ChronicleEntry["origin"] = "system",
) {
  state.chronicleEntries.unshift({
    id: crypto.randomUUID(),
    userId,
    title,
    description,
    timestamp: Date.now(),
    tone,
    origin,
  });
}

function completeFocusSession(state: SanctuaryState) {
  const userId = state.currentUserId;
  if (!userId) {
    return;
  }

  const completedAt = Date.now();

  state.sessions.unshift({
    id: crypto.randomUUID(),
    userId,
    roomCode: state.timer.roomCode,
    roomKind: state.timer.roomKind,
    focusSeconds: state.timer.focusDurationSeconds,
    breakSeconds: state.timer.breakDurationSeconds,
    startedAt: completedAt - state.timer.focusDurationSeconds * 1000,
    completedAt,
    serverId: null,
    persistedAt: null,
  });

  pushChronicle(
    state,
    userId,
    "Vigilia cerrada",
    `Has completado una sesión de foco en ${getRoomLabel(state, state.timer.roomCode).toLowerCase()}.`,
    state.timer.roomKind === "solo" ? "primary" : "tertiary",
    "timer",
  );

  recalculateAchievements(state, userId);
}

function transitionToBreak(state: SanctuaryState) {
  state.timer = {
    ...state.timer,
    phase: "break",
    status: "running",
    durationSeconds: state.timer.breakDurationSeconds,
    remainingSeconds: state.timer.breakDurationSeconds,
    endsAt: Date.now() + state.timer.breakDurationSeconds * 1000,
    updatedAt: Date.now(),
  };

  setCurrentPresence(state, {
    roomCode: state.timer.roomCode,
    roomKind: state.timer.roomKind,
    state: "break",
    space: state.timer.roomKind === "solo" ? "solo" : "garden",
    message: state.timer.roomKind === "solo" ? "" : "Descansando",
  });
}

function resetFocusState(state: SanctuaryState) {
  state.timer = {
    ...state.timer,
    phase: "focus",
    status: "idle",
    durationSeconds: state.timer.focusDurationSeconds,
    remainingSeconds: state.timer.focusDurationSeconds,
    endsAt: null,
    updatedAt: Date.now(),
  };

  setCurrentPresence(state, {
    roomCode: state.timer.roomKind === "solo" ? SOLO_ROOM_CODE : state.timer.roomCode,
    roomKind: state.timer.roomKind,
    state: "idle",
    space: state.timer.roomKind === "solo" ? "solo" : "library",
    message: "",
  });
}

function syncExpiredTimer(state: SanctuaryState, now = Date.now()) {
  if (!isAuthenticated(state) && state.timer.status !== "idle") {
    state.timer = {
      ...createInitialState().timer,
      updatedAt: now,
    };
    return;
  }

  if (state.timer.status !== "running" || !state.timer.endsAt) {
    return;
  }

  while (state.timer.status === "running" && state.timer.endsAt && now >= state.timer.endsAt) {
    if (state.timer.phase === "focus") {
      completeFocusSession(state);
      transitionToBreak(state);
      continue;
    }

    resetFocusState(state);
    break;
  }
}

function getTimeLeft(state: SanctuaryState, now = Date.now()) {
  if (state.timer.status !== "running" || !state.timer.endsAt) {
    return state.timer.remainingSeconds;
  }

  return Math.max(0, Math.ceil((state.timer.endsAt - now) / 1000));
}

function remapUserReferences(state: SanctuaryState, fromUserId: string | null, toUserId: string) {
  if (!fromUserId || fromUserId === toUserId) {
    return;
  }

  state.sessions = state.sessions.map((session) =>
    session.userId === fromUserId ? { ...session, userId: toUserId } : session,
  );
  state.chronicleEntries = state.chronicleEntries.map((entry) =>
    entry.userId === fromUserId ? { ...entry, userId: toUserId } : entry,
  );
  state.achievementUnlocks = state.achievementUnlocks.map((entry) =>
    entry.userId === fromUserId ? { ...entry, userId: toUserId } : entry,
  );

  Object.values(state.rooms).forEach((room) => {
    if (room.ownerId === fromUserId) {
      room.ownerId = toUserId;
    }

    room.memberIds = Array.from(new Set(room.memberIds.map((memberId) => (memberId === fromUserId ? toUserId : memberId))));
  });

  state.friendIds = Array.from(new Set(state.friendIds.map((friendId) => (friendId === fromUserId ? toUserId : friendId))));

  const previousPresence = state.presences[fromUserId];
  if (previousPresence && !state.presences[toUserId]) {
    state.presences[toUserId] = {
      ...previousPresence,
      userId: toUserId,
    };
  }
}

let currentState = createInitialState();
let hydrated = false;
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function persistState() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  channel?.postMessage(currentState);
}

function ensureHydrated() {
  if (!isBrowser() || hydrated) {
    return;
  }

  hydrated = true;
  currentState = readStoredState();
  channel = new BroadcastChannel(CHANNEL_NAME);

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      currentState = JSON.parse(event.newValue) as SanctuaryState;
      emitChange();
    } catch {
      currentState = createInitialState();
      emitChange();
    }
  });

  channel.addEventListener("message", (event) => {
    currentState = event.data as SanctuaryState;
    emitChange();
  });
}

function commit(mutator: (draft: SanctuaryState) => void) {
  ensureHydrated();
  const draft = cloneState(currentState);
  syncExpiredTimer(draft);
  mutator(draft);
  currentState = draft;
  persistState();
  emitChange();
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureHydrated();
  return currentState;
}

export function useSanctuaryStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => currentState);
}

export function getFullState() {
  ensureHydrated();
  const snapshot = cloneState(currentState);
  syncExpiredTimer(snapshot);
  return snapshot;
}

export function hydrateFromServer(value: unknown) {
  ensureHydrated();
  const nextState = normalizeStoredState(value);
  if (!nextState) {
    return false;
  }

  currentState = nextState;
  persistState();
  emitChange();
  return true;
}

export function getCurrentTimer(state: SanctuaryState, now = Date.now()) {
  const snapshot = cloneState(state);
  syncExpiredTimer(snapshot, now);
  return {
    ...snapshot.timer,
    remainingSeconds: getTimeLeft(snapshot, now),
    roomLabel: getRoomLabel(snapshot, snapshot.timer.roomCode),
  };
}

export function getCurrentProfileSummary(state: SanctuaryState) {
  const profile = getRenderableCurrentProfile(state);
  const sessions = state.sessions.filter((session) => session.userId === profile.id);
  const validAchievementIds = new Set(achievementDefinitions.map((achievement) => achievement.id));
  const achievements = state.achievementUnlocks.filter(
    (entry) => entry.userId === profile.id && validAchievementIds.has(entry.id),
  );
  const latestChronicle =
    state.chronicleEntries.find((entry) => entry.userId === profile.id && entry.origin === "timer") ?? null;

  return {
    profile,
    sessionsCount: sessions.length,
    focusHours: (sessions.reduce((total, session) => total + session.focusSeconds, 0) / 3600).toFixed(1),
    streakDays: getStreakDays(sessions),
    archiveDays: getDistinctSessionDays(sessions),
    achievementsCount: achievements.length,
    latestChronicle,
  };
}

export function getChroniclesForCurrentProfile(state: SanctuaryState) {
  if (!state.currentUserId) {
    return [];
  }

  return state.chronicleEntries.filter((entry) => entry.userId === state.currentUserId && entry.origin === "timer");
}

export function getAchievementsForCurrentProfile(state: SanctuaryState) {
  if (!state.currentUserId) {
    return achievementDefinitions.map((achievement) => ({
      ...achievement,
      unlockedAt: null,
    }));
  }

  const unlocked = new Map(
    state.achievementUnlocks
      .filter((entry) => entry.userId === state.currentUserId)
      .map((entry) => [entry.id, entry.unlockedAt]),
  );

  return achievementDefinitions.map((achievement) => ({
    ...achievement,
    unlockedAt: unlocked.get(achievement.id) ?? null,
  }));
}

export function getCurrentRoom(state: SanctuaryState) {
  return state.rooms[state.currentRoomCode] ?? null;
}

export function getPrivateRoomsForCurrentProfile(state: SanctuaryState) {
  if (!state.currentUserId) {
    return [];
  }

  const currentUserId = state.currentUserId;
  return Object.values(state.rooms)
    .filter((room) => room.kind === "private" && room.memberIds.includes(currentUserId))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export function getFriendsForCurrentProfile(state: SanctuaryState) {
  return state.friendIds.map((id) => state.profiles[id]).filter(Boolean);
}

export function getRoomMembers(state: SanctuaryState, roomCode: string, space: PresenceSpace) {
  const room = state.rooms[roomCode];
  const members = Object.values(state.presences)
    .filter((presence) => presence.roomCode === roomCode && presence.space === space && presence.state !== "offline")
    .map((presence) => ({
      presence,
      profile: state.profiles[presence.userId],
      isCurrentUser: presence.userId === state.currentUserId,
    }))
    .filter((entry) => entry.profile);

  if (room) {
    room.memberIds.forEach((memberId) => {
      if (members.some((entry) => entry.profile.id === memberId)) {
        return;
      }

      const existingPresenceInRoom = Object.values(state.presences).find(
        (presence) => presence.userId === memberId && presence.roomCode === roomCode,
      );
      if (existingPresenceInRoom) {
        return;
      }

      const profile = state.profiles[memberId];
      if (!profile) {
        return;
      }

      members.push({
        profile,
        presence: {
          userId: memberId,
          roomCode,
          roomKind: room.kind,
          state: "idle",
          space: "library",
          message: "",
          updatedAt: room.createdAt,
        },
        isCurrentUser: memberId === state.currentUserId,
      });
    });
  }

  return members
    .filter((entry) => entry.presence.space === space)
    .sort((left, right) => Number(right.isCurrentUser) - Number(left.isCurrentUser));
}

export const sanctuaryActions = {
  connectGitHubAccount(identity: RemoteAccountIdentity) {
    commit((state) => {
      const previousUserId = state.currentUserId;
      const existingProfile = state.profiles[identity.id];
      const sourceProfile = existingProfile ?? (previousUserId ? state.profiles[previousUserId] : null) ?? anonymousPreviewProfile;

      remapUserReferences(state, previousUserId, identity.id);
      state.sessionState = "authenticated";
      state.currentUserId = identity.id;
      state.currentRoomCode = state.rooms[state.currentRoomCode] ? state.currentRoomCode : PUBLIC_ROOM_CODE;
      state.profiles[identity.id] = {
        id: identity.id,
        displayName: identity.displayName,
        handle: toRemoteHandle(identity.username),
        avatar: existingProfile?.avatar ?? sourceProfile?.avatar ?? anonymousPreviewAvatar,
        bio: existingProfile?.bio ?? sourceProfile?.bio ?? `Cuenta del santuario conectada con GitHub como ${toRemoteHandle(identity.username)}.`,
        createdAt: existingProfile?.createdAt ?? sourceProfile?.createdAt ?? Date.now(),
      };

      if (!state.rooms[PUBLIC_ROOM_CODE].memberIds.includes(identity.id)) {
        state.rooms[PUBLIC_ROOM_CODE].memberIds.unshift(identity.id);
      }

      if (previousUserId && previousUserId !== identity.id && state.presences[previousUserId]) {
        state.presences[previousUserId] = {
          ...state.presences[previousUserId],
          state: "offline",
          message: "",
          updatedAt: Date.now(),
        };
      }

      if (!state.presences[identity.id]) {
        setCurrentPresence(state, {
          roomCode: PUBLIC_ROOM_CODE,
          roomKind: "public",
          state: "idle",
          space: "library",
          message: "",
        });
      }

      if (state.timer.roomKind !== "solo" && !state.rooms[state.timer.roomCode]) {
        state.timer.roomKind = "public";
        state.timer.roomCode = PUBLIC_ROOM_CODE;
      }
    });
  },

  returnToAnonymousState() {
    commit((state) => {
      const previousUserId = state.currentUserId;
      state.sessionState = "anonymous";
      state.currentUserId = null;
      state.currentRoomCode = PUBLIC_ROOM_CODE;

      if (previousUserId && state.presences[previousUserId]) {
        state.presences[previousUserId] = {
          ...state.presences[previousUserId],
          state: "offline",
          message: "",
          updatedAt: Date.now(),
        };
      }

      state.timer = {
        ...createInitialState().timer,
        updatedAt: Date.now(),
      };
    });
  },

  renameCurrentProfile(displayName: string) {
    commit((state) => {
      if (!state.currentUserId) {
        return;
      }

      const trimmed = displayName.trim();
      if (!trimmed) {
        return;
      }
      state.profiles[state.currentUserId] = {
        ...state.profiles[state.currentUserId],
        displayName: trimmed,
        handle: toHandle(trimmed),
      };
    });
  },

  updateAvatar<K extends keyof AvatarConfig>(field: K, value: AvatarConfig[K]) {
    commit((state) => {
      if (!state.currentUserId) {
        return;
      }

      state.profiles[state.currentUserId] = {
        ...state.profiles[state.currentUserId],
        avatar: {
          ...state.profiles[state.currentUserId].avatar,
          [field]: value,
        },
      };
    });
  },

  selectPublicRoom() {
    commit((state) => {
      if (!isAuthenticated(state) || !state.currentUserId) {
        return;
      }
      state.currentRoomCode = PUBLIC_ROOM_CODE;
      if (!state.rooms[PUBLIC_ROOM_CODE].memberIds.includes(state.currentUserId)) {
        state.rooms[PUBLIC_ROOM_CODE].memberIds.unshift(state.currentUserId);
      }
      setCurrentPresence(state, {
        roomCode: PUBLIC_ROOM_CODE,
        roomKind: "public",
        state: state.timer.phase === "break" ? "break" : "idle",
        space: state.timer.phase === "break" ? "garden" : "library",
      });
    });
  },

  createPrivateRoom(name: string, invitedIds: string[]) {
    commit((state) => {
      if (!isAuthenticated(state) || !state.currentUserId) {
        return;
      }

      const trimmed = name.trim() || "Círculo privado";
      const code = createPrivateCode(trimmed);
      const memberIds = Array.from(new Set([state.currentUserId, ...invitedIds.filter(Boolean)]));

      state.rooms[code] = {
        code,
        kind: "private",
        name: trimmed,
        description: DEFAULT_PRIVATE_DESCRIPTION,
        ownerId: state.currentUserId,
        memberIds,
        createdAt: Date.now(),
      };
      state.currentRoomCode = code;

      invitedIds.forEach((friendId, index) => {
        if (!state.profiles[friendId]) {
          return;
        }
        state.presences[friendId] = {
          userId: friendId,
          roomCode: code,
          roomKind: "private",
          state: index % 2 === 0 ? "idle" : "break",
          space: index % 2 === 0 ? "library" : "garden",
          message: index % 2 === 0 ? "" : "Nos vemos en la pausa",
          updatedAt: Date.now(),
        };
      });

      setCurrentPresence(state, {
        roomCode: code,
        roomKind: "private",
        state: "idle",
        space: "library",
        message: "",
      });

      recalculateAchievements(state, state.currentUserId);
    });
  },

  joinPrivateRoom(code: string) {
    commit((state) => {
      if (!isAuthenticated(state) || !state.currentUserId) {
        return;
      }

      const room = state.rooms[code.trim()];
      if (!room || room.kind !== "private") {
        return;
      }

      if (!room.memberIds.includes(state.currentUserId)) {
        room.memberIds.unshift(state.currentUserId);
      }

      state.currentRoomCode = room.code;
      setCurrentPresence(state, {
        roomCode: room.code,
        roomKind: "private",
        state: "idle",
        space: "library",
        message: "",
      });
    });
  },

  setQuickMessage(message: string) {
    commit((state) => {
      const trimmed = message.trim().slice(0, 80);
      if (!isAuthenticated(state) || state.timer.roomKind === "solo") {
        return;
      }

      setCurrentPresence(state, {
        roomCode: state.currentRoomCode,
        roomKind: getRoomKindFromCode(state, state.currentRoomCode),
        state: state.timer.phase === "break" ? "break" : "idle",
        space: state.timer.phase === "break" ? "garden" : "library",
        message: trimmed,
      });
    });
  },

  clearQuickMessage() {
    commit((state) => {
      if (!isAuthenticated(state)) {
        return;
      }

      setCurrentPresence(state, { message: "" });
    });
  },

  startTimer(roomKind: RoomKind, roomCode: string) {
    commit((state) => {
      if (!isAuthenticated(state) || !state.currentUserId) {
        return;
      }

      state.timer.roomKind = roomKind;
      state.timer.roomCode = roomCode;
      state.timer.status = "running";
      state.timer.endsAt = Date.now() + getTimeLeft(state) * 1000;
      state.timer.updatedAt = Date.now();

      setCurrentPresence(state, {
        roomCode,
        roomKind,
        state: state.timer.phase === "break" ? "break" : "studying",
        space: roomKind === "solo" ? "solo" : state.timer.phase === "break" ? "garden" : "library",
        message: state.timer.phase === "break" ? state.presences[state.currentUserId]?.message || "Descansando" : "Estudiando",
      });
    });
  },

  pauseTimer() {
    commit((state) => {
      if (!isAuthenticated(state) || !state.currentUserId) {
        return;
      }

      const remainingSeconds = getTimeLeft(state);
      state.timer.status = "paused";
      state.timer.remainingSeconds = remainingSeconds;
      state.timer.endsAt = null;
      state.timer.updatedAt = Date.now();

      setCurrentPresence(state, {
        state: state.timer.phase === "break" ? "break" : "idle",
        message: state.timer.phase === "break" ? state.presences[state.currentUserId]?.message || "Descansando" : "",
      });
    });
  },

  resetTimer(roomKind: RoomKind, roomCode: string) {
    commit((state) => {
      if (!isAuthenticated(state)) {
        return;
      }

      state.timer = {
        roomKind,
        roomCode,
        phase: "focus",
        status: "idle",
        focusDurationSeconds: state.timer.focusDurationSeconds,
        breakDurationSeconds: state.timer.breakDurationSeconds,
        durationSeconds: state.timer.focusDurationSeconds,
        remainingSeconds: state.timer.focusDurationSeconds,
        endsAt: null,
        updatedAt: Date.now(),
      };

      setCurrentPresence(state, {
        roomCode,
        roomKind,
        state: "idle",
        space: roomKind === "solo" ? "solo" : "library",
        message: "",
      });
    });
  },

  updateTimerDurations(focusMinutes: number, breakMinutes: number) {
    commit((state) => {
      if (!isAuthenticated(state)) {
        return;
      }

      const safeFocusMinutes = Number.isFinite(focusMinutes) ? focusMinutes : state.timer.focusDurationSeconds / 60;
      const safeBreakMinutes = Number.isFinite(breakMinutes) ? breakMinutes : state.timer.breakDurationSeconds / 60;
      const nextFocusSeconds = Math.min(180, Math.max(5, Math.round(safeFocusMinutes))) * 60;
      const nextBreakSeconds = Math.min(60, Math.max(1, Math.round(safeBreakMinutes))) * 60;

      state.timer.focusDurationSeconds = nextFocusSeconds;
      state.timer.breakDurationSeconds = nextBreakSeconds;

      if (state.timer.status === "running") {
        return;
      }

      const nextDuration = state.timer.phase === "break" ? nextBreakSeconds : nextFocusSeconds;
      state.timer.durationSeconds = nextDuration;
      state.timer.remainingSeconds = nextDuration;
      state.timer.endsAt = null;
      state.timer.updatedAt = Date.now();
    });
  },

  markSessionPersisted(sessionId: string, serverId: string, persistedAt: number) {
    commit((state) => {
      const session = state.sessions.find((entry) => entry.id === sessionId);
      if (!session) {
        return;
      }

      session.serverId = serverId;
      session.persistedAt = persistedAt;
    });
  },

  hydrateServerProgress(payload: {
    sessions?: Array<{
      clientSessionId: string;
      serverId: string;
      roomCode: string;
      roomKind: RoomKind;
      focusSeconds: number;
      breakSeconds: number;
      startedAt: number;
      completedAt: number;
      persistedAt: number;
    }>;
    chronicleEntries?: ChronicleEntry[];
    achievementUnlocks?: AchievementUnlock[];
  }) {
    commit((state) => {
      const userId = state.currentUserId;
      if (!userId) {
        return;
      }

      const byId = new Map(
        state.sessions
          .filter((session) => session.userId === userId)
          .map((session) => [session.id, session] as const),
      );

      payload.sessions?.forEach((session) => {
        byId.set(session.clientSessionId, {
          id: session.clientSessionId,
          userId,
          roomCode: session.roomCode,
          roomKind: session.roomKind,
          focusSeconds: session.focusSeconds,
          breakSeconds: session.breakSeconds,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          serverId: session.serverId,
          persistedAt: session.persistedAt,
        });
      });

      state.sessions = [
        ...state.sessions.filter((session) => session.userId !== userId),
        ...[...byId.values()],
      ].sort((left, right) => right.completedAt - left.completedAt);

      if (payload.chronicleEntries) {
        state.chronicleEntries = [
          ...state.chronicleEntries.filter((entry) => !(entry.userId === userId && entry.origin === "timer")),
          ...payload.chronicleEntries.map((entry) => ({ ...entry, userId })),
        ].sort((left, right) => right.timestamp - left.timestamp);
      }

      if (payload.achievementUnlocks) {
        state.achievementUnlocks = [
          ...state.achievementUnlocks.filter((entry) => entry.userId !== userId),
          ...payload.achievementUnlocks.map((entry) => ({
            ...entry,
            userId,
            persistedAt: entry.persistedAt ?? entry.unlockedAt,
          })),
        ].sort((left, right) => right.unlockedAt - left.unlockedAt);
      }
    });
  },

  syncTimer() {
    commit((state) => {
      syncExpiredTimer(state);
      if (state.timer.status === "running") {
        state.timer.remainingSeconds = getTimeLeft(state);
      }
    });
  },

  setRemotePresences(members: RoomMemberPresence[]) {
    commit((state) => {
      const currentUserId = state.currentUserId;

      for (const key of Object.keys(state.presences)) {
        if (key !== currentUserId) {
          delete state.presences[key];
        }
      }

      members.forEach((member) => {
        if (member.userId === currentUserId) return;

        if (!state.profiles[member.userId]) {
          state.profiles[member.userId] = {
            id: member.userId,
            displayName: member.displayName,
            handle: `@${member.username}`,
            avatar: member.avatar,
            bio: "",
            createdAt: Date.now(),
          };
        } else {
          state.profiles[member.userId].avatar = member.avatar;
          state.profiles[member.userId].displayName = member.displayName;
        }

        state.presences[member.userId] = {
          userId: member.userId,
          roomCode: state.currentRoomCode,
          roomKind: state.rooms[state.currentRoomCode]?.kind ?? "public",
          state: member.state as PresenceState,
          space: member.state === "break" ? "garden" : "library",
          message: member.message,
          updatedAt: Date.now(),
        };
      });
    });
  },

  addRemotePresence(member: RoomMemberPresence) {
    commit((state) => {
      if (member.userId === state.currentUserId) return;

      if (!state.profiles[member.userId]) {
        state.profiles[member.userId] = {
          id: member.userId,
          displayName: member.displayName,
          handle: `@${member.username}`,
          avatar: member.avatar,
          bio: "",
          createdAt: Date.now(),
        };
      }

      state.presences[member.userId] = {
        userId: member.userId,
        roomCode: state.currentRoomCode,
        roomKind: state.rooms[state.currentRoomCode]?.kind ?? "public",
        state: member.state as PresenceState,
        space: member.state === "break" ? "garden" : "library",
        message: member.message,
        updatedAt: Date.now(),
      };

      const room = state.rooms[state.currentRoomCode];
      if (room && !room.memberIds.includes(member.userId)) {
        room.memberIds.push(member.userId);
      }
    });
  },

  removeRemotePresence(userId: string) {
    commit((state) => {
      if (userId === state.currentUserId) return;
      delete state.presences[userId];

      const room = state.rooms[state.currentRoomCode];
      if (room) {
        room.memberIds = room.memberIds.filter((id) => id !== userId);
      }
    });
  },

  updateRemotePresence(data: { userId: string; state: string; phase: string; status: string; remainingSeconds: number; message: string }) {
    commit((state) => {
      if (data.userId === state.currentUserId) return;

      const presence = state.presences[data.userId];
      if (presence) {
        presence.state = data.state as PresenceState;
        presence.space = data.state === "break" ? "garden" : "library";
        presence.message = data.message;
        presence.updatedAt = Date.now();
      }
    });
  },
};
