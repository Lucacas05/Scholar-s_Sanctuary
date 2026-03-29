import { Flame, MoonStar, Sparkles } from "lucide-react";
import { getAvatarArtManifest } from "@/lib/sanctuary/avatarArt";
import type { AvatarConfig, PresenceState } from "@/lib/sanctuary/store";

interface PixelAvatarProps {
  avatar: AvatarConfig;
  state?: PresenceState;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
  highlighted?: boolean;
  showStatusBadge?: boolean;
  stage?: "panel" | "plain";
  anchor?: "bottom" | "center";
}

interface SizeMetrics {
  frameWidth: number;
  frameHeight: number;
  spriteScale: number;
  badgeSize: number;
  labelClass: string;
  bottomOffset: number;
}

const stateIcons = {
  idle: MoonStar,
  studying: Flame,
  break: Sparkles,
  away: MoonStar,
  offline: MoonStar,
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

const sizeMetrics: Record<
  NonNullable<PixelAvatarProps["size"]>,
  SizeMetrics
> = {
  sm: {
    frameWidth: 86,
    frameHeight: 108,
    spriteScale: 1.18,
    badgeSize: 22,
    labelClass: "text-[9px]",
    bottomOffset: 6,
  },
  md: {
    frameWidth: 108,
    frameHeight: 142,
    spriteScale: 1.5,
    badgeSize: 28,
    labelClass: "text-[10px]",
    bottomOffset: 8,
  },
  lg: {
    frameWidth: 164,
    frameHeight: 208,
    spriteScale: 2.38,
    badgeSize: 34,
    labelClass: "text-xs",
    bottomOffset: 10,
  },
  xl: {
    frameWidth: 228,
    frameHeight: 284,
    spriteScale: 3.28,
    badgeSize: 40,
    labelClass: "text-xs",
    bottomOffset: 12,
  },
  xxl: {
    frameWidth: 332,
    frameHeight: 388,
    spriteScale: 4.55,
    badgeSize: 44,
    labelClass: "text-sm",
    bottomOffset: 18,
  },
};

function SpriteSheetLayer({
  src,
  sheetWidth,
  sheetHeight,
  scale,
  frameX,
  frameY,
  className = "",
}: {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  scale: number;
  frameX?: number;
  frameY?: number;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: `${sheetWidth * scale}px ${sheetHeight * scale}px`,
        backgroundPosition: `-${(frameX ?? 0) * scale}px -${(frameY ?? 0) * scale}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

function FaceOverlay({
  avatar,
  scale,
}: {
  avatar: AvatarConfig;
  scale: number;
}) {
  const hairTone = hairTones[avatar.hairColor];
  const unit = scale;

  return (
    <>
      <span
        className="absolute rounded-none bg-[#2a201d]"
        style={{
          left: 24 * unit,
          top: 17 * unit,
          width: 4 * unit,
          height: 2 * unit,
        }}
      />
      <span
        className="absolute rounded-none bg-[#2a201d]"
        style={{
          left: 36 * unit,
          top: 17 * unit,
          width: 4 * unit,
          height: 2 * unit,
        }}
      />
      <span
        className="absolute rounded-none bg-[#7b4d3e]"
        style={{
          left: 29 * unit,
          top: 26 * unit,
          width: 6 * unit,
          height: unit,
        }}
      />
      {avatar.accessory === "bigote" && (
        <span
          className="absolute rounded-none"
          style={{
            left: 27 * unit,
            top: 22 * unit,
            width: 10 * unit,
            height: 2 * unit,
            backgroundColor: hairTone,
          }}
        />
      )}
      {avatar.accessory === "barba-corta" && (
        <span
          className="absolute rounded-b-[0.18rem]"
          style={{
            left: 26 * unit,
            top: 22 * unit,
            width: 12 * unit,
            height: 7 * unit,
            backgroundColor: hairTone,
          }}
        />
      )}
    </>
  );
}

export function PixelAvatar({
  avatar,
  state = "idle",
  name,
  size = "md",
  highlighted = false,
  showStatusBadge = true,
  stage = "panel",
  anchor = "bottom",
}: PixelAvatarProps) {
  const StateIcon = stateIcons[state];
  const metrics = sizeMetrics[size];
  const manifest = getAvatarArtManifest(avatar);
  const spriteScale = metrics.spriteScale;
  const spriteSize = 64 * spriteScale;
  const stageLeft = (metrics.frameWidth - spriteSize) / 2;
  const stageTop =
    anchor === "center"
      ? (metrics.frameHeight - spriteSize) / 2
      : metrics.frameHeight - spriteSize - metrics.bottomOffset;
  const showHair = manifest.accessoryKind !== "helmet";
  const showPanel = stage === "panel";

  return (
    <div
      className="relative"
      style={{ width: metrics.frameWidth, height: metrics.frameHeight }}
    >
      {showPanel || anchor === "bottom" ? (
        <div
          className={`absolute inset-x-[14%] bottom-1 h-5 rounded-full ${
            showPanel ? "bg-black/35 blur-md" : "bg-black/18 blur-sm"
          }`}
        />
      ) : null}
      <div
        className={`absolute ${
          showPanel
            ? "rounded-[1rem] border border-surface-container-highest/80 bg-surface-container/50 shadow-[0_12px_0_rgba(0,0,0,0.16)]"
            : "bg-transparent"
        } ${
          highlighted
            ? "ring-2 ring-primary/70 ring-offset-2 ring-offset-surface"
            : ""
        }`}
        style={{
          left: stageLeft,
          top: stageTop,
          width: spriteSize,
          height: spriteSize,
          imageRendering: "pixelated",
        }}
      >
        {showHair && manifest.hairBack ? (
          <SpriteSheetLayer
            src={manifest.hairBack.src}
            sheetWidth={manifest.hairBack.sheetWidth}
            sheetHeight={manifest.hairBack.sheetHeight}
            frameX={manifest.hairBack.frameX}
            frameY={manifest.hairBack.frameY}
            scale={spriteScale}
          />
        ) : null}
        <SpriteSheetLayer
          src={manifest.body.src}
          sheetWidth={manifest.body.sheetWidth}
          sheetHeight={manifest.body.sheetHeight}
          frameX={manifest.body.frameX}
          frameY={manifest.body.frameY}
          scale={spriteScale}
        />
        <SpriteSheetLayer
          src={manifest.socks.src}
          sheetWidth={manifest.socks.sheetWidth}
          sheetHeight={manifest.socks.sheetHeight}
          frameX={manifest.socks.frameX}
          frameY={manifest.socks.frameY}
          scale={spriteScale}
        />
        <SpriteSheetLayer
          src={manifest.lower.src}
          sheetWidth={manifest.lower.sheetWidth}
          sheetHeight={manifest.lower.sheetHeight}
          frameX={manifest.lower.frameX}
          frameY={manifest.lower.frameY}
          scale={spriteScale}
        />
        <SpriteSheetLayer
          src={manifest.upper.src}
          sheetWidth={manifest.upper.sheetWidth}
          sheetHeight={manifest.upper.sheetHeight}
          frameX={manifest.upper.frameX}
          frameY={manifest.upper.frameY}
          scale={spriteScale}
        />
        <SpriteSheetLayer
          src={manifest.head.src}
          sheetWidth={manifest.head.sheetWidth}
          sheetHeight={manifest.head.sheetHeight}
          frameX={manifest.head.frameX}
          frameY={manifest.head.frameY}
          scale={spriteScale}
        />
        <FaceOverlay avatar={avatar} scale={spriteScale} />
        {showHair && manifest.hairFront ? (
          <SpriteSheetLayer
            src={manifest.hairFront.src}
            sheetWidth={manifest.hairFront.sheetWidth}
            sheetHeight={manifest.hairFront.sheetHeight}
            frameX={manifest.hairFront.frameX}
            frameY={manifest.hairFront.frameY}
            scale={spriteScale}
          />
        ) : null}
        {manifest.accessoryLayer ? (
          <SpriteSheetLayer
            src={manifest.accessoryLayer.src}
            sheetWidth={manifest.accessoryLayer.sheetWidth}
            sheetHeight={manifest.accessoryLayer.sheetHeight}
            frameX={manifest.accessoryLayer.frameX}
            frameY={manifest.accessoryLayer.frameY}
            scale={spriteScale}
          />
        ) : null}
      </div>

      {showPanel ? (
        <div
          className="absolute left-1/2 top-6 h-12 -translate-x-1/2 rounded-full blur-3xl"
          style={{
            width: metrics.frameWidth * 0.46,
            backgroundColor: `${manifest.accent.trim}25`,
          }}
        />
      ) : null}

      {showStatusBadge ? (
        <div
          className="absolute left-1 top-1 flex items-center justify-center rounded-none border-2 border-surface-container-highest bg-surface-container-low"
          style={{ width: metrics.badgeSize, height: metrics.badgeSize }}
        >
          <StateIcon
            size={Math.round(metrics.badgeSize * 0.5)}
            className={
              state === "break"
                ? "text-tertiary"
                : state === "studying"
                  ? "text-primary"
                  : "text-outline"
            }
          />
        </div>
      ) : null}

      {name ? (
        <div
          className={`absolute -bottom-5 left-1/2 min-w-max -translate-x-1/2 rounded-none border-2 border-surface-container-highest bg-surface px-2 py-1 font-headline font-bold uppercase tracking-widest text-outline ${metrics.labelClass}`}
        >
          {name}
        </div>
      ) : null}
    </div>
  );
}
