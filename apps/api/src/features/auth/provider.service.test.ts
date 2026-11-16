import assert from "node:assert/strict";
import type { NewAuthUser } from "./auth.repository.js";
import { it } from "node:test";
import { providerFixture, providerTestUser } from "./provider-test-helpers.js";

const signup = { termsVersion: "terms-1", privacyVersion: "privacy-1", adultAttested: true as const };
it("existing subject signs in even if email changes or is unverified and registration is closed", async () => {
  const { service, state, input } = providerFixture("DISABLED");
  state.linked = providerTestUser;
  state.identity.email = "changed@example.test";
  state.identity.emailVerified = false;
  assert.equal((await service.login(input())).ok, true);
  assert.equal(state.signIns, 1);
  assert.equal(state.links, 0);
});
it("automatically links only a mutually verified email", async () => {
  const { service, state, input } = providerFixture();
  state.existing = providerTestUser;
  assert.equal((await service.login(input())).ok, true);
  assert.equal(state.links, 1);
  assert.equal(state.signIns, 1);
});
for (const [providerVerified, accountVerified] of [[false, true], [true, false], [false, false]]) {
  it(`requires password sign-in when email verification is ${providerVerified}/${accountVerified}`, async () => {
    const { service, state, input } = providerFixture();
    state.identity.emailVerified = providerVerified!;
    state.existing = { ...providerTestUser, emailVerifiedAt: accountVerified ? new Date() : null };
    await assert.rejects(service.login(input()), { code: "PROVIDER_LINK_REQUIRES_SIGN_IN", status: 409 });
    assert.equal(state.links, 0);
    assert.equal(state.signIns, 0);
    assert.equal(state.created, null);
  });
}
it("closed registration rejects new identities before requesting consent", async () => {
  const { service, state, input } = providerFixture("DISABLED");
  await assert.rejects(service.login({ ...input(), signup }), { code: "REGISTRATION_DISABLED", status: 403 });
  assert.equal(state.created, null);
});
it("consent is required, creates nothing, consumes the nonce and permits retry with a fresh nonce", async () => {
  const { service, state, input } = providerFixture();
  const request = input();
  await assert.rejects(service.login(request), { code: "PROVIDER_SIGNUP_CONSENT_REQUIRED", status: 409 });
  assert.equal(state.created, null);
  await assert.rejects(service.login({ ...request, signup }), { code: "INVALID_PROVIDER_NONCE" });
  assert.equal((await service.login({ ...input(), signup })).ok, true);
  const created = state.created as NewAuthUser | null;
  assert.equal(created?.passwordHash, null);
  assert.equal(created?.termsVersion, signup.termsVersion);
  assert.equal(created?.privacyVersion, signup.privacyVersion);
  assert.ok(created?.adultAttestedAt);
  assert.ok(created?.emailVerifiedAt);
});
it("unverified email creates an unverified account with consent", async () => {
  const { service, state, input } = providerFixture();
  state.identity.emailVerified = false;
  assert.equal((await service.login({ ...input(), signup })).ok, true);
  assert.equal(state.created?.emailVerifiedAt, null);
});
it("missing email creates a unique placeholder and user username", async () => {
  const { service, state, input } = providerFixture();
  state.identity.email = null;
  state.identity.emailVerified = false;
  assert.equal((await service.login({ ...input(), signup })).ok, true);
  assert.match(state.created!.email, /@provider\.invalid$/);
  assert.match(state.created!.username, /^user_[a-f0-9]+$/);
  assert.equal(state.created?.emailVerifiedAt, null);
});
it("concurrent signup conflicts create no second session", async () => {
  const { service, state, input } = providerFixture();
  state.createConflict = true;
  await assert.rejects(service.login({ ...input(), signup }), { code: "AUTH_CONFLICT", status: 409 });
  assert.equal(state.signIns, 0);
});
it("explicit linking permits unverified emails, rejects other ownership and consumes nonces", async () => {
  const { service, state, input } = providerFixture();
  state.identity.emailVerified = false;
  const request = input();
  assert.deepEqual(await service.link("user-1", request), { linked: true });
  await assert.rejects(service.link("user-1", request), { code: "INVALID_PROVIDER_NONCE" });
  state.allowLink = false;
  await assert.rejects(service.link("user-1", input()), { code: "PROVIDER_IDENTITY_CONFLICT", status: 409 });
});
it("unlink refuses the last sign-in method and otherwise succeeds", async () => {
  const { service, state } = providerFixture();
  state.allowUnlink = false;
  await assert.rejects(service.unlink("user-1", "apple"), { code: "LAST_SIGN_IN_METHOD", status: 409 });
  state.allowUnlink = true;
  assert.deepEqual(await service.unlink("user-1", "apple"), { unlinked: true });
});
