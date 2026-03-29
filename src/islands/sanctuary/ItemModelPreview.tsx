import { PixelAvatar } from "@/islands/sanctuary/PixelAvatar";
import type { AvatarConfig } from "@/lib/sanctuary/store";

interface ItemModelPreviewProps {
  field: keyof AvatarConfig;
  value: string;
  avatar?: AvatarConfig;
}

const fallbackAvatar: AvatarConfig = {
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
};

function buildPreviewAvatar(
  field: keyof AvatarConfig,
  value: string,
  avatar: AvatarConfig,
): AvatarConfig {
  const previewAvatar: AvatarConfig = {
    ...avatar,
    [field]: value,
  } as AvatarConfig;

  if (field !== "accessory") {
    previewAvatar.accessory = "ninguno";
  }

  if (field === "sex") {
    previewAvatar.sex = value as AvatarConfig["sex"];
    previewAvatar.accessory = "ninguno";
    previewAvatar.hairStyle =
      value === "femenino" ? "medium-01-page" : "short-02-parted";
  }

  if (field === "skinTone") {
    previewAvatar.accessory = "ninguno";
    previewAvatar.hairStyle = "short-02-parted";
  }

  if (field === "hairColor") {
    previewAvatar.accessory = "ninguno";
    previewAvatar.hairStyle =
      avatar.hairStyle === "short-06-balding"
        ? "short-02-parted"
        : avatar.hairStyle;
  }

  if (field === "hairStyle") {
    previewAvatar.accessory = "ninguno";
  }

  if (field === "upper" || field === "lower" || field === "socks") {
    previewAvatar.accessory = "ninguno";
  }

  if (
    field === "upperColor" ||
    field === "lowerColor" ||
    field === "socksColor"
  ) {
    previewAvatar.accessory = "ninguno";
  }

  return previewAvatar;
}

export function ItemModelPreview({
  field,
  value,
  avatar = fallbackAvatar,
}: ItemModelPreviewProps) {
  const previewAvatar = buildPreviewAvatar(field, value, avatar);

  return (
    <div className="relative flex h-36 w-full min-w-0 items-center justify-center overflow-hidden border border-outline-variant bg-[radial-gradient(circle_at_50%_18%,rgba(255,189,105,0.14),transparent_40%),linear-gradient(180deg,rgba(41,30,26,0.92),rgba(20,15,13,0.98))] px-3 py-3 sm:h-40">
      <PixelAvatar
        avatar={previewAvatar}
        size="md"
        stage="plain"
        anchor="center"
        showStatusBadge={false}
      />
    </div>
  );
}
