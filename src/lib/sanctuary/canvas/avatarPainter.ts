import type { AvatarConfig } from "@/lib/sanctuary/store";
import type {
  ActorPose,
  ActorState,
  Facing,
} from "@/lib/sanctuary/canvas/types";

interface DrawAvatarOptions {
  avatar: AvatarConfig;
  state: ActorState;
  pose: ActorPose;
  facing: Facing;
  x: number;
  y: number;
  tick: number;
  highlighted?: boolean;
}

const skinTones = {
  amber: "#d8aa78",
  bronze: "#b5784e",
  brown: "#915d3e",
  chocolate: "#734433",
  coffee: "#604136",
  cream: "#f3d8b9",
  ivory: "#f7e4c8",
  leather: "#9a6a4b",
  peach: "#efc1a2",
  sepia: "#6d4635",
  tan: "#bb865f",
} as const;

const hairTones = {
  "ash-brown": "#7b5a47",
  black: "#241c1a",
  blonde: "#dcb66b",
  blue: "#4d6eb4",
  brown: "#644634",
  chestnut: "#7a452d",
  gray: "#a2a5ab",
  green: "#56714b",
  orange: "#bf6c2b",
  pink: "#cf8ba5",
  platinum: "#d7dce0",
  raven: "#1f1820",
  red: "#b03d31",
  ruby: "#7c3348",
  teal: "#2f7a78",
  violet: "#6e589c",
  white: "#ececec",
} as const;

const garmentTones = {
  amber: "#b8782d",
  amethyst: "#6a4a8c",
  barberry: "#7a2338",
  black: "#262223",
  blue: "#3d69a6",
  "blue-violet": "#5650a2",
  bronze: "#98714f",
  brown: "#72503b",
  "burnt-orange": "#b95c23",
  "burnt-umber": "#7a4b32",
  cerise: "#a13668",
  chocolate: "#5b3323",
  coffee: "#5d4336",
  cornflower: "#6d85d5",
  cream: "#d8c5a3",
  cyan: "#3e9ca7",
  fern: "#4c7a45",
  forest: "#355a3d",
  gray: "#6f7075",
  green: "#4a8244",
  ice: "#95d3eb",
  indigo: "#433f7e",
  ivory: "#efe7d5",
  lavender: "#927eb7",
  leather: "#886048",
  mustard: "#9e8130",
  navy: "#2e446e",
  neptune: "#2f6a78",
  olivine: "#728b4d",
  orange: "#c36b22",
  peach: "#d8a38a",
  pink: "#c77ea4",
  plum: "#69415a",
  red: "#a53a36",
  sepia: "#6a4d3f",
  silver: "#9ca5b0",
  smoke: "#8b8583",
  spring: "#69a04f",
  swamp: "#536246",
  tan: "#b18462",
  tumeric: "#b78e28",
  umber: "#694a39",
  white: "#f3f3f1",
  yellow: "#d6b730",
} as const;

const upperTones = {
  "shirt-01-longsleeve": {
    primary: "#7a5638",
    trim: "#e9c48e",
    shadow: "#4d321f",
  },
  "shirt-02-vneck-longsleeve": {
    primary: "#5f456f",
    trim: "#dcbde7",
    shadow: "#34253d",
  },
  "shirt-03-scoop-longsleeve": {
    primary: "#6c4c45",
    trim: "#f0c5ae",
    shadow: "#43302a",
  },
  "shirt-04-tee": { primary: "#405f45", trim: "#cde4b8", shadow: "#243628" },
  "shirt-05-vneck-tee": {
    primary: "#516677",
    trim: "#d7e5f3",
    shadow: "#31404c",
  },
  "shirt-06-scoop-tee": {
    primary: "#8b6047",
    trim: "#f2cb95",
    shadow: "#5e3d2b",
  },
} as const;

const helmetTones = {
  barbarian: "#98704e",
  "barbarian-nasal": "#8d8f96",
  "barbarian-viking": "#8f6b49",
  barbuta: "#8d9096",
  "barbuta-simple": "#9b9ca3",
  close: "#868a92",
  flattop: "#a49986",
  greathelm: "#7f848c",
  nasal: "#8f9099",
  spangenhelm: "#8b887d",
  "spangenhelm-viking": "#8d8368",
  sugarloaf: "#8d9298",
  "sugarloaf-simple": "#a2a5ab",
} as const;

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawAccessory(
  ctx: CanvasRenderingContext2D,
  avatar: AvatarConfig,
  x: number,
  y: number,
  facing: Facing,
) {
  const tone = hairTones[avatar.hairColor];
  const baseX = Math.round(
    x - 4 + (facing === "left" ? -1 : facing === "right" ? 1 : 0),
  );
  const baseY = Math.round(y - 24);

  if (avatar.accessory === "bigote") {
    px(ctx, baseX + 3, baseY + 12, 6, 1, tone);
    return;
  }

  if (avatar.accessory === "barba-corta") {
    px(ctx, baseX + 2, baseY + 12, 8, 3, tone);
    px(ctx, baseX + 4, baseY + 15, 4, 1, tone);
    return;
  }

  if (avatar.accessory === "ninguno") {
    return;
  }

  const helmetTone = helmetTones[avatar.accessory];
  px(ctx, baseX + 1, baseY + 2, 10, 5, helmetTone);
  px(ctx, baseX, baseY + 5, 12, 4, helmetTone);
  px(ctx, baseX + 2, baseY + 9, 8, 3, "#2d2421");
  if (
    avatar.accessory === "barbarian-viking" ||
    avatar.accessory === "spangenhelm-viking" ||
    avatar.accessory === "barbarian"
  ) {
    px(ctx, baseX - 1, baseY + 4, 2, 3, "#ccb493");
    px(ctx, baseX + 11, baseY + 4, 2, 3, "#ccb493");
  }
  if (avatar.accessory === "nasal" || avatar.accessory === "barbarian-nasal") {
    px(ctx, baseX + 5, baseY + 7, 2, 5, "#a89f86");
  }
}

