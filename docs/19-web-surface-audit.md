# Web Surface Audit — "20 vibecoded giveaways" checklist

Audit date: 2026-08-06
Scope: `apps/web` (Next.js 15.5.19, App Router, React 19)
Method: static inspection of `apps/web/src` + runtime checks against `next dev` on
`localhost:3000` + a fresh `pnpm --filter @gym-progress-tracker/web build`.

This file records the current state only. It is **not** an approved work plan — items
under "Gaps" need a requirement or ADR before implementation, per `CLAUDE.md`.

---

## Summary

| # | Item | Status |
|---|------|--------|
| 1 | `vercel.app` URL | PASS (custom domain `app.gymtrack.ch`) — caveat below |
| 2 | View-source empty | PASS |
| 3 | No 404 page | **GAP** |
| 4 | Vite + React in browser (SPA shell) | PASS |
| 5 | Same page titles | PASS |
| 6 | No meta description | PARTIAL |
| 7 | No `og:image` | **GAP** |
| 8 | No structured data | **GAP** |
| 9 | Multiple H1s | PASS |
| 10 | No H1s | PASS |
| 11 | No canonical tag | **GAP** |
| 12 | No `llms.txt` | **GAP** |
| 13 | AI-blocked `robots.txt` | **GAP** (no `robots.txt` at all) |
| 14 | No favicon | **GAP** |
| 15 | No `sitemap.xml` | **GAP** |
| 16 | No lang attribution | PASS |
| 17 | Missing alt text | PASS |
| 18 | Source maps exposed | PASS |
| 19 | Console errors | PASS |
| 20 | Massive JS bundles | PASS |

8 of 20 pass cleanly, 1 partial, 8 gaps, and the remaining 3 (1, 4, 18) pass with a
note. Everything that is currently failing is metadata/static-asset work; nothing
points at an application-code defect.

---

## Passing

**1 — Deployment URL.** `render.yaml:80` sets the web service hosts to
`app.gymtrack.ch,gym-progress-tracker-web.onrender.com`. A real custom domain is
configured, so the giveaway does not apply. Caveat: the platform hostname is still an
accepted host, so the app answers on both. Without a canonical tag (item 11) that is a
duplicate-host exposure, not just cosmetics.

**2 — View source.** Pages are React Server Components rendered on the server. Fetching
`/login` returns 18.5 KB of HTML containing the real content (`OPERATOR_LOGIN` heading
present in the raw response, not injected client-side). Not an empty `<div id="root">`.

**4 — Not a Vite SPA.** Next.js App Router with server components; no client-side-only
shell.

**5 — Page titles.** `apps/web/src/app/layout.tsx:18` defines a title template
(`"%s | Gym Progress Tracker"`), and 26 route segments export their own `metadata.title`.
Verified distinct rendered titles across `/login`, `/signup`, `/beta`, `/privacy`,
`/terms`, `/support`, `/cookies`.

**9 / 10 — Headings.** Exactly one `<h1>` on every public route checked (`/`, `/login`,
`/signup`, `/beta`, `/privacy`, `/terms`, `/support`, `/cookies`, `/help`). No route has
zero, none has more than one.

**16 — Language.** `<html lang="en">` at `apps/web/src/app/layout.tsx:38`.

**17 — Alt text.** There are no `<img>` tags and no `next/image` usage in `apps/web/src`.
Decorative SVG icons are correctly marked `aria-hidden` (`features/shell/icons.tsx:9`,
`features/shell/app-shell.tsx:146`, and others). The muscle-region SVGs under
`public/volume/` are fetched as texture/geometry data by `features/volume/region-map.ts`,
not rendered as content images, so no alt text applies. Nothing to fix.

**18 — Source maps.** `productionBrowserSourceMaps` is not enabled in
`apps/web/next.config.ts`, and the production build emits zero `.map` files under
`.next/static` with no `sourceMappingURL` comments in any chunk. Client source is not
shipped.

**19 — Console errors.** Loading `/login` produces only React DevTools info notices — no
warnings, no errors, no hydration mismatches.

**20 — Bundle size.** Shared first-load JS across all routes is **453 KB raw / 140 KB
gzipped** (polyfills 110 KB raw, framework/react chunks 339 KB raw, webpack runtime 4 KB).
That is normal for Next 15 + React 19, not a red flag. The two heavy dependencies are
correctly kept out of the shared bundle:

- `three` / `@react-three/*` is behind `next/dynamic` in `features/dashboard/dashboard-screen.tsx:35`,
  `features/volume/volume-screen.tsx:24`, and `features/volume/muscle-spike.tsx:11`.
  Confirmed absent from both shared chunks (no `THREE` / `WebGLRenderer` symbols).
