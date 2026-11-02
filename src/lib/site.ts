import { getCollection, type CollectionEntry } from "astro:content";
import settings from "../data/settings.json";

export { settings };

export type Branch = CollectionEntry<"branches">;
export type ChurchEvent = CollectionEntry<"events">;
export type Sermon = CollectionEntry<"sermons">;
export type Ministry = CollectionEntry<"ministries">;
export type Article = CollectionEntry<"articles">;

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

export async function getMinistries(): Promise<Ministry[]> {
  const all = await getCollection("ministries");
  return all.sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99) || a.data.title.localeCompare(b.data.title));
}

/** Published articles only, newest first. */
export async function getArticles(): Promise<Article[]> {
  const all = await getCollection("articles", ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function findMinistry(ministries: Ministry[], ref: string): Ministry | undefined {
  const id = branchIdFromRef(ref); // a ministry reference looks just like a branch reference
  return id ? ministries.find((m) => m.id === id) : undefined;
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
// export function intlPhone(phone: string): string {
//   const digits = phone.replace(/\D/g, "");
//   if (!digits) return "";
//   if (digits.startsWith("254")) return digits;
//   if (digits.startsWith("0")) return `254${digits.slice(1)}`;
//   if (digits.length === 9) return `254${digits}`;
//   return digits;
// }

export function intlPhone(phone: string): string {
  if (!phone) return "";
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

/** "Opposite the market, Maara, Tharaka Nithi County" — whatever parts are filled in. */
export function branchPlace(branch: Branch): string {
  const d = branch.data;
  return [d.address, d.subCounty, d.county && `${d.county} County`].filter(Boolean).join(", ");
}

/** True when the branch has a pin or street address, not just its area. */
export function hasExactLocation(branch: Branch): boolean {
  const d = branch.data;
  return Boolean(d.mapLink || (d.latitude != null && d.longitude != null) || d.address);
}

/** A pin is shown, but nobody has said it is the church itself: say it is the nearest location. */
export function pinIsApproximate(branch: Branch): boolean {
  const d = branch.data;
  return Boolean(d.mapLink || (d.latitude != null && d.longitude != null)) && !d.exactPin;
}

export function mapLink(branch: Branch): string {
  const d = branch.data;
  if (d.mapLink) return d.mapLink;
  if (d.latitude != null && d.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`;
  }
  // Until there's an address, search the area: "Kathingithu, Maara, Tharaka Nithi, Kenya".
  const q = [d.address, d.town, d.subCounty, d.county, "Kenya"].filter(Boolean).join(", ");
  return d.address || d.subCounty || d.county ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

/** A branch without its own Paybill gives through the main church Paybill. */
export function givingFor(branch: Branch) {
  const own = Boolean(branch.data.paybill);
  return {
    own,
    paybill: own ? branch.data.paybill : settings.centralPaybill,
    accounts: own ? branch.data.accounts : settings.centralAccounts,
  };
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

/** A sermon's picture: its artwork, else its YouTube video's (320×180, ~10 KB); "" for Facebook. */
export function sermonImage(sermon: Sermon): string {
  if (sermon.data.image) return sermon.data.image;
  const yt = /(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(sermon.data.video);
  return yt ? `https://i.ytimg.com/vi/${yt[1]}/mqdefault.jpg` : "";
}

/** "John 3:16-21" → a page where it can be read (King James, like the verse on the home page). */
export function bibleLink(passage: string): string {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(passage)}&version=KJV`;
}

export function sermonMeta(sermon: Sermon, branches: Branch[]): string {
  const d = sermon.data;
  return [d.speaker, formatDate(d.date, { weekday: undefined }), findBranch(branches, d.branch)?.data.town]
    .filter(Boolean)
    .join(" · ");
}

export function videoSource(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return "YouTube";
  if (/facebook\.com|fb\.watch/.test(url)) return "Facebook";
  return "";
}

/** Where the services stream: Facebook first, then YouTube; "" until either is set. */
export function liveUrl(): string {
  return settings.facebookUrl || settings.youtubeUrl || "";
}

/** The services every branch shares, when they all have the same list; otherwise none. */
export function sharedServices(branches: Branch[]): Branch["data"]["services"] {
  const key = (b: Branch) =>
    JSON.stringify(servicesByDay(b).flatMap(([, list]) => list.map((s) => [s.day, s.time, s.name, s.language])));
  const first = branches[0];
  if (!first || first.data.services.length === 0) return [];
  return branches.every((b) => key(b) === key(first)) ? servicesByDay(first).flatMap(([, list]) => list) : [];
}

/** "Sundays at 9:30 am, in English & Kiswahili" — one phrase per service. */
export function servicesSummary(services: Branch["data"]["services"]): string {
  return services
    .map((s) => `${s.day}s at ${formatTime(s.time)}${s.language ? `, in ${s.language}` : ""}`)
    .join("; ");
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
