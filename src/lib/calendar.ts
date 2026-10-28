// "Add to calendar": an .ics file (Apple, Outlook, most phone calendars) and a Google Calendar
// link (what most Android phones use). Times are Kenya time; EAT has no daylight saving.
import { branchName, branchPlace, DAYS, isoDay, mapLink, settings, type Branch, type ChurchEvent } from "./site";

type Service = Branch["data"]["services"][number];

export interface CalendarItem {
  uid: string;
  title: string;
  description: string;
  location: string;
  /** Local Nairobi date (yyyy-mm-dd) and time (HH:MM); no time = all day. */
  startDay: string;
  startTime?: string;
  /** All day: last day (inclusive). Timed: end time on the same day as start. */
  endDay?: string;
  endTime?: string;
  /** Two-letter day for a weekly repeat, e.g. "SU". */
  weekly?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const compact = (day: string) => day.replaceAll("-", "");
const clock = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return `${pad(h)}${pad(m)}00`;
};
const isTime = (t = "") => /^\d{1,2}:\d{2}$/.test(t.trim());

/** yyyy-mm-dd plus n days. */
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A time plus minutes, kept on the same day (a service never runs past midnight). */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Calendar lines may be at most 75 bytes; longer ones continue on a line starting with a space. */
function fold(line: string): string {
  const bytes = new TextEncoder();
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    if (bytes.encode(current + ch).length > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
    }
    current += ch;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function toIcs(items: CalendarItem[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${settings.siteName}//Website//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Africa/Nairobi",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:EAT",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  for (const item of items) {
    lines.push("BEGIN:VEVENT", `UID:${item.uid}`, `DTSTAMP:${stamp}`);
    if (item.startTime) {
      lines.push(`DTSTART;TZID=Africa/Nairobi:${compact(item.startDay)}T${clock(item.startTime)}`);
      lines.push(
        `DTEND;TZID=Africa/Nairobi:${compact(item.endDay ?? item.startDay)}T${clock(item.endTime ?? addMinutes(item.startTime, 120))}`,
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(item.startDay)}`);
      lines.push(`DTEND;VALUE=DATE:${compact(addDays(item.endDay ?? item.startDay, 1))}`);
    }
    if (item.weekly) lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${item.weekly}`);
    lines.push(`SUMMARY:${escape(item.title)}`);
    if (item.location) lines.push(`LOCATION:${escape(item.location)}`);
    if (item.description) lines.push(`DESCRIPTION:${escape(item.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** The same thing as a Google Calendar "add event" link. */
export function googleLink(item: CalendarItem): string {
  const dates = item.startTime
    ? `${compact(item.startDay)}T${clock(item.startTime)}/${compact(item.endDay ?? item.startDay)}T${clock(item.endTime ?? addMinutes(item.startTime, 120))}`
    : `${compact(item.startDay)}/${compact(addDays(item.endDay ?? item.startDay, 1))}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: item.title, dates, ctz: "Africa/Nairobi" });
  if (item.location) params.set("location", item.location);
  if (item.description) params.set("details", item.description);
  if (item.weekly) params.set("recur", `RRULE:FREQ=WEEKLY;BYDAY=${item.weekly}`);
  return `https://calendar.google.com/calendar/render?${params}`;
}

function where(branch: Branch): string {
  return [branch.data.town, branchPlace(branch), "Kenya"].filter(Boolean).join(", ");
}

/** A branch's services as weekly repeating entries, starting from the next one. */
export function serviceItems(branch: Branch): CalendarItem[] {
  const today = isoDay(new Date());
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const directions = mapLink(branch);
  return branch.data.services.map((s: Service) => {
    const day = DAYS.indexOf(s.day);
    return {
      uid: `${branch.id}-${s.day.toLowerCase()}-${s.time.replace(":", "")}@hopeoutreachministries`,
      title: `${s.name} – ${branchName(branch)}`,
      description: [`In ${s.language}.`, directions && `Directions: ${directions}`].filter(Boolean).join("\n"),
      location: where(branch),
      startDay: addDays(today, (day - weekday + 7) % 7),
      startTime: s.time,
      endTime: isTime(s.endTime) ? s.endTime : undefined,
      weekly: s.day.slice(0, 2).toUpperCase(),
    };
  });
}

export function eventItem(event: ChurchEvent, branch: Branch | undefined): CalendarItem {
  const d = event.data;
  const timed = isTime(d.time);
  return {
    uid: `event-${event.id}@hopeoutreachministries`,
    title: d.title,
    description: d.summary,
    location: [d.venue, branch && where(branch)].filter(Boolean).join(", "),
    startDay: isoDay(d.date),
    startTime: timed ? d.time.trim() : undefined,
    // A timed event lasting several days: one entry from the first day's start to the last day.
    endDay: d.endDate ? isoDay(d.endDate) : undefined,
  };
}
