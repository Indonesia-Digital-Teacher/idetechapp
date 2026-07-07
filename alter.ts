import { createPool } from "mysql2/promise";

async function run() {
  console.log("Connecting...");
  const pool = createPool({ uri: "mysql://idetech:idetech_secret@127.0.0.1:3307/idetech" });
  const connection = await pool.getConnection();
  console.log("Connected!");
  try {
    // await connection.query("ALTER TABLE users ADD COLUMN coins INT NOT NULL DEFAULT 0, ADD COLUMN last_check_in_date VARCHAR(10), ADD COLUMN check_in_streak INT NOT NULL DEFAULT 0;");
    await connection.query(`
      CREATE TABLE \`coin_transactions\` (
        \`id\` varchar(64) NOT NULL,
        \`user_id\` varchar(64) NOT NULL,
        \`amount\` int NOT NULL,
        \`type\` enum('check_in','quest','material','shop','welcome_bonus') NOT NULL,
        \`description\` text,
        \`created_at\` datetime(3) NOT NULL,
        CONSTRAINT \`coin_transactions_id\` PRIMARY KEY(\`id\`)
      );
    `);
    await connection.query(`
      ALTER TABLE \`coin_transactions\` ADD CONSTRAINT \`coin_transactions_user_id_users_id_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade ON UPDATE no action;
    `);
    console.log("Success");
  } catch (err) {
    console.error(err);
  } finally {
    connection.release();
    process.exit(0);
  }
}
run();
