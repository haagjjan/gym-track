import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export type AppDatabase = Record<string, never>;

export function createDatabase(databaseUrl: string): Kysely<AppDatabase> {
  return new Kysely<AppDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl
      })
    })
  });
}
