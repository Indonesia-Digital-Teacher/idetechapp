import { runMigrations } from "./migrate";
import { pool } from "./client";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForDatabase(options: {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
} = {}) {
  const { maxRetries = 10, initialDelayMs = 500, maxDelayMs = 10000 } = options;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      connection.release();
      console.log(`Berhasil terhubung ke MariaDB setelah ${attempt} percobaan.`);
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt) {
        throw error;
      }

      console.warn(
        `Percobaan koneksi MariaDB ke-${attempt} gagal, mencoba lagi dalam ${delay}ms...`
      );
      await sleep(delay);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }
}

export async function initializeDatabase() {
  try {
    await waitForDatabase();
    await runMigrations();
    await ensureTeacherTodosTable();
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

async function ensureTeacherTodosTable() {
  const [rows] = await pool.query(
    "SHOW TABLES LIKE 'teacher_todos'"
  ) as unknown as [Array<Record<string, unknown>>];

  if (rows.length > 0) {
    // Table already exists, ensure new columns exist (self-healing)
    try {
      await pool.query("ALTER TABLE `teacher_todos` ADD COLUMN IF NOT EXISTS `class_id` varchar(64) NULL");
      await pool.query("ALTER TABLE `teacher_todos` ADD COLUMN IF NOT EXISTS `category` varchar(100) NULL");
    } catch (err) {
      console.warn("Soft migration of teacher_todos columns failed (might already exist):", err);
    }
    return;
  }

  console.warn("teacher_todos table not found, creating it now...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`teacher_todos\` (
      \`id\` varchar(64) NOT NULL,
      \`user_id\` varchar(64) NOT NULL,
      \`class_id\` varchar(64) NULL,
      \`category\` varchar(100) NULL,
      \`title\` varchar(255) NOT NULL,
      \`description\` text,
      \`priority\` enum('high','medium','low') NOT NULL DEFAULT 'medium',
      \`is_completed\` boolean NOT NULL DEFAULT false,
      \`due_date\` datetime(3),
      \`created_at\` datetime(3) NOT NULL,
      \`updated_at\` datetime(3) NOT NULL,
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`teacher_todos_user_id_users_id_fk\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`teacher_todos_class_id_classes_id_fk\`
        FOREIGN KEY (\`class_id\`) REFERENCES \`classes\` (\`id\`) ON DELETE SET NULL
    )
  `);
}
