import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Every field here is edited in Pages CMS (.pages.yml). Keep the two in step.
// The editor may save an untouched field as "" or null, so optional fields accept both.

const text = () => z.string().nullish().transform((v) => (v ?? "").trim());
const num = () =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional());
const date = () => z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.date());
const optionalDate = () =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.date().optional());
const list = <T extends z.ZodType>(item: T) =>
  z.array(item).nullish().transform((v) => v ?? []);

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const service = z.object({
  day: z.enum(days),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Use 24-hour time, e.g. 09:30"),
  endTime: text(),
  name: z.string(),
  language: z.enum(["English", "Kiswahili", "English & Kiswahili"]),
});

const account = z.object({ label: z.string(), account: z.string() });

const branches = defineCollection({
  loader: glob({ base: "./src/content/branches", pattern: "**/*.md" }),
  schema: z.object({
    town: z.string(),
    order: num(),
    subCounty: text(),
    county: text(),
    address: text(),
    mapLink: text(),
    latitude: num(),
    longitude: num(),
    pastor: text(),
    pastorPhoto: text(),
    photo: text(),
    phone: text(),
    whatsapp: text(),
    email: text(),
    paybill: text(),
    accounts: list(account),
    services: list(service),
  }),
});

const events = defineCollection({
  loader: glob({ base: "./src/content/events", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    date: date(),
    endDate: optionalDate(),
    time: text(),
    branch: text(), // empty = all branches
    venue: text(),
    image: text(),
    registerLink: text(),
    summary: text(),
  }),
});

const sermons = defineCollection({
  loader: glob({ base: "./src/content/sermons", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    date: date(),
    speaker: text(),
    series: text(),
    scripture: text(),
    branch: text(),
    video: text(), // Facebook or YouTube link
    audio: text(),
    summary: text(),
  }),
});

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    intro: text(),
    leaders: list(z.object({ name: z.string(), role: text(), photo: text() })),
  }),
});

export const collections = { branches, events, sermons, pages };
