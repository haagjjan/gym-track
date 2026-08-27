# External status page

`public/` is a dependency-free static status page intended for a host independent of the Gym Progress Tracker app, API, database, and Mac mini. Publish this directory at `status.gymtrack.ch` through a separately authenticated static host.

Before every publication, edit the visible review timestamp and verify all six component states. An incident update must name the affected component, user impact, investigation state, and next-update time without exposing personal data, secrets, internal hostnames, or exploit details.

The checked-in page is the reviewed live status claim. PROD-9 closed on 2026-08-27 after DNS,
independent hosting, TLS and the incident publication path were verified end to end.

## Hosting — GitHub Pages, decided 2026-08-20

GitHub Pages was chosen over a hosted status provider and over Cloudflare Pages because it is the
only option independent of **both** the Mac mini and Cloudflare: a Cloudflare incident would take
the application and a Cloudflare-hosted status page down together, which is the exact case a status
page exists for. It also adds no processor to the inventory.

`.github/workflows/status-page.yml` publishes `public/` only on an intentional manual dispatch and
refuses to publish if a script tag or inline handler appears — the page must not depend on anything
executing. Manual publication prevents an unrelated application push from republishing a status
claim nobody reviewed.

**Hosting caveats.**

1. The repository is public and Pages is active. If repository visibility changes, re-check plan
   eligibility before relying on this publication path.
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
and resolved timestamps. This passed on 2026-08-27: the test incident was public from 11:04 to
11:06 UTC and remains in the resolved history.
