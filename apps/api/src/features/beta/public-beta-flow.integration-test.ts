import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { createDatabase } from "../../db/database.js";
import { buildServer } from "../../server.js";
import type { MailMessage, Mailer } from "../../shared/mailer.js";
import type { OperatorNotifier } from "../../shared/operator-notifier.js";
import { createUserAccountRepository } from "../users/user-account.repository.js";
import { PUBLIC_PRIVACY_VERSION, PUBLIC_TERMS_VERSION } from "./beta.schemas.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const prefix = `public_beta_integration_${process.pid}_`;

describe("public beta database flow", { skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set" }, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  const messages: MailMessage[] = [];
  const failedMailKinds = new Set<MailMessage["kind"]>();
  const alerts: Array<{ reference: string; at: Date }> = [];
  const mailer: Mailer = {
    async send(message) {
      if (failedMailKinds.has(message.kind)) throw new Error("provider unavailable");
      messages.push(message);
      return { provider: "log" };
    }
  };
  const notifier: OperatorNotifier = { async notifyBetaRequest(reference, at) { alerts.push({ reference, at }); } };
  const createdUserIds = new Set<string>();
  let adminId = "";

  before(async () => { await cleanup(); });
  after(async () => { await cleanup(); await db.destroy(); });

  it("admits one invited member, enforces reuse, exports, cancels support deletion, and hard-erases", async () => {
    const bootstrap = await server("ENABLED");
    const adminEmail = `${prefix}admin@example.test`;
    const admin = await signup(bootstrap, adminEmail, `${prefix}admin`, {});
    createdUserIds.add(admin.id);
    adminId = admin.id;
    await db.updateTable("users").set({ role: "ADMIN" }).where("id", "=", admin.id).execute();
    await bootstrap.close();

    const api = await server("INVITE_ONLY");
    const memberEmail = `${prefix}member@example.test`;
    try {
      await api.inject({
        method: "PATCH",
        url: "/api/v1/admin/beta/settings",
        cookies: cookie(admin.cookie),
        payload: { waitlistOpen: true, invitationsOpen: true, campaignsOpen: true }
      });
      const waitlistPayload = { email: memberEmail, adultAttested: true, termsVersion: PUBLIC_TERMS_VERSION, privacyVersion: PUBLIC_PRIVACY_VERSION };
      const first = await api.inject({ method: "POST", url: "/api/v1/beta/waitlist", payload: waitlistPayload });
      const duplicate = await api.inject({ method: "POST", url: "/api/v1/beta/waitlist", payload: waitlistPayload });
      assert.equal(first.statusCode, 202); assert.deepEqual(duplicate.json(), first.json());
      assert.equal(alerts.length, 1); assert.ok(alerts[0]?.reference); assert.ok(alerts[0]?.at);

      const queue = await api.inject({ method: "GET", url: "/api/v1/admin/beta/requests", cookies: cookie(admin.cookie) });
      const requestId = queue.json().data.items.find((item: { email: string }) => item.email === memberEmail)?.id as string;
      assert.ok(requestId);
      await api.inject({ method: "PATCH", url: "/api/v1/admin/beta/settings", cookies: cookie(admin.cookie), payload: { accountCap: 10_000, dailyApprovalLimit: 1_000 } });
      const approved = await api.inject({ method: "POST", url: `/api/v1/admin/beta/requests/${requestId}`, cookies: cookie(admin.cookie), payload: { action: "APPROVE" } });
      assert.equal(approved.statusCode, 200);
      assert.equal(approved.json().data.deliveryStatus, "SENT");
      const originalInvite = tokenFromLatestMessage("invite");
      const resent = await api.inject({ method: "POST", url: `/api/v1/admin/beta/requests/${requestId}`, cookies: cookie(admin.cookie), payload: { action: "RESEND" } });
      assert.equal(resent.statusCode, 200);
      assert.equal(resent.json().data.deliveryStatus, "SENT");
      const invite = tokenFromLatestMessage("invite");
      assert.notEqual(invite, originalInvite);

      const superseded = await signupResponse(api, memberEmail, `${prefix}superseded`, { inviteToken: originalInvite });
      assert.equal(superseded.statusCode, 403);

      const wrongEmail = await signupResponse(api, `${prefix}wrong@example.test`, `${prefix}wrong`, { inviteToken: invite });
      assert.equal(wrongEmail.statusCode, 403);
      const member = await signup(api, memberEmail, `${prefix}member`, { inviteToken: invite });
      createdUserIds.add(member.id);
      assert.equal(member.user.emailVerified, true); assert.equal(member.user.betaCohort, "FOUNDING_BETA_2026");
      assert.equal((await signupResponse(api, memberEmail, `${prefix}reuse`, { inviteToken: invite })).statusCode, 403);

      const campaign = await api.inject({ method: "POST", url: "/api/v1/admin/campaigns", cookies: cookie(admin.cookie), payload: { title: `${prefix}welcome`, body: "How was signup?", audienceType: "SELECTED", targetUserIds: [member.id], triggerType: "NEXT_LOGIN", triggerThreshold: null, responseType: "ACKNOWLEDGEMENT", responseOptions: [], actionUrl: null, essential: false, startsAt: null, endsAt: null, scheduledAt: null } });
      assert.equal(campaign.statusCode, 201);
      const campaignId = campaign.json().data.campaign.id as string;
      assert.equal((await api.inject({ method: "POST", url: `/api/v1/admin/campaigns/${campaignId}/action`, cookies: cookie(admin.cookie), payload: { action: "PUBLISH" } })).statusCode, 200);
      assert.equal((await api.inject({ method: "GET", url: "/api/v1/messages", cookies: cookie(member.cookie) })).json().data.items.length, 0);
      const triggeredLogin = await login(api, `${prefix}member`);
      const inbox = await api.inject({ method: "GET", url: "/api/v1/messages", cookies: cookie(triggeredLogin.headers["set-cookie"] as string) });
      assert.equal(inbox.json().data.items[0]?.id, campaignId);
      assert.equal((await api.inject({ method: "POST", url: `/api/v1/messages/${campaignId}/respond`, cookies: cookie(triggeredLogin.headers["set-cookie"] as string), payload: { type: "ACKNOWLEDGEMENT", acknowledged: true } })).statusCode, 200);
      assert.equal((await api.inject({ method: "GET", url: "/api/v1/messages", cookies: cookie(triggeredLogin.headers["set-cookie"] as string) })).json().data.items.length, 0);

      const candidates = [`${prefix}cap-a@example.test`, `${prefix}cap-b@example.test`];
      for (const email of candidates) await api.inject({ method: "POST", url: "/api/v1/beta/waitlist", payload: { ...waitlistPayload, email } });
      const capQueue = (await api.inject({ method: "GET", url: "/api/v1/admin/beta/requests", cookies: cookie(admin.cookie) })).json().data.items as Array<{ id: string; email: string }>;
      const consuming = Number((await db.selectFrom("users").select((eb) => eb.fn.countAll<string>().as("count")).where("account_status", "in", ["ACTIVE", "DELETION_PENDING", "SUSPENDED"]).executeTakeFirstOrThrow()).count);
      const reserved = Number((await db.selectFrom("beta_access_requests").select((eb) => eb.fn.countAll<string>().as("count")).where("status", "=", "INVITED").where("invitation_expires_at", ">", new Date()).executeTakeFirstOrThrow()).count);
      await api.inject({ method: "PATCH", url: "/api/v1/admin/beta/settings", cookies: cookie(admin.cookie), payload: { accountCap: consuming + reserved + 1 } });
      const capResults = await Promise.all(candidates.map((email) => api.inject({ method: "POST", url: `/api/v1/admin/beta/requests/${capQueue.find((item) => item.email === email)?.id}`, cookies: cookie(admin.cookie), payload: { action: "APPROVE" } })));
      assert.deepEqual(capResults.map((response) => response.statusCode).sort(), [200, 409]);

      const exported = await api.inject({ method: "POST", url: "/api/v1/users/me/export", cookies: cookie(member.cookie), payload: { password: "integration-secret-1" } });
      assert.equal(exported.statusCode, 200); assert.equal(exported.json().profile.email, memberEmail);
      assert.equal("password_hash" in exported.json().profile, false);

      assert.equal((await requestDeletion(api, member.cookie)).statusCode, 200);
      assert.equal((await login(api, `${prefix}member`)).statusCode, 403);
      const supportCancel = await api.inject({ method: "POST", url: `/api/v1/admin/users/${member.id}/deletion/cancel`, cookies: cookie(admin.cookie), payload: {} });
      const relogin = await login(api, `${prefix}member`);
      assert.equal(supportCancel.statusCode, 200); assert.equal(relogin.statusCode, 200);

      assert.equal((await requestDeletion(api, relogin.headers["set-cookie"] as string)).statusCode, 200);
      const past = new Date(Date.now() - 1_000);
      await db.updateTable("users").set({ deletion_due_at: past }).where("id", "=", member.id).execute();
      assert.equal(await createUserAccountRepository(db).finalizeDeletion(member.id, new Date()), true);
      assert.equal(await db.selectFrom("users").select("id").where("id", "=", member.id).executeTakeFirst(), undefined);
      assert.equal((await db.selectFrom("erasure_tombstones").select("user_id").where("user_id", "=", member.id).executeTakeFirst())?.user_id, member.id);
    } finally { await api.close(); }
  });

  it("compensates required deletion mail and preserves cancellation on notification failure", async () => {
    const api = await server("ENABLED");
    const email = `${prefix}mail-failure@example.test`;
    const user = await signup(api, email, `${prefix}mail-failure`, {});
    createdUserIds.add(user.id);
    try {
      failedMailKinds.add("DELETION_SCHEDULED");
      const failedSchedule = await requestDeletion(api, user.cookie);
      assert.equal(failedSchedule.statusCode, 503);
      assert.equal(failedSchedule.json().error.code, "EMAIL_DELIVERY_FAILED");
      const compensated = await db.selectFrom("users")
        .select(["account_status", "deletion_due_at"])
        .where("id", "=", user.id)
        .executeTakeFirstOrThrow();
      assert.equal(compensated.account_status, "ACTIVE");
      assert.equal(compensated.deletion_due_at, null);

      failedMailKinds.delete("DELETION_SCHEDULED");
      const signedInAgain = await login(api, `${prefix}mail-failure`);
      assert.equal(signedInAgain.statusCode, 200);
      const scheduled = await requestDeletion(api, signedInAgain.headers["set-cookie"] as string);
      assert.equal(scheduled.statusCode, 200);
      const cancellationToken = tokenFromLatestMessage("deletion");

      failedMailKinds.add("DELETION_CANCELLED");
      const cancelled = await api.inject({
        method: "POST",
        url: "/api/v1/users/me/deletion/cancel",
        payload: { token: cancellationToken }
      });
      assert.equal(cancelled.statusCode, 200);
      assert.equal(cancelled.json().data.notificationStatus, "FAILED");
      assert.equal(
        (await db.selectFrom("users").select("account_status").where("id", "=", user.id).executeTakeFirstOrThrow()).account_status,
        "ACTIVE"
      );
    } finally {
      failedMailKinds.clear();
      await api.close();
    }
  });

  it("serializes deletion finalization against a simultaneous cancellation", async () => {
    const api = await server("ENABLED");
    const email = `${prefix}deletion-race@example.test`;
    const user = await signup(api, email, `${prefix}deletion-race`, {});
    createdUserIds.add(user.id);

    try {
      assert.equal((await requestDeletion(api, user.cookie)).statusCode, 200);
      const dueAt = new Date(Date.now() - 1_000);
      await db.updateTable("users").set({ deletion_due_at: dueAt }).where("id", "=", user.id).execute();
      const token = await db.selectFrom("account_deletion_tokens")
        .select("token_hash")
        .where("user_id", "=", user.id)
        .executeTakeFirstOrThrow();
      const repository = createUserAccountRepository(db);

      const [cancelled, finalized] = await Promise.all([
        repository.cancelDeletion(token.token_hash, new Date()),
        repository.finalizeDeletion(user.id, new Date())
      ]);

      assert.notEqual(Boolean(cancelled), finalized, "exactly one row-lock winner must commit");
      const persisted = await db.selectFrom("users").select("account_status")
        .where("id", "=", user.id).executeTakeFirst();
      const tombstone = await db.selectFrom("erasure_tombstones").select("user_id")
        .where("user_id", "=", user.id).executeTakeFirst();
      if (cancelled) {
        assert.equal(persisted?.account_status, "ACTIVE");
        assert.equal(tombstone, undefined);
      } else {
        assert.equal(finalized, true);
        assert.equal(persisted, undefined);
        assert.equal(tombstone?.user_id, user.id);
      }
    } finally {
      await api.close();
    }
  });

  /**
   * Launch gate SQC-1: administrator authorization from the direct API, the
   * single-use property of the deletion cancellation link, and enumeration
   * parity on password reset.
   */
  it("refuses administrator routes to members, keeps cancellation links single-use, and does not enumerate accounts", async () => {
    const api = await server("ENABLED");
    const email = `${prefix}ordinary@example.test`;
    const member = await signup(api, email, `${prefix}ordinary`, {});
    createdUserIds.add(member.id);

    try {
      // Direct-API administrator denial: the web guard is secondary, so every
      // administrator surface must reject an ordinary session on its own.
      const adminAttempts = await Promise.all([
        api.inject({ method: "GET", url: "/api/v1/admin/users", cookies: cookie(member.cookie) }),
        api.inject({ method: "GET", url: "/api/v1/admin/audit-events", cookies: cookie(member.cookie) }),
        api.inject({ method: "PATCH", url: "/api/v1/admin/beta/settings", cookies: cookie(member.cookie), payload: { waitlistOpen: true } }),
        api.inject({ method: "PATCH", url: `/api/v1/admin/users/${member.id}/status`, cookies: cookie(member.cookie), payload: { action: "SUSPEND" } }),
        api.inject({ method: "POST", url: `/api/v1/admin/users/${member.id}/sessions/revoke`, cookies: cookie(member.cookie), payload: {} })
      ]);
      assert.deepEqual(
        adminAttempts.map((response) => response.statusCode),
        [403, 403, 403, 403, 403]
      );
      assert.equal(
        await db.selectFrom("users").select("account_status").where("id", "=", member.id)
          .executeTakeFirstOrThrow().then((row) => row.account_status),
        "ACTIVE"
      );

      assert.equal((await requestDeletion(api, member.cookie)).statusCode, 200);
      const cancellationToken = tokenFromLatestMessage("deletion");

      const firstCancel = await api.inject({
        method: "POST", url: "/api/v1/users/me/deletion/cancel", payload: { token: cancellationToken }
      });
      const replayedCancel = await api.inject({
        method: "POST", url: "/api/v1/users/me/deletion/cancel", payload: { token: cancellationToken }
      });
      assert.equal(firstCancel.statusCode, 200);
      assert.notEqual(replayedCancel.statusCode, 200, "a cancellation link must be single-use");

      const forgedCancel = await api.inject({
        method: "POST", url: "/api/v1/users/me/deletion/cancel", payload: { token: `${cancellationToken}tampered` }
      });
      assert.notEqual(forgedCancel.statusCode, 200);

      // Enumeration: a known and an unknown address must be indistinguishable.
      const knownReset = await api.inject({
        method: "POST", url: "/api/v1/auth/forgot-password", payload: { email }
      });
      const unknownReset = await api.inject({
        method: "POST", url: "/api/v1/auth/forgot-password", payload: { email: `${prefix}absent@example.test` }
      });
      assert.equal(knownReset.statusCode, unknownReset.statusCode);
      assert.deepEqual(knownReset.json(), unknownReset.json());
    } finally {
      await api.close();
    }
  });

  /**
   * Launch gate SQC-1: invitation expiry. Reuse, supersede and wrong-address are
   * covered by the admission test; an invitation that simply ran out of time is
   * the remaining rejection path.
   */
  it("rejects an invitation whose expiry has passed", async () => {
    const bootstrap = await server("ENABLED");
    const expiryAdminEmail = `${prefix}expiry-admin@example.test`;
    const expiryAdmin = await signup(bootstrap, expiryAdminEmail, `${prefix}expiry-admin`, {});
    createdUserIds.add(expiryAdmin.id);
    await db.updateTable("users").set({ role: "ADMIN" }).where("id", "=", expiryAdmin.id).execute();
    await bootstrap.close();

    const api = await server("INVITE_ONLY");
    const inviteeEmail = `${prefix}expired@example.test`;

    try {
      await api.inject({
        method: "PATCH",
        url: "/api/v1/admin/beta/settings",
        cookies: cookie(expiryAdmin.cookie),
        payload: { waitlistOpen: true, invitationsOpen: true, accountCap: 10_000, dailyApprovalLimit: 1_000 }
      });
      const requested = await api.inject({
        method: "POST",
        url: "/api/v1/beta/waitlist",
        payload: { email: inviteeEmail, adultAttested: true, termsVersion: PUBLIC_TERMS_VERSION, privacyVersion: PUBLIC_PRIVACY_VERSION }
      });
      assert.equal(requested.statusCode, 202);

      const queue = await api.inject({ method: "GET", url: "/api/v1/admin/beta/requests", cookies: cookie(expiryAdmin.cookie) });
      const requestId = queue.json().data.items.find((item: { email: string }) => item.email === inviteeEmail)?.id as string;
      assert.ok(requestId);

      const approved = await api.inject({
        method: "POST", url: `/api/v1/admin/beta/requests/${requestId}`,
        cookies: cookie(expiryAdmin.cookie), payload: { action: "APPROVE" }
      });
      assert.equal(approved.statusCode, 200);
      const invite = tokenFromLatestMessage("invite");

      // Age the invitation rather than waiting out its real window.
      await db.updateTable("beta_access_requests")
        .set({ invitation_expires_at: new Date(Date.now() - 1_000) })
        .where("id", "=", requestId).execute();

      const expiredSignup = await signupResponse(api, inviteeEmail, `${prefix}expired`, { inviteToken: invite });
      assert.equal(expiredSignup.statusCode, 403);
      assert.equal(
        await db.selectFrom("users").select("id").where("email", "=", inviteeEmail).executeTakeFirst(),
        undefined,
        "an expired invitation must not create an account"
      );
    } finally {
      await api.close();
    }
  });

  async function server(registrationMode: "ENABLED" | "INVITE_ONLY"): Promise<FastifyInstance> {
    return buildServer(db, { cookieName: "gym_progress_session", cookieSecure: false, registrationMode, sessionTtlDays: 30 }, false, { events: "off", mailer, operatorNotifier: notifier, appBaseUrl: "https://app.example.test" });
  }
  async function cleanup(): Promise<void> {
    const users = await db.selectFrom("users").select("id").where("email", "like", `${prefix}%`).execute();
    const ids = [...new Set([...users.map((user) => user.id), ...createdUserIds])];
    if (ids.length > 0) {
      await db.deleteFrom("admin_audit_events").where((eb) => eb.or([eb("admin_user_id", "in", ids), eb("target_id", "in", ids)])).execute();
      await db.deleteFrom("user_sessions").where("user_id", "in", ids).execute();
      await db.deleteFrom("auth_action_tokens").where("user_id", "in", ids).execute();
      await db.deleteFrom("account_deletion_tokens").where("user_id", "in", ids).execute();
      await db.deleteFrom("erasure_tombstones").where("user_id", "in", ids).execute();
      await db.deleteFrom("users").where("id", "in", ids).execute();
    }
    await db.deleteFrom("beta_access_requests").where("email", "like", `${prefix}%`).execute();
    await db.deleteFrom("campaigns").where("title", "like", `${prefix}%`).execute();
    if (adminId) await db.deleteFrom("admin_audit_events").where("admin_user_id", "=", adminId).execute();
    await db.updateTable("beta_settings").set({ account_cap: 50, daily_approval_limit: 10 }).where("singleton", "=", true).execute();
    createdUserIds.clear();
  }
  function tokenFromLatestMessage(kind: "deletion" | "invite"): string {
    const mailKind = kind === "invite" ? "INVITATION" : "DELETION_SCHEDULED";
    const text = [...messages].reverse().find((message) => message.kind === mailKind)?.text ?? "";
    const match = text.match(kind === "invite" ? /[?&]invite=([^&\s]+)/ : /[?&]token=([^&\s]+)/);
    assert.ok(match?.[1]); return decodeURIComponent(match[1]);
  }
});

