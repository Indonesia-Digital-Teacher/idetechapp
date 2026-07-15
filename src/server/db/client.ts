import { createPool, type Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "mysql://root@localhost:3306/idetech";

function createDatabasePool(): Pool {
  return createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
}

export const pool = createDatabasePool();
export const db = drizzle(pool, { schema, mode: "default" });

// Automatically ensure the ai_generation_quotas table exists on startup.
// The FK is added separately so the table can be created even when the
// `users` table does not exist yet (migrations run after module load).
async function ensureAiTable() {
  const createSql = `
    CREATE TABLE IF NOT EXISTS ai_generation_quotas (
      id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      generations_count INT NOT NULL DEFAULT 0,
      last_reset_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      KEY ai_generation_quotas_user_id_users_id_fk (user_id)
    );
  `;
  try {
    await pool.query(createSql);
  } catch (err) {
    console.error("Failed to ensure ai_generation_quotas table:", err);
    return;
  }

  try {
    const [rows] = (await pool.query(
      "SHOW TABLES LIKE 'users'"
    )) as unknown as [Array<Record<string, unknown>>];
    if (rows.length === 0) {
      console.log("ai_generation_quotas table ensured (users table not ready, skipping FK).");
      return;
    }

    await pool.query(
      `ALTER TABLE ai_generation_quotas DROP FOREIGN KEY IF EXISTS ai_generation_quotas_user_id_users_id_fk`
    );
    await pool.query(
      `ALTER TABLE ai_generation_quotas DROP INDEX IF EXISTS ai_generation_quotas_user_id_users_id_fk`
    );
    await pool.query(`
      ALTER TABLE ai_generation_quotas
      ADD CONSTRAINT ai_generation_quotas_user_id_users_id_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log("ai_generation_quotas table ensured successfully.");
  } catch (err) {
    console.warn("ai_generation_quotas FK setup skipped:", err);
  }
}
ensureAiTable();

