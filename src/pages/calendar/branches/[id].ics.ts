// /calendar/branches/<id>.ics — a branch's services, repeating every week.
import type { APIRoute } from "astro";
import { serviceItems, toIcs } from "../../../lib/calendar";
import { getBranches, type Branch } from "../../../lib/site";

export async function getStaticPaths() {
  const branches = await getBranches();
  return branches.filter((b) => b.data.services.length > 0).map((branch) => ({ params: { id: branch.id }, props: { branch } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(toIcs(serviceItems((props as { branch: Branch }).branch)), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