async function signup(server: FastifyInstance, email: string, username: string, extra: { inviteToken?: string }): Promise<{ id: string; cookie: string; user: Record<string, unknown> }> {
  const response = await signupResponse(server, email, username, extra);
  assert.equal(response.statusCode, 201, response.body);
  const user = response.json().data.user as Record<string, unknown>;
  return { id: String(user.id), cookie: response.headers["set-cookie"] as string, user };
}
function signupResponse(server: FastifyInstance, email: string, username: string, extra: { inviteToken?: string }) {
  return server.inject({ method: "POST", url: "/api/v1/auth/signup", payload: { email, username, password: "integration-secret-1", termsVersion: PUBLIC_TERMS_VERSION, privacyVersion: PUBLIC_PRIVACY_VERSION, adultAttested: true, ...extra } });
}
function requestDeletion(server: FastifyInstance, sessionCookie: string) { return server.inject({ method: "POST", url: "/api/v1/users/me/deletion", cookies: cookie(sessionCookie), payload: { password: "integration-secret-1" } }); }
function login(server: FastifyInstance, username: string) { return server.inject({ method: "POST", url: "/api/v1/auth/login", payload: { username, password: "integration-secret-1" } }); }
function cookie(setCookie: string): Record<string, string> { const [pair = ""] = setCookie.split(";"); const separator = pair.indexOf("="); return { [pair.slice(0, separator)]: pair.slice(separator + 1) }; }
