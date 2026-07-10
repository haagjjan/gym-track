# Legacy frontend reference (archived in Phase 2)

This is the pre-rework Next.js UI, moved out of `apps/web/src` per
`docs/10-frontend-rework-brief.md` Phase 2. It is **reference material only**:

- Consult it to answer "what does this screen actually compute / which endpoint does it call"
  when rebuilding a screen from the Phase 0 checklist (`docs/11-phase0-frontend-inventory.md`).
- Never copy structure, components, or styling from here — the rework is a from-scratch rebuild.
- Not compiled, not linted, not shipped. Delete after Phase 3 sign-off.

What stayed in the live app (plumbing, not UI): `app/api/*` proxy routes and their
`*-api-proxy.ts` helpers, `features/auth/server-auth.ts` + `auth-types.ts`,
`shared/api-base-url.ts`, `shared/client-diagnostics.ts`, and the Phase 1 avatar spike.
