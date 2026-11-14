import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";

/**
 * Key-value store for what must survive on the phone: the outbox, the copy of the
 * exercise list and the cached screens (ADR 0025, "Local data is kept").
 *
 * On a phone the values live in a SQLite file in the app's own data folder, which
 * the system does not clear on its own. Reads are served from memory, so callers
 * stay synchronous; every write goes to memory at once and to the file right
 * after. In a desktop browser (development) it falls back to web storage.
 */
const DATABASE = "gymtrack";
const values = new Map<string, string>();
let db: SQLiteDBConnection | null = null;
let pending: Promise<void> = Promise.resolve();
let ready: Promise<void> | null = null;

function webGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function open(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const connection = await sqlite.createConnection(DATABASE, false, "no-encryption", 1, false);

    await connection.open();
    await connection.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL);");

    const rows = await connection.query("SELECT key, value FROM kv;");

    for (const row of (rows.values ?? []) as { key: string; value: string }[]) {
      values.set(row.key, row.value);
    }

    db = connection;
  } catch (error) {
    // Without the database the app still works; it then relies on web storage.
    console.warn("Device store unavailable, using web storage.", error);
  }
}

/** Opens the store once. Screens wait for this before they read or write. */
export function deviceStoreReady(): Promise<void> {
  ready ??= open();
  return ready;
}

export function deviceGet(key: string): string | null {
  if (!db) return webGet(key);

  const stored = values.get(key);

  if (stored !== undefined) return stored;

  // First run after an update: take over what the earlier build kept in web storage.
  const legacy = webGet(key);

  if (legacy !== null) deviceSet(key, legacy);

  return legacy;
}

export function deviceSet(key: string, value: string): void {
  if (!db) {
    window.localStorage.setItem(key, value);
    return;
  }

  const connection = db;

  values.set(key, value);
  pending = pending
    .then(() => connection.run("INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;", [key, value, Date.now()]))
    .then(() => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Nothing to remove.
      }
    })
    .catch((error: unknown) => console.warn("Couldn't write to the device store.", error));
}

export function deviceRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to remove.
  }

  if (!db) return;

  const connection = db;

  values.delete(key);
  pending = pending
    .then(() => connection.run("DELETE FROM kv WHERE key = ?;", [key]))
    .then(() => undefined)
    .catch((error: unknown) => console.warn("Couldn't write to the device store.", error));
}

/** A store for one fixed key, in the shape the offline modules expect. */
export function deviceKey(key: string): { read(): string | null; write(value: string): void } {
  return { read: () => deviceGet(key), write: (value) => deviceSet(key, value) };
}
