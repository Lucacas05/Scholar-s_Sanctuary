export const prerender = false;

export function GET() {
  return Response.json({
    ok: true,
    service: "lumina",
    checkedAt: new Date().toISOString(),
  });
}
