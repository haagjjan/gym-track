# External status and build-evidence page

`public/` is the dependency-free GitHub Pages bundle for `status.gymtrack.ch`. Hosting stays
independent of the GymTrack application, API, PostgreSQL, Mac mini, and Cloudflare Tunnel. The page
does not infer service health from its own deployment: Better Stack owns current state, monitor
history, and incidents.

## Public data sources

| Surface | Source | Failure behavior |
| --- | --- | --- |
| Overall/component state and incidents | Better Stack public `/index.json` feed | Unavailable, incomplete or stale; no retained green claim |
| Daily history and recently resolved incidents | Valid entries returned by the same feed | No invented dates, period or uptime percentage |
| Enabled accounts, workout records and recent completed workouts | `https://app.gymtrack.ch/api/public-status` | Activity alone becomes unavailable or out of date |
| Coverage and verified commit | Workflow-generated `quality.json` | Missing/invalid evidence is unavailable; the whole record is qualified after 14 days |

Monitoring freshness is elapsed time since this browser successfully retrieved and validated a
response. The UI says **Retrieved**, never treats the provider's `updated_at` as a probe time, and
removes confirmed-current health after five minutes. A valid recent response must contain all three
required resources with recognized states before supporting an operational headline. Missing or
duplicate required resources produce incomplete information. A failed refresh removes confirmation
immediately; previously received incidents/history can remain only as explicitly unconfirmed.

The parser retains valid `status_history` days, states, and optional downtime/maintenance durations.
The textual disclosure derives each resource's actual returned range and entry count. Invalid or
future days, ambiguous duplicate dates, unknown states, and invalid durations are excluded. Gaps are
not counted as healthy. The scalar `availability` has no established period and is not published.
See Better Stack's [resource history shape](https://betterstack.com/docs/uptime/api/get-a-single-status-page-resource/).

Incident parsing has its own failure boundary. One invalid report/update cannot erase valid service
states; the latest valid update retains its own publication timestamp. A failure or stale retrieval
cannot silently resolve a previously displayed incident. A confirmed feed with no active incidents
renders no active-incident container.

Activity is current only through 15 minutes after its authoritative `generatedAt`; older counts are
withheld with an out-of-date explanation. Build evidence remains one historical record after 14
days, including its full-SHA commit link, generation time, coverage, and verification scope. Future
generation timestamps are invalid and their values are withheld. Neither channel changes health.

The workout number is an intentionally broad lifetime row count. It includes imports,
administrator-owned sessions, open/completed sessions, and rows with `deleted_at` set. A hard
account erasure removes the underlying rows and can lower the next recount. No personal data,
persisted public counter, or historical erasure total exists.

## One-time Better Stack setup

Create three HTTPS monitors with a three-minute check cadence:

1. `Web application` — `https://app.gymtrack.ch/login`
2. `API and database` — `https://app.gymtrack.ch/api/public-status`
3. `Independent status page` — `https://status.gymtrack.ch`

Add all three to a published Better Stack status page using those exact public names and a history
widget. Enable automatic reports or publish manual incident reports so the public JSON includes
active and resolved incidents. Keep the Better Stack-hosted URL separate from the custom GitHub
Pages hostname, then add it as the non-secret repository variable `BETTER_STACK_STATUS_URL`, for
example `https://gymtrack.betteruptime.com`.

The deployment script accepts only HTTPS hosts under `betteruptime.com` or `betterstack.com`.
Missing or invalid configuration still deploys the page, but the monitoring surface fails closed to
an unavailable state. No Better Stack API token belongs in the repository or browser.

## Publication pipeline

`.github/workflows/status-page.yml` runs only after the complete `repo-checks` workflow succeeds on
`main`. It checks out the verified SHA, runs the status data tests, collects API and web line
coverage with `c8 --all`, creates `quality.json` and
`config.json`, validates the static asset boundary, and deploys `public/` to GitHub Pages. A failed
main workflow cannot replace the latest verified evidence.

The checked-in page has no inline handlers, inline styles, trackers, credentials, or third-party
scripts. Its single local ES module entry imports same-origin parsing, state, and rendering helpers.
It polls monitoring every minute and aggregate project metrics every five minutes, checks evidence
age every 15 seconds, and refreshes all channels when the tab becomes visible. Existing evidence is
re-evaluated before awaiting those requests. Every fetch has an eight-second timeout, and each
channel has its own request generation to prevent superseded responses from replacing newer state.
Build evidence is retrieved on load and on return to the tab.

