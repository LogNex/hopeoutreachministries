import { getCollection, type CollectionEntry } from "astro:content";
import settings from "../data/settings.json";

export { settings };

export type Branch = CollectionEntry<"branches">;
export type ChurchEvent = CollectionEntry<"events">;
export type Sermon = CollectionEntry<"sermons">;

export const TIME_ZONE = "Africa/Nairobi";
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function branchName(branch: Branch): string {
  return `${settings.siteName} – ${branch.data.town}`;
}

export async function getBranches(): Promise<Branch[]> {
  const all = await getCollection("branches");
  return all.sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99) || a.data.town.localeCompare(b.data.town));
}

/**
 * Events and sermons store their branch as whatever the editor's branch picker saved
 * (a path like "src/content/branches/nakuru.md", a file name, or a town). All resolve to the entry id.
 */
export function branchIdFromRef(ref: string): string {
  if (!ref) return "";
  const base = ref.split(/[\\/]/).pop() ?? ref;
  return slugify(base.replace(/\.md$/i, ""));
}

export function findBranch(branches: Branch[], ref: string): Branch | undefined {
  const id = branchIdFromRef(ref);
  if (!id) return undefined;
  return branches.find((b) => b.id === id || slugify(b.data.town) === id);
}

/** "09:30" → "9:30 am" */
export function formatTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return time;
  const h = Number(m[1]);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

export function formatDate(date: Date, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(date);
}

/** ISO date (yyyy-mm-dd) as seen in Nairobi, used by the browser to hide past events. */
export function isoDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

/** Kenyan numbers in any common shape → 2547XXXXXXXX (for tel: and wa.me links). */
export function intlPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

export function telLink(phone: string): string {
  const n = intlPhone(phone);
  return n ? `tel:+${n}` : "";
}

export function whatsappLink(phone: string, text = ""): string {
  const n = intlPhone(phone);
  if (!n) return "";
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function mapLink(branch: Branch): string {
  const d = branch.data;
  if (d.mapLink) return d.mapLink;
  if (d.latitude != null && d.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`;
  }
  if (d.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.address}, ${d.town}, Kenya`)}`;
  }
  return "";
}

export function mapEmbed(branch: Branch): string {
  const d = branch.data;
  let q = "";
  if (d.latitude != null && d.longitude != null) q = `${d.latitude},${d.longitude}`;
  else if (d.address) q = `${d.address}, ${d.town}, Kenya`;
  return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed` : "";
}

/** Facebook or YouTube link → an embeddable player URL. */
export function videoEmbed(url: string): string {
  if (!url) return "";
  const yt = /(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  if (/facebook\.com|fb\.watch/.test(url)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
  }
  return "";
}

export function videoSource(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return "YouTube";
  if (/facebook\.com|fb\.watch/.test(url)) return "Facebook";
  return "";
}

/** Group a branch's services by day, in week order starting Sunday. */
export function servicesByDay(branch: Branch) {
  const groups = new Map<string, Branch["data"]["services"]>();
  for (const s of [...branch.data.services].sort(
    (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.time.localeCompare(b.time, undefined, { numeric: true }),
  )) {
    groups.set(s.day, [...(groups.get(s.day) ?? []), s]);
  }
  return [...groups.entries()];
}
