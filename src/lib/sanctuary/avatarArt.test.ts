import path from "node:path";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getAvatarArtManifest } from "@/lib/sanctuary/avatarArt";
import type { AvatarConfig } from "@/lib/sanctuary/store";

function toPublicPath(assetPath: string) {
  return path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
}

describe("avatar art", () => {
  it("resuelve rutas reales para las prendas base del avatar", () => {
    const avatar: AvatarConfig = {
      sex: "masculino",
      skinTone: "amber",
      hairStyle: "short-02-parted",
      hairColor: "brown",
      accessory: "ninguno",
      upper: "shirt-04-tee",
      upperColor: "smoke",
      lower: "pants-03-pants",
      lowerColor: "umber",
      socks: "socks-01-ankle",
      socksColor: "cream",
    };

    const manifest = getAvatarArtManifest(avatar);

    expect(existsSync(toPublicPath(manifest.upper.src))).toBe(true);
    expect(existsSync(toPublicPath(manifest.lower.src))).toBe(true);
    expect(existsSync(toPublicPath(manifest.socks.src))).toBe(true);
  });
});
