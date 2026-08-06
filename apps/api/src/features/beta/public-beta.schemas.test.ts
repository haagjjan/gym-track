import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCampaignSchema, messageResponseSchema } from "../messages/message.schemas.js";
import { PUBLIC_PRIVACY_VERSION, PUBLIC_TERMS_VERSION, waitlistRequestSchema } from "./beta.schemas.js";

describe("public beta input boundaries", () => {
  it("requires current policy evidence and a literal adult attestation", () => {
    assert.equal(waitlistRequestSchema.safeParse({ email: "USER@example.com", adultAttested: true, termsVersion: PUBLIC_TERMS_VERSION, privacyVersion: PUBLIC_PRIVACY_VERSION }).success, true);
    assert.equal(waitlistRequestSchema.safeParse({ email: "user@example.com", adultAttested: false, termsVersion: PUBLIC_TERMS_VERSION, privacyVersion: PUBLIC_PRIVACY_VERSION }).success, false);
    assert.equal(waitlistRequestSchema.safeParse({ email: "user@example.com", adultAttested: true, termsVersion: "old", privacyVersion: PUBLIC_PRIVACY_VERSION }).success, false);
  });

  it("rejects executable links and malformed campaign response designs", () => {
    const base = { title: "Question", body: "How is it going?", audienceType: "ALL", targetUserIds: [], triggerType: "NEXT_LOGIN", triggerThreshold: null, responseType: "ACKNOWLEDGEMENT", responseOptions: [], essential: false, startsAt: null, endsAt: null, scheduledAt: null };
    assert.equal(createCampaignSchema.safeParse({ ...base, actionUrl: "javascript:alert(1)" }).success, false);
    assert.equal(createCampaignSchema.safeParse({ ...base, responseType: "SINGLE_CHOICE", responseOptions: ["Only one"], actionUrl: null }).success, false);
    assert.equal(createCampaignSchema.safeParse({ ...base, actionUrl: "https://gymtrack.ch/help" }).success, true);
  });

  it("bounds free-text responses and rating values", () => {
    assert.equal(messageResponseSchema.safeParse({ type: "FREE_TEXT", text: "x".repeat(1_001) }).success, false);
    assert.equal(messageResponseSchema.safeParse({ type: "RATING", rating: 6 }).success, false);
    assert.equal(messageResponseSchema.safeParse({ type: "RATING", rating: 5 }).success, true);
  });
});
