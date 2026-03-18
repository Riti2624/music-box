import { Pool, type QueryResultRow } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;

export const isDatabaseConfigured = Boolean(DATABASE_URL);

let initPromise: Promise<void> | null = null;

function getPool(): Pool {
  if (!pool) {
    throw new Error("Missing DATABASE_URL environment variable");
  }

  return pool;
}

export async function ensureDatabaseReady(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getPool();

      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS shares (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          image_key TEXT,
          audio_key TEXT NOT NULL,
          audio_file_name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ
        );
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares(expires_at);
      `);
    })();
  }

  await initPromise;
}

export async function upsertUser(userId: string): Promise<void> {
  await ensureDatabaseReady();
  await getPool().query(
    `
      INSERT INTO users (id)
      VALUES ($1)
      ON CONFLICT (id) DO NOTHING
    `,
    [userId],
  );
}

export async function queryDb<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ensureDatabaseReady();
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function executeDb(text: string, params: unknown[] = []): Promise<void> {
  await ensureDatabaseReady();
  await getPool().query(text, params);
}
