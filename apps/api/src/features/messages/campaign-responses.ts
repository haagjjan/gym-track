import type { CampaignResponseRecords } from "./message.repository.js";

export interface CampaignResponseAnswer {
  userId: string;
  username: string;
  email: string;
  respondedAt: string | null;
  /** Human-readable rendering of the stored answer, or null when unanswered. */
  answer: string | null;
  state: "RESPONDED" | "DISMISSED" | "SEEN" | "PENDING";
}

export interface CampaignResponseReport {
  campaign: CampaignResponseRecords["campaign"];
  totals: { delivered: number; seen: number; dismissed: number; responded: number };
  /** Answer tallies for the closed response types; empty for free text. */
  breakdown: Array<{ label: string; count: number }>;
  answers: CampaignResponseAnswer[];
}

/**
 * Shapes delivery rows into the report the administration screen renders.
 *
 * Kept separate from the repository so the tally and the answer rendering can
 * be tested without a database, and so a malformed stored response degrades to
 * "no answer" instead of breaking the whole report.
 */
export function summariseCampaignResponses(records: CampaignResponseRecords): CampaignResponseReport {
  const answers = records.recipients.map((recipient) => ({
    userId: recipient.userId,
    username: recipient.username,
    email: recipient.email,
    respondedAt: recipient.respondedAt ? recipient.respondedAt.toISOString() : null,
    answer: recipient.respondedAt ? renderAnswer(recipient.response) : null,
    state: recipientState(recipient)
  }));

  return {
    campaign: records.campaign,
    totals: {
      delivered: records.recipients.length,
      seen: records.recipients.filter((recipient) => recipient.shownAt !== null).length,
      dismissed: records.recipients.filter((recipient) => recipient.dismissedAt !== null).length,
      responded: records.recipients.filter((recipient) => recipient.respondedAt !== null).length
    },
    breakdown: tally(records.campaign.responseType, records.campaign.responseOptions, answers),
    answers
  };
}

function recipientState(recipient: CampaignResponseRecords["recipients"][number]): CampaignResponseAnswer["state"] {
  if (recipient.respondedAt) return "RESPONDED";
  if (recipient.dismissedAt) return "DISMISSED";
  return recipient.shownAt ? "SEEN" : "PENDING";
}

function renderAnswer(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const value = response as Record<string, unknown>;

  if (value.type === "ACKNOWLEDGEMENT") return "Acknowledged";
  if (value.type === "RATING" && typeof value.rating === "number") return `${value.rating}/5`;
  if (value.type === "SINGLE_CHOICE" && typeof value.choice === "string") return value.choice;
  if (value.type === "FREE_TEXT" && typeof value.text === "string") return value.text;

  return null;
}

function tally(
  responseType: string,
  responseOptions: string[],
  answers: CampaignResponseAnswer[]
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();

  if (responseType === "SINGLE_CHOICE") {
    for (const option of responseOptions) counts.set(option, 0);
  } else if (responseType === "RATING") {
    for (const rating of [1, 2, 3, 4, 5]) counts.set(`${rating}/5`, 0);
  } else if (responseType === "ACKNOWLEDGEMENT") {
    counts.set("Acknowledged", 0);
  } else {
    return [];
  }

  for (const answer of answers) {
    if (answer.answer === null) continue;
    counts.set(answer.answer, (counts.get(answer.answer) ?? 0) + 1);
  }

  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}
