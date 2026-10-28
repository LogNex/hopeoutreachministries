// The installable app: registers the service worker (offline pages) and handles the browser's
// "install" offer. Android/desktop Chrome hand us an install prompt; iPhone doesn't, so /app/
// explains Safari's "Add to Home Screen" instead.
import { onPage } from "./page";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISSED = "hom:install-dismissed";
const VIEWS = "hom:views";
let deferred: InstallPrompt | null = null;

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* not remembered */
    }
  },
};

export const isInstalled = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

if ("serviceWorker" in navigator) {
  // After the page has loaded, so saving pages for offline never competes with the first visit.
  const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
  if (document.readyState === "complete") register();
  else addEventListener("load", register, { once: true });
}

function sync() {
  // Install buttons appear only while the browser is offering to install.
  document.querySelectorAll<HTMLElement>("[data-install], [data-install-card]").forEach((b) => (b.hidden = !deferred));
  const banner = document.querySelector<HTMLElement>("[data-install-banner]");
  if (banner) {
    const views = Number(store.get(VIEWS) ?? 0);
    banner.hidden = !deferred || views < 2 || store.get(DISMISSED) === "1" || location.pathname === "/app/";
  }
}

addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // we offer it at a better moment instead of the browser's mini-bar
  deferred = e as InstallPrompt;
  sync();
});

addEventListener("appinstalled", () => {
  deferred = null;
  store.set(DISMISSED, "1");
  sync();
});

onPage((signal) => {
  store.set(VIEWS, String(Number(store.get(VIEWS) ?? 0) + 1));
  document.addEventListener(
    "click",
    async (e) => {
      const target = e.target as Element;
      if (target.closest("[data-install-dismiss]")) {
        store.set(DISMISSED, "1");
        sync();
        return;
      }
      if (!target.closest("[data-install]") || !deferred) return;
      const prompt = deferred;
      deferred = null;
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome !== "accepted") store.set(DISMISSED, "1");
      sync();
    },
    { signal },
  );
  sync();
});
