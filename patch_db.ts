import { pool } from "./src/server/db/client";

async function patch() {
  try {
    console.log("Applying ALTER TABLE...");
    await pool.query(`
CREATE TABLE \`consultation_threads\` (
	\`id\` varchar(64) NOT NULL,
	\`student_user_id\` varchar(64) NOT NULL,
	\`parent_user_id\` varchar(64) NOT NULL,
	\`teacher_user_id\` varchar(64) NOT NULL,
	\`topic\` varchar(255) NOT NULL,
	\`status\` enum('open','closed') NOT NULL DEFAULT 'open',
	\`created_at\` datetime(3) NOT NULL,
	\`updated_at\` datetime(3) NOT NULL,
	CONSTRAINT \`consultation_threads_id\` PRIMARY KEY(\`id\`)
);
CREATE TABLE \`consultation_messages\` (
	\`id\` varchar(64) NOT NULL,
	\`thread_id\` varchar(64) NOT NULL,
	\`sender_user_id\` varchar(64) NOT NULL,
	\`content\` text NOT NULL,
	\`created_at\` datetime(3) NOT NULL,
	CONSTRAINT \`consultation_messages_id\` PRIMARY KEY(\`id\`)
);
ALTER TABLE \`consultation_threads\` ADD CONSTRAINT \`consultation_threads_student_user_id_users_id_fk\` FOREIGN KEY (\`student_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE \`consultation_threads\` ADD CONSTRAINT \`consultation_threads_parent_user_id_users_id_fk\` FOREIGN KEY (\`parent_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE \`consultation_threads\` ADD CONSTRAINT \`consultation_threads_teacher_user_id_users_id_fk\` FOREIGN KEY (\`teacher_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE \`consultation_messages\` ADD CONSTRAINT \`consultation_messages_thread_id_consultation_threads_id_fk\` FOREIGN KEY (\`thread_id\`) REFERENCES \`consultation_threads\`(\`id\`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE \`consultation_messages\` ADD CONSTRAINT \`consultation_messages_sender_user_id_users_id_fk\` FOREIGN KEY (\`sender_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade ON UPDATE no action;
    `);
    await pool.query("ALTER TABLE users ADD COLUMN welcome_bonus_claimed BOOLEAN NOT NULL DEFAULT 0;");
    console.log("Database patched successfully.");
  } catch (err) {
    console.error("Patch error:", err);
  } finally {
    process.exit(0);
  }
}
patch();
