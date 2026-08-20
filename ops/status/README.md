# External status page

`public/` is a dependency-free static status page intended for a host independent of the Gym Progress Tracker app, API, database, and Mac mini. Publish this directory at `status.gymtrack.ch` through a separately authenticated static host.

Before every publication, edit the visible review timestamp and verify all six component states. An incident update must name the affected component, user impact, investigation state, and next-update time without exposing personal data, secrets, internal hostnames, or exploit details.

The checked-in page is a template, not a live status claim. The launch gate remains closed until DNS, independent hosting, TLS, and the incident publication rehearsal are verified.

## Hosting — GitHub Pages, decided 2026-08-20

GitHub Pages was chosen over a hosted status provider and over Cloudflare Pages because it is the
only option independent of **both** the Mac mini and Cloudflare: a Cloudflare incident would take
the application and a Cloudflare-hosted status page down together, which is the exact case a status
page exists for. It also adds no processor to the inventory.

`.github/workflows/status-page.yml` publishes `public/` on any change to it, and refuses to publish
if a script tag or inline handler appears — the page must not depend on anything executing.

**Two caveats to settle before the gate closes.**

1. GitHub Pages on a private repository requires a paid plan. If this repository is still private
   at publication time, either enable the plan or move `public/` to a small dedicated public
   repository and point this workflow at it. A dedicated repository is arguably better regardless:
   it keeps the status page independent of the application repository's history and visibility.
2. `_headers` is a Cloudflare Pages and Netlify convention. **GitHub Pages ignores it**, so the CSP
   and the other response headers in that file will not be served. The page is script-free and
   serves no user input, so the residual risk is low, but do not record the headers as evidence.
   If served headers are required, that argues for the hosted-provider option instead.

## DNS and TLS

Add `status.gymtrack.ch` as a `CNAME` to `<owner>.github.io`, proxying disabled in Cloudflare so
GitHub terminates TLS and can issue its certificate. `public/CNAME` already carries the custom
domain. Confirm HTTPS resolves and that the certificate names `status.gymtrack.ch` before enabling
"Enforce HTTPS" in the repository's Pages settings.

## Incident publication rehearsal

Publish a clearly-marked test incident, confirm it is publicly visible without authentication and
from a network with no Cloudflare Access session, then resolve and archive it. Record the published
and resolved timestamps. The rehearsal is part of the launch gate, not optional.
