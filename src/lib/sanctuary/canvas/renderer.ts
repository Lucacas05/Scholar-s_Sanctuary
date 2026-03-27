import type { SceneMap, SceneProp } from "@/lib/sanctuary/canvas/types";

export const SCENE_LOGICAL_WIDTH = 320;
export const SCENE_LOGICAL_HEIGHT = 192;

export function getScenePixelWidth(map: SceneMap) {
  return map.width * map.tileSize;
}

export function getScenePixelHeight(map: SceneMap) {
  return map.height * map.tileSize;
}

export function drawSceneBackground(ctx: CanvasRenderingContext2D, map: SceneMap) {
  const { theme, width, height, tileSize } = map;
  const pixelWidth = getScenePixelWidth(map);
  const pixelHeight = getScenePixelHeight(map);

  const gradient = ctx.createLinearGradient(0, 0, 0, pixelHeight);
  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);

  ctx.fillStyle = theme.glow ?? "transparent";
  ctx.fillRect(84, 8, 152, 54);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? theme.floorA : theme.floorB;
      ctx.fillRect(col * tileSize, Math.max(54, row * tileSize), tileSize, tileSize);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(col * tileSize, Math.max(54, row * tileSize), tileSize, 1);
    }
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  for (let col = 0; col <= width; col += 2) {
    ctx.fillRect(col * tileSize, 54, 1, pixelHeight - 54);
  }

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, pixelWidth - 2, pixelHeight - 2);
}

export function drawSceneProp(
  ctx: CanvasRenderingContext2D,
  prop: SceneProp,
  atlasImages: Partial<Record<string, HTMLImageElement>> | null,
) {
  ctx.save();
  ctx.globalAlpha = prop.alpha ?? 1;
  ctx.translate(prop.x + prop.w / 2, prop.y + prop.h / 2);
  if (prop.rotation) {
    ctx.rotate((prop.rotation * Math.PI) / 180);
  }

  if (prop.shape) {
    drawProceduralProp(ctx, { ...prop, x: -prop.w / 2, y: -prop.h / 2 });
    ctx.restore();
    return;
  }

  const atlasImage = prop.atlas ? atlasImages?.[prop.atlas] ?? null : null;

  if (!atlasImage || !prop.source) {
    ctx.restore();
    return;
  }

  ctx.drawImage(
    atlasImage,
    prop.source.x,
    prop.source.y,
    prop.source.w,
    prop.source.h,
    -prop.w / 2,
    -prop.h / 2,
    prop.w,
    prop.h,
  );

  if (prop.tint) {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = prop.tint;
    ctx.fillRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
  }
  ctx.restore();
}

function drawProceduralProp(ctx: CanvasRenderingContext2D, prop: SceneProp) {
  if (prop.shape === "path") {
    ctx.fillStyle = "#9e8f71";
    ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
    ctx.fillStyle = "#b7aa8a";
    ctx.fillRect(prop.x + 3, prop.y + 3, prop.w - 6, prop.h - 6);
    return;
  }

  if (prop.shape === "tree") {
    ctx.fillStyle = "#3d2a1b";
    ctx.fillRect(prop.x + Math.round(prop.w / 2) - 6, prop.y + prop.h - 26, 12, 26);
    ctx.fillStyle = "#274e2f";
    ctx.fillRect(prop.x + 6, prop.y + 10, prop.w - 12, 22);
    ctx.fillStyle = "#35663e";
    ctx.fillRect(prop.x + 2, prop.y + 22, prop.w - 4, 18);
    ctx.fillStyle = "#4d8c52";
    ctx.fillRect(prop.x + 10, prop.y, prop.w - 20, 18);
    return;
  }

  if (prop.shape === "column") {
    ctx.fillStyle = "#90918f";
    ctx.fillRect(prop.x, prop.y + 6, prop.w, prop.h - 6);
    ctx.fillStyle = "#b4b5b2";
    ctx.fillRect(prop.x + 2, prop.y + 10, prop.w - 4, prop.h - 12);
    ctx.fillStyle = "#6d6e6b";
    ctx.fillRect(prop.x - 3, prop.y + prop.h - 8, prop.w + 6, 8);
    return;
  }

  if (prop.shape === "bench") {
    ctx.fillStyle = "#6b472f";
    ctx.fillRect(prop.x, prop.y + 12, prop.w, 8);
    ctx.fillRect(prop.x + 4, prop.y, prop.w - 8, 8);
    ctx.fillRect(prop.x + 8, prop.y + 20, 4, 10);
    ctx.fillRect(prop.x + prop.w - 12, prop.y + 20, 4, 10);
  }
}
