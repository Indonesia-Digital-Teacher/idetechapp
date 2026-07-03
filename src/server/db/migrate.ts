import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, pool } from "./client";

export async function runMigrations() {
  try {
    const connection = await pool.getConnection();
    connection.release();
  } catch (error) {
    console.error("Gagal terhubung ke MariaDB:", error);
    throw error;
  }

  await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
  console.log("Migrasi database selesai.");
}