- `recharts` is statically imported by `features/progress/progress-screen.tsx:12`, so it
  lands in the `/progress` route chunk only — route-level splitting, also absent from the
  shared bundle.

(Note when re-measuring: `.next/static/chunks/main.js` at ~6.9 MB is a `next dev`
leftover, not production output. Production chunks are content-hashed. Also,
`app-build-manifest.json` comes out empty on Next 15.5.19, which is why `next build`
prints `0 B` for every route — measure from `build-manifest.json`'s `rootMainFiles`
instead.)

---

## Partial

**6 — Meta description.** A description exists, but there is exactly one for the whole
app: `"Workout logging and progress tracking"` (`apps/web/src/app/layout.tsx:23`). Every
route inherits it — `/beta`, `/privacy`, `/terms`, and `/login` all serve the identical
string. Per-route `metadata` exports set `title` only. The generic root description is
also weak: it does not name the product or say who it is for.

---

## Gaps

**3 — No 404 page.** No `not-found.tsx` anywhere in `apps/web/src`. `/this-page-does-not-exist`
returns HTTP 404 with Next's stock black-on-white "404: This page could not be found"
screen — no app shell, no `hud-grid` / `bg-void` styling, no navigation back into the app.
Verified: the response contains none of the app's design tokens.

**7 — No Open Graph / Twitter metadata.** Zero `og:*` or `twitter:*` tags render on any
page. `apps/web/src/app/layout.tsx` sets only `title` and `description`. There is no
`opengraph-image.*` file (`/opengraph-image` → 404). Any link to `app.gymtrack.ch` shared
in a DM, a Telegram beta invite, or a WhatsApp message will unfurl as a bare URL with no
image, title card, or description. This is the most user-visible gap on the list given
the Founding Beta invite flow depends on shared links.

**8 — No structured data.** No `application/ld+json` blocks and no `schema.org` references
anywhere in `apps/web/src`. No `SoftwareApplication` / `WebSite` / `Organization` markup.

**11 — No canonical tag.** No `<link rel="canonical">` renders on any page, and
`metadata.metadataBase` / `metadata.alternates` are unset in the root layout. Combined
with the two live hostnames from item 1, the same content is reachable and indexable at
both `app.gymtrack.ch` and `gym-progress-tracker-web.onrender.com` with nothing declaring
which is authoritative.

**12 — No `llms.txt`.** `/llms.txt` → 404. Nothing describes the product to AI crawlers
or assistants.

**13 — No `robots.txt`.** `/robots.txt` → 404. There is no `app/robots.ts`. The specific
giveaway in the image is an AI-blocking `robots.txt`; here the file is absent entirely,
which is a different problem: crawler behaviour is fully undeclared. Worth noting that
most of this app is auth-gated and *should* be disallowed — `/settings`, `/workouts`,
`/progress`, `/admin`, `/messages`, and the whole `/api/*` tree have no business being
crawled. Only `/`, `/login`, `/signup`, `/beta`, `/help`, `/privacy`, `/terms`,
`/cookies`, `/support` are public. A robots policy here is a privacy/hygiene item, not
just an SEO one.

**14 — No favicon.** `public/` contains only `models/` and `volume/` — no icon of any
kind. No `icon.tsx`, `icon.svg`, `apple-icon.*`, or `favicon.ico` in `apps/web/src/app`.
`/favicon.ico`, `/icon.svg`, and `/manifest.webmanifest` all return 404, and zero
`<link rel="icon">` tags render. Browser tabs and bookmarks show the default blank page
glyph. Also means no PWA manifest, so "Add to Home Screen" on mobile — plausible for a
gym app used at the rack — has no icon and no name.

**15 — No `sitemap.xml`.** `/sitemap.xml` → 404. No `app/sitemap.ts`.

---

## Notes for whoever picks this up

- Items 3, 7, 11, 12, 13, 14, 15 are all satisfiable inside `apps/web/src/app` using
  Next's file conventions (`not-found.tsx`, `opengraph-image.tsx`, `icon.svg`,
  `robots.ts`, `sitemap.ts`) plus `metadataBase` + `alternates.canonical` +
  `openGraph` in the root layout. Item 6 is a per-route `description` addition. Item 8
  is a JSON-LD block. None of it touches application logic, the API, the database, or
  auth.
- Item 13 needs a decision, not just a file: which routes are public, and whether AI
  crawlers are allowed on them. That is a product/privacy call given the beta is
  invite-gated and the legal pages are drafts pending review
  (`features/legal/legal-page.tsx` still renders a `PUBLICATION_BLOCKED` warning when
  controller config is incomplete).
- Item 7's `og:image` needs a real design asset, not a generated placeholder, to be
  worth shipping.
- If a favicon and manifest land together (item 14), decide at the same time whether the
  app declares itself installable — that is a scope question beyond a missing icon.
