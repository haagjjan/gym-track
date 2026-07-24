import type { Kysely } from "kysely";
import type { AppDatabase } from "../db/database.js";
import type { AppLoggerLike } from "./mailer.js";

/**
 * First-party product analytics: fire-and-forget inserts into app_events,
 * recorded server-side only (no client ingest endpoint = no extra attack
 * surface, no consent-relevant third party). Failures never block requests.
 */
export interface EventTracker {
  track(eventName: string, userId?: string | null, properties?: Record<string, unknown>): void;
}

export function createEventTracker(
  db: Kysely<AppDatabase>,
  logger: AppLoggerLike
): EventTracker {
  return {
    track(eventName, userId = null, properties = {}) {
      void db
        .insertInto("app_events")
        .values({
          user_id: userId,
          event_name: eventName,
          properties: JSON.stringify(properties)
        })
        .execute()
        .catch((error: unknown) => {
          logger.warn({ eventName, error }, "app event insert failed");
        });
    }
  };
}

export const noopEventTracker: EventTracker = {
  track() {
    // Used by tests and callers that do not need analytics.
  }
};
