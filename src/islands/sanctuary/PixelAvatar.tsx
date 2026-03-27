import { Flame, MoonStar, Sparkles } from "lucide-react";
import { getAvatarArtManifest } from "@/lib/sanctuary/avatarArt";
import type { AvatarConfig, PresenceState } from "@/lib/sanctuary/store";

interface PixelAvatarProps {
  avatar: AvatarConfig;
  state?: PresenceState;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  highlighted?: boolean;
  showStatusBadge?: boolean;
  showAccessoryBadge?: boolean;
}

interface SizeMetrics {
  frameWidth: number;
  frameHeight: number;
  spriteScale: number;
  badgeSize: number;
  labelClass: string;
  accessoryBox: number;
  bottomOffset: number;
}

const stateIcons = {
  idle: MoonStar,
  studying: Flame,
  break: Sparkles,
  offline: MoonStar,
} as const;

const sizeMetrics: Record<NonNullable<PixelAvatarProps["size"]>, SizeMetrics> = {
  sm: {
    frameWidth: 86,
    frameHeight: 108,
    spriteScale: 1.2,
    badgeSize: 24,
    labelClass: "text-[9px]",
    accessoryBox: 28,
    bottomOffset: 6,
  },
  md: {
    frameWidth: 108,
    frameHeight: 142,
    spriteScale: 1.52,
    badgeSize: 28,
    labelClass: "text-[10px]",
    accessoryBox: 34,
    bottomOffset: 8,
  },
  lg: {
    frameWidth: 164,
    frameHeight: 208,
    spriteScale: 2.42,
    badgeSize: 34,
    labelClass: "text-xs",
    accessoryBox: 40,
    bottomOffset: 10,
  },
  xl: {
    frameWidth: 226,
    frameHeight: 282,
    spriteScale: 3.3,
    badgeSize: 42,
    labelClass: "text-xs",
    accessoryBox: 52,
    bottomOffset: 12,
  },
};

