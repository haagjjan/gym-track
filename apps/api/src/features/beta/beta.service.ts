import { randomUUID } from "node:crypto";
import type { Mailer } from "../../shared/mailer.js";
import type { OperatorNotifier } from "../../shared/operator-notifier.js";
import type { SessionTokenGenerator } from "../auth/session-token.js";
import type { BetaRepository } from "./beta.repository.js";
import type { BetaSettingsUpdate, WaitlistRequest } from "./beta.schemas.js";

export function createBetaService(options: {
  repository: BetaRepository;
  tokens: SessionTokenGenerator;
  mailer?: Mailer | undefined;
  notifier: OperatorNotifier;
  appBaseUrl: string;
  now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());

  async function issueInvitation(requestId: string, adminUserId: string, resend: boolean) {
    const token = options.tokens.create();
    const issuedAt = now();
    const expiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result = await options.repository.approve(
      requestId, adminUserId, token.tokenHash, expiresAt, issuedAt, !resend
    );
    if (result.status !== "approved") return result;

    let deliveryStatus: "FAILED" | "SENT" = "FAILED";
    try {
      if (!options.mailer) throw new Error("Email delivery is unavailable.");
      await options.mailer.send({
        kind: "INVITATION",
        to: result.email,
        subject: "Your Founding Beta invitation",
        text: `You have been selected for the Gym Progress Tracker Founding Beta. Create your account before ${expiresAt.toISOString()}: ${options.appBaseUrl}/signup?invite=${encodeURIComponent(token.rawToken)}&email=${encodeURIComponent(result.email)}\n\nThis invitation is single-use and intended only for you.`
      });
      deliveryStatus = "SENT";
    } catch {
      // Invitation issuance remains durable; the administrator receives an
      // explicit failed state and can choose RESEND.
    }
    await options.repository.recordInvitationDelivery(requestId, adminUserId, deliveryStatus, now());
    return { status: "approved" as const, expiresAt, deliveryStatus };
  }

  return {
    getSettings: () => options.repository.getSettings(),
    listRequests: () => options.repository.listRequests(),
    listUsers: () => options.repository.listUsers(),
    updateSettings: (adminUserId: string, update: BetaSettingsUpdate) =>
      options.repository.updateSettings(adminUserId, update, now()),
    async requestAccess(input: WaitlistRequest) {
      const id = randomUUID();
      const requestedAt = now();
      const status = await options.repository.createRequest(id, input, requestedAt);
      if (status === "created") {
        options.notifier.notifyBetaRequest(id, requestedAt).catch(() => undefined);
      }
      return { received: true } as const;
    },
    approve: (requestId: string, adminUserId: string) => issueInvitation(requestId, adminUserId, false),
    resend: (requestId: string, adminUserId: string) => issueInvitation(requestId, adminUserId, true),
    returnToWaitlist: (requestId: string, adminUserId: string) =>
      options.repository.returnToWaitlist(requestId, adminUserId, now()),
    block: (requestId: string, adminUserId: string) =>
      options.repository.block(requestId, adminUserId, now()),
    cleanup: () => options.repository.expireInvitations(now())
  };
}

export type BetaService = ReturnType<typeof createBetaService>;
