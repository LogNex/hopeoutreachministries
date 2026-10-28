// "My branch": one branch id remembered on this phone only (localStorage, never sent anywhere).
// The home page reads the same key from an inline script in YourBranch.astro; keep KEY in step.
export const KEY = "hom:my-branch";
export const EVENT = "mybranchchange";

export function getMyBranch(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return ""; // private mode or blocked storage: behave as if nothing is saved
  }
}

export function setMyBranch(id: string) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* not saved; the page still updates for this visit */
  }
  document.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}
