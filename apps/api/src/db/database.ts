import { Kysely, PostgresDialect, type ColumnType } from "kysely";
import { Pool } from "pg";

type TimestampColumn = ColumnType<Date, Date | string | undefined, Date | string>;

interface UsersTable {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

interface UserSessionsTable {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  created_at: TimestampColumn;
  last_used_at: Date | string | null;
}

export interface AppDatabase {
  users: UsersTable;
  user_sessions: UserSessionsTable;
}

export function createDatabase(databaseUrl: string): Kysely<AppDatabase> {
  return new Kysely<AppDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl
      })
    })
  });
}
