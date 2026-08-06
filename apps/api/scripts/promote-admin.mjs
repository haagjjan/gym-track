import "dotenv/config";
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  process.stderr.write("Usage: pnpm --dir apps/api admin:promote -- owner@example.com\n");
  process.exit(2);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const result = await client.query(
    "UPDATE users SET role = 'ADMIN', updated_at = now() WHERE lower(email) = $1 AND role <> 'ADMIN' RETURNING id",
    [email]
  );
  if (result.rowCount !== 1) throw new Error("Exactly one non-admin account must match.");
  const userId = result.rows[0].id;
  await client.query(
    "INSERT INTO admin_audit_events (admin_user_id, action, target_type, target_id, details) VALUES (NULL, 'ADMIN_BOOTSTRAPPED_BY_OPERATOR', 'USER', $1, $2::jsonb)",
    [userId, JSON.stringify({ method: "operator_cli" })]
  );
  await client.query("COMMIT");
  process.stdout.write(`Administrator role assigned to user ${userId}.\n`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
