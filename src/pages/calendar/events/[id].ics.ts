// /calendar/events/<id>.ics — one event.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { eventItem, toIcs } from "../../../lib/calendar";
import { findBranch, getBranches, type ChurchEvent } from "../../../lib/site";

export async function getStaticPaths() {
  const events = await getCollection("events");
  return events.map((event) => ({ params: { id: event.id }, props: { event } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { event } = props as { event: ChurchEvent };
  const branch = findBranch(await getBranches(), event.data.branch);
  return new Response(toIcs([eventItem(event, branch)]), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
