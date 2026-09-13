# ADR 0019 - Public Status And Build Evidence

## Status

Accepted

## Context

The existing GitHub Pages status page is independent of the production host, but every component
state and review timestamp is edited manually. That makes it useful during an incident rehearsal
but weak as a continuously current operational source. The project also has relevant
evidence—production availability, automated coverage, active beta accounts, and processed workout
records—that currently lives in separate systems or is not published at all.

Moving the canonical page into the application would make it unavailable during the outage it is
supposed to explain. Treating GitHub Actions schedules as uptime monitoring would also confuse a
build runner with an external availability probe.

## Decision

- Keep `status.gymtrack.ch` on GitHub Pages, outside the application host and Cloudflare Tunnel.
- Use Better Stack as the authoritative public source for current state, returned monitor history,
  and incident updates. Its separately hosted public status URL is a non-secret repository
  variable; the custom page reads the provider's public `/index.json` feed.
- Monitor the web login page, the public status-metrics BFF path, and the independent status page
  every three minutes. Publish only these externally checked components.
- Allow one local dependency-free browser entry module, with same-origin helpers, on the GitHub
  Pages bundle. It may read the
  Better Stack feed, the public aggregate metrics BFF, and a same-origin verified-build artifact.
  Missing or invalid data produces an unavailable state, never a retained green claim.
- Publish a successful main revision automatically after the complete repository workflow passes.
  That workflow reruns `c8 --all` coverage, generates the attributable quality artifact, and then
  deploys the static bundle.
- Count processed workouts with an exact unfiltered `COUNT(*)` over `workout_sessions`. This
  intentionally includes imported, administrator-owned, open, completed, and soft-deleted rows.
  Do not add a counter table, trigger, or reconciliation job.
- Publish active non-administrator accounts only at five or above. No personal fields enter the
  public response or static bundle.

### Evidence clarification (2026-09-12)

The compact status-document redesign keeps these hosting and data boundaries. Monitoring evidence
expires five minutes after a successful validated browser retrieval; this is not a provider probe
timestamp. Project metrics expire 15 minutes after generation, independently of monitoring. Build
evidence retains its 14-day qualification across the entire attributable record. Future timestamps
are invalid evidence, not old evidence.

The provider's scalar `availability` does not establish a reporting period. The page therefore
withholds period-specific uptime percentages and derives history ranges only from valid returned
`status_history` dates. Same-origin helpers separate parsing, asynchronous state, and plain-text
rendering while retaining a single script entry and the existing CSP. No framework or service is
introduced.

## Consequences

The public page remains reachable when the production host is down, and its operational claim is
grounded in an external observer. Build evidence is tied to a successful commit instead of a badge
without context. Live aggregate metrics depend on the application path and correctly become
unavailable during an application or database outage.

Better Stack becomes an external operational dependency and must be configured and reviewed by the
owner. GitHub Pages still ignores `_headers`, so the page also carries an enforcing CSP meta tag.
The workout count is a broad record-processing number rather than user-adoption or completion
evidence. A hard account erasure physically removes rows and can reduce that count; no historical
counter is retained after legal deletion.
