// Entrance animations, made with Motion (the library Framer Motion became), using its small
// browser-native "mini" build to keep the page light on mobile data.
//
// How it works:
//   data-reveal             this element fades up when it scrolls into view
//   data-reveal="stagger"   each child fades up in turn as it scrolls into view
//
// global.css hides these elements only while <html> has the "motion-ok" class. That class is
// set by a script in the page head (Base.astro), and only when the visitor hasn't asked for
// reduced motion. If this script never starts, the head script removes the class after 2.5 s
// and everything simply shows.
import { animate } from "motion/mini";

declare global {
  interface Window {
    __motionReady?: boolean;
  }
}

const root = document.documentElement;

function start() {
  if (!root.classList.contains("motion-ok")) return; // reduced motion, or the failsafe already ran
  window.__motionReady = true;

  const EASE = [0.22, 1, 0.36, 1] as const;

  function reveal(el: HTMLElement, delay: number) {
    // The class makes the element visible once the animation below is gone.
    el.classList.add("rv-in");
    try {
      animate(
        el,
        { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"] },
        { duration: 0.6, delay, ease: EASE },
      ).then(() => {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transform");
      });
    } catch {
      /* animation unsupported: the element is already visible */
    }
  }

  // Elements that enter the screen together are staggered in page order.
  const observer = new IntersectionObserver(
    (entries) => {
      let n = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        reveal(el, Math.min(n++, 5) * 0.08);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((host) => {
    if (host.dataset.reveal === "stagger") {
      Array.from(host.children).forEach((child) => observer.observe(child));
    } else {
      observer.observe(host);
    }
  });
}

try {
  start();
} catch {
  root.classList.remove("motion-ok"); // never leave content hidden
}
