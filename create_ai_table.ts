import { pool } from "./src/server/db/client.ts";

async function run() {
  console.log("Creating ai_generation_quotas table...");
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
    console.log("Success!");
  } catch (err) {
    console.error("Failed:", err);
  }
  process.exit(0);
}

run();
