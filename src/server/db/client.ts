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

// Automatically ensure the ai_generation_quotas table exists on startup
async function ensureAiTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS ai_generation_quotas (
      id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      generations_count INT NOT NULL DEFAULT 0,
      last_reset_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      KEY ai_generation_quotas_user_id_users_id_fk (user_id),
      CONSTRAINT ai_generation_quotas_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;
  try {
    await pool.query(sql);
    console.log("ai_generation_quotas table ensured successfully.");
  } catch (err) {
    console.error("Failed to ensure ai_generation_quotas table:", err);
  }
}
ensureAiTable();

