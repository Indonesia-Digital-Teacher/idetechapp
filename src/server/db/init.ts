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
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}
