import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Mailer } from "../../shared/mailer.js";
import { noopOperatorNotifier } from "../../shared/operator-notifier.js";
import type { SessionTokenGenerator } from "../auth/session-token.js";
import type { BetaRepository } from "./beta.repository.js";
import { createBetaService } from "./beta.service.js";

const now = new Date("2026-08-06T12:00:00.000Z");

function repository(
  recordDelivery: BetaRepository["recordInvitationDelivery"]
): BetaRepository {
  return {
    async getSettings() {
      return { waitlistOpen: true, invitationsOpen: true, campaignsOpen: true, accountCap: 50, dailyApprovalLimit: 10 };
    },
    async createRequest() { return "created"; },
    async listRequests() { return []; },
    async listUsers() { return []; },
    async approve() { return { status: "approved", email: "invitee@example.test" }; },
    recordInvitationDelivery: recordDelivery,
    async returnToWaitlist() { return true; },
    async block() { return true; },
    async updateSettings() {
      return { waitlistOpen: true, invitationsOpen: true, campaignsOpen: true, accountCap: 50, dailyApprovalLimit: 10 };
    },
    async expireInvitations() {}
  };
}

const tokens: SessionTokenGenerator = {
  create() { return { rawToken: "raw-invitation", tokenHash: "hashed-invitation" }; },
  hash(value) { return `hashed:${value}`; }
};

describe("beta invitation delivery", () => {
  it("preserves invitation issuance and records an explicit failed delivery", async () => {
    const deliveries: Array<{ outcome: "FAILED" | "SENT"; requestId: string }> = [];
    const failingMailer: Mailer = {
      async send() { throw new Error("provider unavailable"); }
    };
    const service = createBetaService({
      repository: repository(async (requestId, _adminUserId, outcome) => {
        deliveries.push({ requestId, outcome });
      }),
      tokens,
      mailer: failingMailer,
      notifier: noopOperatorNotifier,
      appBaseUrl: "https://app.example.test",
      now: () => now
    });

    const result = await service.approve("request-1", "admin-1");

    assert.deepEqual(result, {
      status: "approved",
      expiresAt: new Date("2026-08-13T12:00:00.000Z"),
      deliveryStatus: "FAILED"
    });
    assert.deepEqual(deliveries, [{ requestId: "request-1", outcome: "FAILED" }]);
  });
});
