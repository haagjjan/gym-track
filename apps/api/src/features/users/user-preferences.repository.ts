import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface UserPreferencesRecord {
  volumeHeatCeiling: number;
}

export interface UserPreferencesRepository {
  find(userId: string): Promise<UserPreferencesRecord | null>;
  update(userId: string, volumeHeatCeiling: number, updatedAt: Date): Promise<UserPreferencesRecord | null>;
}

export function createUserPreferencesRepository(
  db: Kysely<AppDatabase>
): UserPreferencesRepository {
  return {
    async find(userId) {
      const row = await db
        .selectFrom("users")
        .select("volume_heat_ceiling as volumeHeatCeiling")
        .where("id", "=", userId)
        .executeTakeFirst();

      return row ?? null;
    },
    async update(userId, volumeHeatCeiling, updatedAt) {
      const row = await db
        .updateTable("users")
        .set({ volume_heat_ceiling: volumeHeatCeiling, updated_at: updatedAt })
        .where("id", "=", userId)
        .returning("volume_heat_ceiling as volumeHeatCeiling")
        .executeTakeFirst();

      return row ?? null;
    }
  };
}
