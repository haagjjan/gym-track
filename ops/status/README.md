# External status and build-evidence page

`public/` is the dependency-free GitHub Pages bundle for `status.gymtrack.ch`. Hosting stays
independent of the GymTrack application, API, PostgreSQL, Mac mini, and Cloudflare Tunnel. The page
does not infer service health from its own deployment: Better Stack owns current state, monitor
history, and incidents.

## Public data sources

| Surface | Source | Failure behavior |
| --- | --- | --- |
| Overall/component state and incidents | Better Stack public `/index.json` feed | `Live status unavailable`; no green claim |
| 90-day uptime | Lowest availability among all three required Better Stack resources | Unavailable unless all three resources are present |
| Active beta accounts and workout records | `https://app.gymtrack.ch/api/public-status` | Only those two cards become unavailable |
| Coverage and verified commit | Workflow-generated `quality.json` | Evidence is marked unavailable or stale after 14 days |

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
scripts. Its single local ES module polls monitoring every minute and aggregate project metrics
every five minutes. GitHub Pages ignores `_headers`; the same restrictive CSP is therefore present
as an enforced HTML meta policy, while `_headers` remains useful if the bundle moves to a host that
serves it.

Run parser/generator tests locally with:

```sh
pnpm test:status
```

Serve `public/` through any local static server for browser review. Without workflow-generated
`config.json` and `quality.json`, the corresponding surfaces should display unavailable; that is the
expected safe local state.

## DNS and incident operations

`status.gymtrack.ch` remains a DNS-only `CNAME` to the repository's GitHub Pages host, with GitHub
terminating TLS. Do not proxy it through the same Cloudflare path as the application.

Create and update incidents in Better Stack. Updates must name the affected public component, user
impact, investigation state, and next-update time without exposing personal data, secrets, internal
hostnames, or exploit details. Confirm the custom page reflects the report, then resolve it in
Better Stack so it moves into recent history.
