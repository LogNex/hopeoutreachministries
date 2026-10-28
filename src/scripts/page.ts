// Pages change without a full reload (Astro's ClientRouter, in Base.astro), so a script that
// sets up a page must run again after every navigation, and undo what it set up before the next.
//
//   onPage((signal) => { ... el.addEventListener("click", fn, { signal }); ... });
//
// runs on the first load and after each navigation. `signal` aborts just before the page is
// swapped: pass it to every listener on document/window, and use it to stop timers and observers.
export function onPage(init: (signal: AbortSignal) => void) {
  let controller: AbortController | null = null;
  const stop = () => {
    controller?.abort();
    controller = null;
  };
  document.addEventListener("astro:before-swap", stop);
  document.addEventListener("astro:page-load", () => {
    stop();
    controller = new AbortController();
    try {
      init(controller.signal);
    } catch (error) {
      console.error(error);
    }
  });
}

/** setInterval that stops when the page goes. */
export function every(ms: number, fn: () => void, signal: AbortSignal) {
  const id = setInterval(fn, ms);
  signal.addEventListener("abort", () => clearInterval(id));
}
