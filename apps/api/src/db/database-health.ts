import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "./database.js";

export interface DatabaseHealthCheck {
  check(): Promise<void>;
}

export function createDatabaseHealthCheck(
  db: Kysely<AppDatabase>
): DatabaseHealthCheck {
  return {
    async check() {
      await sql`select 1`.execute(db);
    }
  };
}
