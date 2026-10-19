# Hope Outreach Ministries — website

The church website: one church, six branches across Kenya.

- **Site:** [Astro](https://astro.build) static site — fast, light on mobile data, nothing to patch.
- **Editing:** [Pages CMS](https://pagescms.org) — the church's editor fills in forms; every save updates this repo.
- **Hosting:** Cloudflare (Workers static assets) — free, unlimited bandwidth, servers in Nairobi and Mombasa. It rebuilds the site automatically about a minute after every save.
- **Fonts:** Outfit for headings, Montserrat for text, self-hosted (no Google Fonts request).
- **Forms:** prayer requests and contact messages are emailed to the church by [Web3Forms](https://web3forms.com) (free).

## Pages

| Page | What it shows |
|---|---|
| Home | Welcome (English and Kiswahili), branch finder, next livestream, events, latest sermons, give and prayer |
| Branches | All 6 branches, with "Find my nearest branch" (uses the phone's location; nothing is sent anywhere) |
| Each branch | Service times with language, directions and map, call and WhatsApp, pastor and welcome note, that branch's Paybill, its events |
| Give | The main church Paybill and every branch's Paybill, copy buttons, M-Pesa steps in English and Kiswahili |
| Live | Next livestream countdown (Kenya time) and the church's Facebook page, loaded only on tap to save data |
| Sermons | Facebook or YouTube video (loaded on tap), optional audio, notes, search and series filter |
| Events | Upcoming events with a branch filter; past events disappear on their own |
| New here?, About, Prayer request, Contact, Privacy notice | Editable text pages and the two forms |

## 1. Put the site online (Cloudflare) — once, about 10 minutes

Someone with access to the LogNex GitHub organisation does this:

1. Create a free account at <https://dash.cloudflare.com/sign-up> (use a church email address if possible).
2. In the dashboard: **Workers & Pages → Create → Import a repository**.
3. Connect GitHub, and allow Cloudflare access to the `LogNex/hopeoutreachministries` repository.
4. Choose the repository and use these settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Production branch:** `main`
5. Click **Deploy**. The site goes live at `https://hopeoutreachministries.<your-account>.workers.dev`.

**Done (18 Oct 2026):** live at <https://hopeoutreachministries.lekenipl.workers.dev/>.

From then on, every change to `main` (including every save in the editor) redeploys the site automatically.

**When the domain is chosen:** add it to Cloudflare (free plan), then go to the worker's **Settings → Domains & Routes → Add → Custom domain**. Also add a build variable `SITE_URL` (for example `https://hopeoutreach.or.ke`) under **Settings → Build → Variables**, so links shared on WhatsApp and Facebook use the real domain.

## 2. Set up the editor (Pages CMS) — once

1. Go to <https://app.pagescms.org> and sign in with the GitHub account that manages the repo.
2. Install the Pages CMS GitHub app on `LogNex/hopeoutreachministries` when asked.
3. Open the repository in Pages CMS, then **Settings → Collaborators** and invite the church's editor by email. They don't need a GitHub account.

The editor then signs in at <https://app.pagescms.org> and sees:

- **Church settings:** name, tagline, logo, announcement bar, office contacts, WhatsApp, Facebook link, main Paybill and accounts, livestream times, form key.
- **Branches:** one entry per town (service times, Paybill, pastor, contacts, map).
- **Events** and **Sermons:** add a new one with **Add entry**.
- **Pages:** About us, New here?, Privacy notice.

Changes go live about a minute after **Save**.

## 3. Turn on the forms (Web3Forms) — once

1. Go to <https://web3forms.com>, enter the church email address that should receive prayer requests and messages, and get the **access key** it emails you.
2. In the editor, open **Church settings** and paste it into **Web3Forms access key**. Save.

Until a key is set, the Prayer and Contact pages show WhatsApp, call and email buttons instead of the form.

## Content to fill in before launch

Everything below starts empty or as a placeholder; the site shows "coming soon" where something is missing.

**Church settings**
- [ ] Tagline (currently a placeholder: "One church, six branches, one hope in Christ.")
- [ ] Office phone, WhatsApp, email, head office address
- [ ] Facebook Page link
- [x] Main Paybill: 222 111, account 0670 000 4229
- [ ] Livestream day(s) and time(s) (currently Sunday 10:00 as a placeholder)
- [ ] Logo, when ready

**Each of the 6 branches:** Kathingithu, Makutano, Kilakir, Noompala, Noong'abolo, Osiligi Restoration Centre
- [x] Branch name, sub-county and county
- [x] Pastor's name
- [ ] Address or landmark
- [ ] Google Maps link, and latitude/longitude for "Find my nearest branch" (in Google Maps, long-press the church → the numbers appear at the top)
- [ ] Service times, each with its language
- [ ] Pastor's photo, and a short welcome note
- [ ] Phone and WhatsApp
- [ ] Branch Paybill, only if a branch has its own (otherwise it shows the main one)
- [ ] A photo of the congregation

**Pages**
- [ ] About us: story, vision, mission, statement of faith, leaders
- [ ] New here?: what a service is like
- [ ] Privacy notice: have the church's leadership review the draft

**Photos of children** need a parent's or guardian's agreement (Kenya Data Protection Act, 2019).

## Development

Requires Node 22+.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs dist/
```

- `src/content/` — branches, events, sermons and text pages (Markdown). The fields are defined in `src/content.config.ts` and the editor's forms in `.pages.yml`; keep the two in step.
- `src/data/settings.json` — church-wide settings.
- `public/images/uploads/` — images uploaded through the editor.
- `wrangler.jsonc` — Cloudflare config (static files only, no server code).

## Later (phase 2)

- M-Pesa STK Push ("enter your number, get the PIN prompt"): needs Safaricom Daraja go-live approval for each Paybill and a small server function.
- A full Kiswahili version of the site.
- Ministries pages, testimonies, photo gallery.
- Streaming to YouTube as well as Facebook, for a searchable sermon archive.
