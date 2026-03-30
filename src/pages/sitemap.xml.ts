import type { APIRoute } from "astro";

const pages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/estudio", priority: "0.8", changefreq: "monthly" },
  { path: "/cronicas", priority: "0.8", changefreq: "weekly" },
  { path: "/social", priority: "0.7", changefreq: "daily" },
  { path: "/biblioteca-compartida", priority: "0.7", changefreq: "daily" },
  { path: "/jardin", priority: "0.6", changefreq: "monthly" },
  { path: "/refinar", priority: "0.6", changefreq: "monthly" },
  { path: "/armario", priority: "0.6", changefreq: "weekly" },
];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("http://localhost:3000");

  const urls = pages
    .map(
      ({ path, priority, changefreq }) => `\
  <url>
    <loc>${new URL(path, base).href}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join("\n");

  const xml = `\
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
