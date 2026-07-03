import { runMigrations } from "./migrate";

export async function initializeDatabase() {
  try {
    await runMigrations();
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}