export function drawPixelAvatar(
  ctx: CanvasRenderingContext2D,
  options: DrawAvatarOptions,
) {
  const {
    avatar,
    state,
    pose,
    facing,
    x,
    y,
    tick,
    highlighted = false,
  } = options;
  const upper = {
    ...upperTones[avatar.upper],
    primary: garmentTones[avatar.upperColor],
  };
  const lower = garmentTones[avatar.lowerColor];
  const socks = garmentTones[avatar.socksColor];
  const skin = skinTones[avatar.skinTone];
  const hair = hairTones[avatar.hairColor];
  const bodyWidth = avatar.sex === "masculino" ? 11 : 9;
  const bodyX = Math.round(x - bodyWidth / 2);
  const bodyY = Math.round(y - (pose === "sitting" ? 14 : 18));
  const headX = Math.round(x - 4);
  const headY = bodyY - 7;
  const stepFrame = Math.round((tick / 160) % 2);
  const walkOffset = pose === "walk" ? (stepFrame === 0 ? -1 : 1) : 0;
  const bob =
    pose === "walk"
      ? stepFrame === 0
        ? 0
        : 1
      : state === "break"
        ? Math.round(Math.sin(tick / 260) * 0.8)
        : 0;

  px(ctx, x - 7, y - 1, 14, 3, "rgba(0,0,0,0.32)");

  if (highlighted) {
    px(ctx, x - 9, y + 3, 18, 2, "#ffb961");
  }

  if (pose !== "sitting") {
    px(ctx, x - 4 + walkOffset, y - 7, 3, 7, lower);
    px(ctx, x + 1 - walkOffset, y - 7, 3, 7, lower);
    px(ctx, x - 4 + walkOffset, y - 4, 3, 2, socks);
    px(ctx, x + 1 - walkOffset, y - 4, 3, 2, socks);
  } else {
    px(ctx, x - 6, y - 5, 12, 4, "#4a3526");
    px(ctx, x - 4, y - 1, 3, 3, lower);
    px(ctx, x + 1, y - 1, 3, 3, lower);
  }

  px(
    ctx,
    bodyX,
    bodyY + bob,
    bodyWidth,
    pose === "sitting" ? 10 : 12,
    upper.primary,
  );
  px(ctx, bodyX + 1, bodyY + bob + 1, bodyWidth - 2, 2, upper.trim);
  px(ctx, x - 1, bodyY + bob + 2, 2, pose === "sitting" ? 8 : 10, upper.shadow);

  px(ctx, headX, headY + bob, 8, 8, skin);

  if (
    avatar.accessory === "ninguno" ||
    avatar.accessory === "bigote" ||
    avatar.accessory === "barba-corta"
  ) {
    px(ctx, headX, headY + bob, 8, 3, hair);

    if (avatar.hairStyle.startsWith("medium-")) {
      px(ctx, headX - 1, headY + bob + 2, 2, 5, hair);
      px(ctx, headX + 7, headY + bob + 2, 2, 5, hair);
    }

    if (avatar.hairStyle === "medium-04-bangs-bun") {
      px(ctx, headX + 6, headY + bob - 1, 2, 2, hair);
    }

    if (
      avatar.hairStyle === "short-03-curly" ||
      avatar.hairStyle === "medium-02-curly"
    ) {
      px(ctx, headX - 1, headY + bob + 1, 1, 2, hair);
      px(ctx, headX + 8, headY + bob + 1, 1, 2, hair);
    }

    if (
      avatar.hairStyle === "short-01-buzzcut" ||
      avatar.hairStyle === "short-06-balding"
    ) {
      px(ctx, headX + 1, headY + bob, 6, 2, hair);
    }
  }

  px(ctx, headX + 2, headY + bob + 4, 1, 1, "#261a17");
  px(ctx, headX + 5, headY + bob + 4, 1, 1, "#261a17");
  px(ctx, headX + 3, headY + bob + 6, 2, 1, "#8a5a38");

  drawAccessory(ctx, avatar, x, y - (pose === "sitting" ? 10 : 13), facing);

  if (state === "studying") {
    px(ctx, bodyX - 1, bodyY + bob + 5, 1, 5, upper.shadow);
    px(ctx, bodyX + bodyWidth, bodyY + bob + 5, 1, 5, upper.shadow);
  }
}

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
) {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const label = trimmed.length > 20 ? `${trimmed.slice(0, 20)}…` : trimmed;
  ctx.save();
  ctx.font = "bold 8px monospace";
  const textWidth = Math.ceil(ctx.measureText(label).width);
  const bubbleWidth = textWidth + 10;
  const bubbleHeight = 14;
  const bubbleX = Math.round(x - bubbleWidth / 2);
  const bubbleY = Math.round(y - 32);

  px(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, "#171311");
  px(
    ctx,
    bubbleX + 1,
    bubbleY + 1,
    bubbleWidth - 2,
    bubbleHeight - 2,
    "#efe1cb",
  );
  px(ctx, x - 2, bubbleY + bubbleHeight - 1, 4, 4, "#171311");
  px(ctx, x - 1, bubbleY + bubbleHeight, 2, 3, "#efe1cb");

  ctx.fillStyle = "#2a1d19";
  ctx.fillText(label, bubbleX + 5, bubbleY + 10);
  ctx.restore();
}
