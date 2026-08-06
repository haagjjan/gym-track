import type { Kysely } from "kysely";
import type { AppDatabase } from "../db/database.js";
import type { AppLoggerLike } from "./mailer.js";

/**
 * First-party product analytics: fire-and-forget inserts into app_events,
 * recorded server-side only after the account has opted in. There is no
 * client ingest endpoint or third-party tracker. Failures never block requests.
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
      void (async () => {
        if (userId) {
          const user = await db.selectFrom("users").select("analytics_enabled as enabled")
            .where("id", "=", userId).executeTakeFirst();
          if (!user?.enabled) return;
        }
        await db.insertInto("app_events").values({
          user_id: userId, event_name: eventName, properties: JSON.stringify(properties)
        }).execute();
      })()
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
