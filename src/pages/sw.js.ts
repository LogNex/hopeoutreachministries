// The service worker, built with the site so it knows every page and changes with each deploy
// (a new version replaces the old one on the visitor's next visit).
//
//   Pages        network first (4 s), then the saved copy, then /offline/
//   /_astro/*    saved forever once fetched (file names change when the content does)
//   images       saved copy at once, refreshed in the background
//   other sites, forms, audio, calendar files: not touched
//
// On install it saves the pages people need with no signal (home, branches and each branch,
// give, visit, offline) together with the styles and scripts they use.
import type { APIRoute } from "astro";
import { getBranches } from "../lib/site";

export const GET: APIRoute = async () => {
  const branches = await getBranches();
  const precache = ["/", "/branches/", "/give/", "/visit/", "/new-here/", "/contact/", "/offline/", ...branches.map((b) => `/branches/${b.id}/`)];
  const version = new Date().toISOString();
  const code = `// Built ${version}
const VERSION = ${JSON.stringify(version)};
const PAGES = "pages-" + VERSION;
const ASSETS = "assets-v1";
const IMAGES = "images-v1";
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      const assets = await caches.open(ASSETS);
      // The pages' styles, scripts and fonts, and whatever those scripts and styles load in
      // turn (script chunks import each other; styles point at fonts), so pages work offline.
      const seen = new Set();
      const refs = (text, base) =>
        (text.match(/(?:\\/_astro\\/|\\.\\/)[\\w.\\-\\/]+\\.(?:js|css|woff2?)/g) || []).map((f) => new URL(f, base).pathname);
      async function save(path) {
        if (seen.has(path) || !path.startsWith("/_astro/")) return;
        // English and Kiswahili need only the basic Latin fonts; the other alphabets' files
        // would be ~300 KB of data for nothing (the browser still fetches them if ever needed).
        if (/\\.woff2?$/.test(path) && !/-latin-wght-/.test(path)) return;
        seen.add(path);
        try {
          let res = await assets.match(path, { ignoreVary: true });
          if (!res) {
            res = await fetch(path);
            if (!res.ok) return;
            await assets.put(path, res.clone());
          }
          if (/\\.(js|css)$/.test(path)) await Promise.all(refs(await res.text(), location.origin + path).map(save));
        } catch {}
      }
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (!res.ok || res.redirected) return;
            const html = await res.clone().text();
            await cache.put(url, res);
            await Promise.all(refs(html, location.origin + url).map(save));
          } catch {}
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("pages-") && key !== PAGES) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

function isPage(request, url) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html") || url.pathname.endsWith("/");
}

async function networkFirst(request, url) {
  const cache = await caches.open(PAGES);
  const key = url.pathname; // ignore ?query so saved pages are found again
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), 4000)),
    ]);
    // A redirected response can't be replayed for a page load, so only direct hits are saved.
    if (res.ok && res.type === "basic" && !res.redirected) cache.put(key, res.clone());
    return res;
  } catch {
    const opts = { ignoreVary: true };
    return (await cache.match(key, opts)) || (await caches.match(key, opts)) || (await cache.match("/offline/", opts)) || Response.error();
  }
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  // ignoreVary: fonts are requested with an Origin header the saved copy wasn't fetched with.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(cacheName, request, event) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  const update = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(update);
    return hit;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.headers.has("range") || /\\.(mp3|m4a|wav|ogg|ics)$/i.test(url.pathname)) return;
  if (url.pathname === "/sw.js") return;

  if (url.pathname.startsWith("/_astro/")) {
    event.respondWith(cacheFirst(ASSETS, request));
  } else if (/^\\/(images|icons)\\//.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(IMAGES, request, event));
  } else if (isPage(request, url)) {
    event.respondWith(networkFirst(request, url));
  }
});
`;
  return new Response(code, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
};
