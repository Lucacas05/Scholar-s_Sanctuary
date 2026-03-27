import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import type { AvatarConfig } from "@/lib/sanctuary/store";

interface ItemModelPreviewProps {
  field: keyof AvatarConfig;
  value: string;
  avatar?: AvatarConfig;
}

const fallbackAvatar: AvatarConfig = {
  base: "archivo",
  skinTone: "miel",
  hairStyle: "corto",
  hairColor: "castano",
  facialHair: "ninguno",
  outfit: "escriba",
  accessory: "libro",
  expression: "sereno",
};

export function ItemModelPreview({ field, value, avatar = fallbackAvatar }: ItemModelPreviewProps) {
  const previewAvatar = {
    ...avatar,
    [field]: value,
  } as AvatarConfig;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-none border-2 border-surface-container-highest bg-[radial-gradient(circle_at_50%_16%,rgba(255,189,105,0.16),transparent_38%),linear-gradient(180deg,rgba(44,32,27,0.95),rgba(20,15,13,0.98))]">
      <div className="absolute inset-x-3 bottom-1 h-3 rounded-full bg-black/35 blur-sm" />
      <PixelAvatar avatar={previewAvatar} size="sm" showStatusBadge={false} />
    </div>
  );
}
