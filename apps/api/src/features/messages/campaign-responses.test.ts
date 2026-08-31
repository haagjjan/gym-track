import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summariseCampaignResponses } from "./campaign-responses.js";
import type { CampaignResponseRecords } from "./message.repository.js";

const respondedAt = new Date("2026-08-20T09:30:00.000Z");

function records(overrides: Partial<CampaignResponseRecords> = {}): CampaignResponseRecords {
  return {
    campaign: {
      id: "campaign-1",
      title: "How is the beta going?",
      status: "PUBLISHED",
      responseType: "SINGLE_CHOICE",
      responseOptions: ["Great", "Fine", "Rough"]
    },
    recipients: [],
    ...overrides
  };
}

describe("campaign response report", () => {
  it("counts every delivery state and renders each answer", () => {
    const report = summariseCampaignResponses(records({
      recipients: [
        { userId: "u1", username: "jan", email: "jan@example.com", shownAt: respondedAt, dismissedAt: null, respondedAt, response: { type: "SINGLE_CHOICE", choice: "Great" } },
        { userId: "u2", username: "ana", email: "ana@example.com", shownAt: respondedAt, dismissedAt: respondedAt, respondedAt: null, response: null },
        { userId: "u3", username: "ben", email: "ben@example.com", shownAt: respondedAt, dismissedAt: null, respondedAt: null, response: null },
        { userId: "u4", username: "cleo", email: "cleo@example.com", shownAt: null, dismissedAt: null, respondedAt: null, response: null }
      ]
    }));

    assert.deepEqual(report.totals, { delivered: 4, seen: 3, dismissed: 1, responded: 1 });
    assert.deepEqual(report.answers.map((answer) => answer.state), [
      "RESPONDED",
      "DISMISSED",
      "SEEN",
      "PENDING"
    ]);
    assert.equal(report.answers[0]?.answer, "Great");
    assert.equal(report.answers[0]?.respondedAt, respondedAt.toISOString());
    assert.deepEqual(report.breakdown, [
      { label: "Great", count: 1 },
      { label: "Fine", count: 0 },
      { label: "Rough", count: 0 }
    ]);
  });

  it("keeps free-text answers out of the tally but still lists them", () => {
    const report = summariseCampaignResponses(records({
      campaign: {
        id: "campaign-2",
        title: "Anything missing?",
        status: "ENDED",
        responseType: "FREE_TEXT",
        responseOptions: []
      },
      recipients: [
        { userId: "u1", username: "jan", email: "jan@example.com", shownAt: respondedAt, dismissedAt: null, respondedAt, response: { type: "FREE_TEXT", text: "More rest presets" } }
      ]
    }));

    assert.deepEqual(report.breakdown, []);
    assert.equal(report.answers[0]?.answer, "More rest presets");
  });

  it("degrades an unrecognised stored answer to no answer instead of failing", () => {
    const report = summariseCampaignResponses(records({
      recipients: [
        { userId: "u1", username: "jan", email: "jan@example.com", shownAt: respondedAt, dismissedAt: null, respondedAt, response: { type: "RETIRED_FORMAT" } }
      ]
    }));

    assert.equal(report.answers[0]?.answer, null);
    assert.equal(report.totals.responded, 1);
  });
});
