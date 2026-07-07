import { pool } from "./src/server/db/client.ts";

async function run() {
  const [rows] = await pool.query("SHOW CREATE TABLE chat_quotas;");
  console.log(rows[0]["Create Table"]);
  process.exit(0);
}

run();