function SpriteSheetLayer({
  src,
  sheetWidth,
  sheetHeight,
  scale,
  className = "",
}: {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  scale: number;
  className?: string;
}) {
  const frameX = sheetWidth === 192 ? 64 * scale : 0;
  const frameY = 128 * scale;

  return (
    <div
      className={`absolute inset-0 bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: `${sheetWidth * scale}px ${sheetHeight * scale}px`,
        backgroundPosition: `-${frameX}px -${frameY}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

function AccessoryBadge({
  accessory,
  size,
}: {
  accessory: AvatarConfig["accessory"];
  size: number;
}) {
  if (accessory === "ninguno") {
    return null;
  }

  return (
    <div
      className="absolute bottom-6 -right-1 flex items-center justify-center rounded-none border-2 border-surface-container-highest bg-surface-container-low shadow-[0_4px_0_rgba(0,0,0,0.22)]"
      style={{ width: size, height: size }}
    >
      {accessory === "libro" && (
        <div className="relative h-[58%] w-[50%] border-2 border-[#3f2517] bg-[#7f5434]">
          <div className="absolute inset-y-0 left-[24%] w-[2px] bg-[#f7d598]" />
          <div className="absolute inset-x-[16%] top-[18%] h-[2px] bg-[#f7d598]/70" />
        </div>
      )}
      {accessory === "te" && (
        <div className="relative h-[54%] w-[56%]">
          <div className="absolute bottom-0 left-[10%] h-[62%] w-[54%] rounded-b-[0.12rem] border-2 border-[#724b1d] bg-[#ddc49e]" />
          <div className="absolute right-[4%] top-[18%] h-[36%] w-[20%] rounded-r-full border-2 border-[#724b1d]" />
          <div className="absolute left-[32%] top-0 h-[20%] w-[2px] bg-white/60" />
        </div>
      )}
      {accessory === "pluma" && (
        <div className="relative h-[66%] w-[34%] rotate-12">
          <div className="absolute inset-0 rounded-full bg-[#ddd7e6]" />
          <div className="absolute bottom-[-10%] left-1/2 h-[46%] w-[2px] -translate-x-1/2 bg-[#7a4b2b]" />
        </div>
      )}
      {accessory === "linterna" && (
        <div className="relative h-[64%] w-[48%]">
          <div className="absolute inset-x-[18%] top-0 h-[18%] rounded-t-full border-2 border-[#714100]" />
          <div className="absolute inset-x-0 top-[18%] bottom-0 rounded-[0.12rem] border-2 border-[#714100] bg-[#ffdc9a]" />
          <div className="absolute inset-x-[24%] top-[34%] bottom-[10%] bg-[#ffb961]/70" />
        </div>
      )}
    </div>
  );
}

function FaceOverlay({
  avatar,
  scale,
}: {
  avatar: AvatarConfig;
  scale: number;
}) {
  const unit = scale;
  const eyeColor = avatar.expression === "despierto" ? "#1b1412" : "#2d231f";
  const mouthColor = avatar.expression === "picaro" ? "#6d3925" : "#5b3021";
  const facialColor =
    avatar.hairColor === "plata"
      ? "#cfd6db"
      : avatar.hairColor === "cobre"
        ? "#92512d"
        : avatar.hairColor === "obsidiana"
          ? "#251a1b"
          : "#5b4333";

  return (
    <>
      <span
        className="absolute rounded-none"
        style={{
          left: 24 * unit,
          top: 17 * unit,
          width: 4 * unit,
          height: avatar.expression === "despierto" ? 3 * unit : 2 * unit,
          backgroundColor: eyeColor,
        }}
      />
      <span
        className="absolute rounded-none"
        style={{
          left: 36 * unit,
          top: 17 * unit,
          width: 4 * unit,
          height: avatar.expression === "despierto" ? 3 * unit : 2 * unit,
          backgroundColor: eyeColor,
        }}
      />
      {avatar.expression === "picaro" && (
        <span
          className="absolute rounded-none bg-[#2f231f]"
          style={{
            left: 35 * unit,
            top: 13 * unit,
            width: 5 * unit,
            height: unit,
          }}
        />
      )}
      <span
        className="absolute rounded-none"
        style={{
          left: avatar.expression === "picaro" ? 29 * unit : 28 * unit,
          top: avatar.expression === "despierto" ? 25 * unit : 26 * unit,
          width: avatar.expression === "picaro" ? 8 * unit : 6 * unit,
          height: unit,
          backgroundColor: mouthColor,
          transform: avatar.expression === "picaro" ? `skewX(-25deg)` : undefined,
        }}
      />
      {avatar.facialHair === "bigote" && (
        <span
          className="absolute rounded-none"
          style={{
            left: 27 * unit,
            top: 22 * unit,
            width: 10 * unit,
            height: 2 * unit,
            backgroundColor: facialColor,
          }}
        />
      )}
      {avatar.facialHair === "barba-corta" && (
        <span
          className="absolute rounded-b-[0.18rem]"
          style={{
            left: 26 * unit,
            top: 23 * unit,
            width: 12 * unit,
            height: 6 * unit,
            backgroundColor: facialColor,
          }}
        />
      )}
    </>
  );
}

function HoodOverlay({
  color,
  scale,
}: {
  color: string;
  scale: number;
}) {
  const unit = scale;

  return (
    <div
      className="absolute"
      style={{
        left: 17 * unit,
        top: 6 * unit,
        width: 30 * unit,
        height: 26 * unit,
      }}
    >
      <div
        className="absolute inset-0 rounded-t-[1rem]"
        style={{
          background: color,
          clipPath: "polygon(0 18%, 18% 0, 82% 0, 100% 18%, 100% 100%, 0 100%)",
        }}
      />
      <div
        className="absolute left-[18%] top-[16%] h-[60%] w-[64%] rounded-t-full bg-[#1a1311]"
        style={{ opacity: 0.26 }}
      />
    </div>
  );
}

export function PixelAvatar({
  avatar,
  state = "idle",
  name,
  size = "md",
  highlighted = false,
  showStatusBadge = true,
  showAccessoryBadge = true,
}: PixelAvatarProps) {
  const StateIcon = stateIcons[state];
  const metrics = sizeMetrics[size];
  const manifest = getAvatarArtManifest(avatar);
  const spriteScale = metrics.spriteScale * (avatar.base === "vigia" ? 1.05 : avatar.base === "viajera" ? 0.98 : 1);
  const spriteSize = 64 * spriteScale;
  const stageLeft = (metrics.frameWidth - spriteSize) / 2;
  const stageTop = metrics.frameHeight - spriteSize - metrics.bottomOffset;

  return (
    <div className="relative" style={{ width: metrics.frameWidth, height: metrics.frameHeight }}>
      <div className="absolute inset-x-[12%] bottom-1 h-5 rounded-full bg-black/35 blur-md" />
      <div
        className="absolute inset-x-[10%] bottom-4 rounded-[1rem] border border-primary/20 bg-[radial-gradient(circle_at_50%_14%,rgba(255,190,110,0.22),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(24,18,16,0.2))]"
        style={{ top: metrics.frameHeight * 0.08 }}
      />

      <div
        className={`absolute rounded-[1rem] border-2 border-surface-container-highest bg-surface-container/60 shadow-[0_12px_0_rgba(0,0,0,0.18)] ${
          highlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""
        }`}
        style={{
          left: stageLeft,
          top: stageTop,
          width: spriteSize,
          height: spriteSize,
          imageRendering: "pixelated",
        }}
      >
        {manifest.hairBack ? (
          <SpriteSheetLayer
            src={manifest.hairBack.src}
            sheetWidth={manifest.hairBack.sheetWidth}
            sheetHeight={manifest.hairBack.sheetHeight}
            scale={spriteScale}
          />
        ) : null}
        <SpriteSheetLayer
          src={manifest.body.src}
          sheetWidth={manifest.body.sheetWidth}
          sheetHeight={manifest.body.sheetHeight}
          scale={spriteScale}
        />
        <SpriteSheetLayer
          src={manifest.pants.src}
          sheetWidth={manifest.pants.sheetWidth}
          sheetHeight={manifest.pants.sheetHeight}
          scale={spriteScale}
        />
        <SpriteSheetLayer
          src={manifest.shoes.src}
          sheetWidth={manifest.shoes.sheetWidth}
          sheetHeight={manifest.shoes.sheetHeight}
          scale={spriteScale}
        />
        <SpriteSheetLayer
          src={manifest.shirt.src}
          sheetWidth={manifest.shirt.sheetWidth}
          sheetHeight={manifest.shirt.sheetHeight}
          scale={spriteScale}
        />
        <SpriteSheetLayer
          src={manifest.head.src}
          sheetWidth={manifest.head.sheetWidth}
          sheetHeight={manifest.head.sheetHeight}
          scale={spriteScale}
        />
        <FaceOverlay avatar={avatar} scale={spriteScale} />
        {manifest.hairFront ? (
          <SpriteSheetLayer
            src={manifest.hairFront.src}
            sheetWidth={manifest.hairFront.sheetWidth}
            sheetHeight={manifest.hairFront.sheetHeight}
            scale={spriteScale}
          />
        ) : null}
        {manifest.hoodColor ? <HoodOverlay color={manifest.hoodColor} scale={spriteScale} /> : null}
      </div>

      <div
        className="absolute left-1/2 top-5 h-10 -translate-x-1/2 rounded-full blur-2xl"
        style={{
          width: metrics.frameWidth * 0.56,
          backgroundColor: `${manifest.accent.trim}25`,
        }}
      />

      {showStatusBadge ? (
        <div
          className="absolute left-1 top-1 flex items-center justify-center rounded-none border-2 border-surface-container-highest bg-surface-container-low"
          style={{ width: metrics.badgeSize, height: metrics.badgeSize }}
        >
          <StateIcon
            size={Math.round(metrics.badgeSize * 0.5)}
            className={
              state === "break" ? "text-tertiary" : state === "studying" ? "text-primary" : "text-outline"
            }
          />
        </div>
      ) : null}

      {showAccessoryBadge ? <AccessoryBadge accessory={avatar.accessory} size={metrics.accessoryBox} /> : null}

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
