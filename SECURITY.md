# Security Policy

Thank you for looking. Reports are genuinely welcome.

## Reporting a vulnerability

Email **security@gymtrack.ch**.

Replies come from `support@gymtrack.ch` — both addresses reach the same person.

Please include what you found, how to reproduce it, and what you think the impact
is. A rough report you are unsure about is more useful than one you never send.

## What to expect

This is a personal project operated by one person. There is no security team and
no guaranteed response time, but every report is read and you will get a reply.

Please give a reasonable opportunity to fix an issue before disclosing it
publicly. No bounty is offered. Genuine reports are credited if you would like
that — just say so.

## Testing boundaries

The application holds real people's training data, so:

- Do not access, modify, retain or exfiltrate any account's data other than your
  own. If you find a way to reach another account, stop and report it rather
  than exploring how far it goes.
- Do not run load, denial-of-service or disruptive automated testing against the
  live service.
- Do not attempt social engineering against the operator or any user.

Testing against your own local deployment is unrestricted — the repository
includes everything needed to run the stack locally.

## Scope

**In scope:** the application at `app.gymtrack.ch`, and the source code here —
particularly authentication, session handling, authorisation and cross-account
isolation, the invitation and admission flow, and account export and deletion.

**Out of scope:** third-party providers (Cloudflare, Resend, Infomaniak — report
those to them directly), findings that require physical access to the operator's
hardware, and missing hardening that carries no demonstrable impact.

## Status

The application is in an invitation-only beta. It is self-hosted on a single
machine and is not built to withstand a determined attacker at scale. Known gaps
are tracked deliberately rather than hidden — if a report matches something
already known, you will be told so plainly.