The renderer uses text nodes and validated links, one concise polite region for meaningful overall
changes, and native disclosures. Normal retrieval timestamps are not announced. Stable incident
content is not rebuilt on every tick. The renderer and controller factory functions exceed the
50-line function review threshold because they enclose short related handlers sharing a document
cache or injected clock/channel state; each module remains below the 250-line file target. There
is no new framework, dependency, or global application abstraction.

GitHub Pages ignores `_headers`; the same restrictive CSP is therefore present as an enforced HTML
meta policy, while `_headers` remains useful if the bundle moves to a host that serves it.

## Local verification

Run parser, state/polling, and generator tests locally with:

```sh
pnpm test:status
```

Run the dependency-free browser preview from the repository root:

```sh
node ops/status/scripts/preview.mjs
```

Open [the healthy local fixture](http://127.0.0.1:4173/?fixture=healthy). The default port is 4173;
override it with `STATUS_PREVIEW_PORT`. The query selects controlled browser interception, visibly
identified by `LOCAL FIXTURE` in the document title. Example scenarios are `incident`, `degraded`,
`outage`, `maintenance`, `unavailable`, `unconfigured`, `malformed`, `incomplete`, `stale`,
`metrics-unavailable`, `metrics-stale`, `build-stale`, `build-missing`, and `build-future`.
The stale fixture advances the test clock six minutes after a valid response, resumes the tab, and
holds the next monitoring response until timeout so the pending-refresh behavior can be inspected.

The preview serves the actual public HTML/CSS/modules. Only a requested fixture injects a local
test bootstrap and intercepts the three existing data paths. Fixture values and the preview server
live outside `public/` and cannot enter the Pages artifact. They are never production fallbacks.
Open [the unmodified local page](http://127.0.0.1:4173/) to inspect real-source behavior. Without
workflow-generated config/build files, those surfaces are unavailable. Production activity also
rejects a localhost browser origin; use a fixture for its successful local presentation.

Browser review on 2026-09-12 inspected the healthy page at 1440, 1024, 768, and 390 pixels, plus
incident, outage, provider failure, stale monitoring, unavailable activity, and stale build states.
At 390×844, all three healthy service rows fit in the first viewport without horizontal overflow.
Skip-link focus and native history-disclosure keyboard operation were verified. These checks do
not establish assistive-technology or WCAG conformance.

## External configuration diagnosis and operator actions

Read-only checks on 2026-09-12 found two independent external problems:

- `https://status.gymtrack.ch/config.json` contains `betterStackStatusUrl: null`. The repository and
  `github-pages` environment have no configured variables. Complete the Better Stack setup above,
  set the non-secret **repository** variable `BETTER_STACK_STATUS_URL` to the actual separately
  hosted public page URL, and run `repo-checks` for the approved current `main` revision. Its success
  triggers `status-page.yml` to regenerate config and publish. Verify deployed `config.json`, then
  confirm the provider's `/index.json` contains all three exact resource names and useful history.
- `https://app.gymtrack.ch/api/public-status` returns a Next.js HTML 404. This checkout contains the
  route added by commit `6832aa8`, and a fresh production build lists `/api/public-status`. Running
  that build with an intentionally unreachable API returns the expected 502 JSON `API_UNAVAILABLE`
  and `Access-Control-Allow-Origin: https://status.gymtrack.ch`, proving route registration here.
  No repository route fix was indicated. The exact deployed SHA and runtime routing remain unverified.

For the 404, the production operator should inspect the running web/API release SHAs, standalone
route manifest, and reverse-proxy destination. Rebuild and deploy an approved revision containing
the public web and API routes using the [production runbook](../production/README.md); ensure traffic reaches that
web release. With the upstream API/database available, verify an originless request and a request
with `Origin: https://status.gymtrack.ch` both return 200 JSON whose `data` contains `activeBetaAccounts`,
`workoutRecordsProcessed`, and `generatedAt`, with `Cache-Control: no-store` and the expected CORS
header for the latter. If the web route instead returns 502 JSON, route registration is fixed and
the remaining investigation is the upstream API connection or API release.

No Better Stack setting, GitHub variable, DNS, Cloudflare setting, or deployment was changed during
this implementation. The actual GymTrack provider payload cannot be verified until configuration
is supplied; tests use the documented history shape and controlled public-feed fixtures.

## DNS and incident operations

`status.gymtrack.ch` remains a DNS-only `CNAME` to the repository's GitHub Pages host, with GitHub
terminating TLS. Do not proxy it through the same Cloudflare path as the application.

Create and update incidents in Better Stack. Updates must name the affected public component, user
impact, investigation state, and next-update time without exposing personal data, secrets, internal
hostnames, or exploit details. Confirm the custom page reflects the report, then resolve it in
Better Stack so it moves into recent history.

## Product showcase and live activity

The independently hosted page now puts a compact health summary and incidents first, followed by
product context, live aggregate activity, three actual example-data product captures, service
history and attributable build evidence. It retains the light editorial system and native
links/disclosures. Screenshots and product content require neither the application nor JavaScript.
Capture provenance and recapture instructions are in [showcase-captures.md](showcase-captures.md).

The primary account metric is **Enabled accounts**, including administrators and subject to the
existing five-account threshold. It is account status, not recent sign-ins. The legacy
`activeBetaAccounts` contract remains unchanged. A legacy response is explicitly labeled
**Enabled beta accounts**, excluding administrators; it never impersonates the new total.

Recent activity uses non-deleted, completed sessions from every retained account, including admin,
suspended and deletion-pending accounts. A rolling 30-day count and eight UTC Monday-start weeks
share one generation cutoff. Completion dates determine placement, so importing historical data
cannot create a spike at import time. The last week is partial; valid empty weeks are zero.
Unavailable/stale/invalid data is withheld, not replaced by zero or example values. The broad
workout-record total retains its existing inclusion rules. All counts can decrease after erasure.

`status-metrics.js` validates optional additions without discarding valid legacy totals. A malformed
or incomplete weekly series is withheld in full rather than patched with fictional zeroes.
`status-activity.js` renders an SVG bar chart from the validated aggregates plus a native accessible
table. The chart can scroll inside its own labeled region on small screens without page overflow.

Run `pnpm test:status:browser` for independent Chromium/Firefox checks against the preview server.
This needs no running application or database. It covers 390/768/1440px, chart/table agreement,
actual screenshot assets, keyboard navigation, automated serious/critical accessibility findings,
zero/legacy/malformed/stale/unavailable activity, monitoring failures, and static no-JavaScript
content. CI runs it before starting the application smoke stack. Browser artifacts remain ignored
under `test-results/status/`. The preview scenarios now also include `metrics-legacy`,
`metrics-empty` and `metrics-malformed`.

Production publication sets `STATUS_REQUIRE_MONITORING=true`. Missing/invalid
`BETTER_STACK_STATUS_URL` fails before replacing the existing Pages deployment. This supersedes
the permissive missing-configuration publication behavior described above; browser failure states
and local unconfigured previews remain available.

### Controlled rollout checklist

1. Inspect the running production API/web exact SHA, web standalone app-route manifest and proxy
   destination. `/api/public-status` already exists in source; diagnose the observed production
   404 before changing application routing. Use `ops/production/README.md` for the active private
   host; the Render runbook is a retained alternative.
2. Pass checks for one clean, exact committed revision. Deploy that revision's API/web through
   the existing staging/production procedure. Retain prior images/configuration for rollback.
   No status-feature database migration is needed.
3. Verify originless and `Origin: https://status.gymtrack.ch` requests to
   `https://app.gymtrack.ch/api/public-status` return 200 JSON, `Cache-Control: no-store`, and
   the correct CORS header for the allowed-origin request. An explicit other origin must fail.
4. Compare public enabled-account disclosure against a read-only `ACTIVE` account aggregate,
   including `ADMIN`. Never record names, emails, cookies, tokens or row-level training data in
   public rollout evidence. Eight is an expected user report, not a hard-coded test of production.
5. Inspect Better Stack and reuse its existing monitors/page before creating missing resources.
   Check the three exact names and three-minute cadence above. Validate the real public
   `/index.json` with `parseMonitoringFeed`; all three required resources must be recognized.
6. Set the non-secret repository variable to that actual public page URL. Only then allow the
   successful-main workflow to publish the updated static page. Retain the previous Pages bundle
   for rollback; don't substitute a fixture URL or a guessed provider hostname.
7. Verify the live page in a fresh browser: status, incidents/history, account count, 30-day count,
   weekly dates/counts and all screenshots. Use controlled browser blocking to verify that failed
   sources remove current confirmation while the static showcase remains available.
8. Record deployed application SHA, Pages evidence SHA, public feed URL, verification time and
   aggregate-only results in the rollout report. Local fixture checks do not establish production
   readiness. If authentication or deployment gates prevent these checks, leave them explicitly
   pending and retain the current production deployment.


### Public metrics component wording

The custom page labels the aggregate check **Public metrics endpoint**, with scope
**Aggregate API/database read**. A failed HTTP check establishes that the public path failed;
it does not independently establish an API-process or PostgreSQL outage. Better Stack retains
the existing `API and database` resource name and the parser's `api-and-database` key for feed
compatibility. The label adjustment does not change the monitored URL or hide a failed check.
