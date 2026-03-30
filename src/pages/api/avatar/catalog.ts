import { readCustomWardrobeCatalog } from "@/lib/server/custom-wardrobe";

export const prerender = false;

export async function GET() {
  return Response.json({
    catalog: readCustomWardrobeCatalog(),
  });
}
