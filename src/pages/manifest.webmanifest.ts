// Makes the site installable ("Add to home screen"). The icons are a plain "Hope" placeholder
// until the official logo is released.
import type { APIRoute } from "astro";
import { settings } from "../lib/site";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: settings.siteName,
      short_name: "Hope Outreach",
      description: settings.tagline,
      id: "/",
      start_url: "/?source=app",
      scope: "/",
      display: "standalone",
      background_color: "#0b2545",
      theme_color: "#0b2545",
      lang: "en-KE",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Give", url: "/give/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        { name: "Our branches", url: "/branches/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        { name: "Sermons", url: "/sermons/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
