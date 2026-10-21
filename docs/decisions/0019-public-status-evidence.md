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

### Project showcase and activity extension (2026-10-21)

The independent page also introduces the product and displays three real, locally captured
sample-data screenshots. These static assets remain available when the application is down.
They are clearly labeled examples and never substitute for live operational or usage evidence.
The existing light editorial presentation and dependency-free bundle remain in place.

The existing `activeBetaAccounts` field retains its non-administrator semantics. An additive
`activeAccounts` field counts all `ACTIVE` accounts, including administrators, with the same
five-account disclosure threshold. The page calls this **Enabled accounts** and states that it
includes the owner/admin; it makes no claim about recent sign-ins. An older API response retains
its non-administrator label rather than being presented as the new total.

Recent activity adds a rolling 30-day completed-workout count and eight Monday-based UTC weekly
buckets, including the current partial week. These count non-deleted sessions with an `ended_at`
inside the reporting window, strictly before the single `generatedAt` cutoff. Administrator and
retained suspended/deletion-pending account sessions are included. Historical imports use their
original completion dates. Empty weeks are zero-filled; unavailable or malformed data is never
zero-filled in the browser. These workout aggregates retain the existing exact-count publication
policy, without per-account breakdowns, names, identifiers or event telemetry. Erasure can reduce
both recent activity and retained row totals. No counter store or schema migration is introduced.

The workflow now requires a valid `BETTER_STACK_STATUS_URL` before publication. Local previews
can still use an unconfigured state; the browser retains fail-closed behavior. This supersedes the
original publication behavior that allowed a new unconfigured production bundle to be deployed.
Coverage values and their unchanged `c8 --all` method remain available in a native disclosure;
verified checks, source revision and generation time remain visible independently of service health.
