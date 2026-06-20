import { rawDb } from "./client";

export function initializeDatabase() {
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      avatar_url TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      full_name TEXT,
      school_name TEXT,
      contact_channel TEXT,
      contact_value TEXT,
      profile_completed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(provider, provider_account_id)
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      UNIQUE(role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token TEXT NOT NULL UNIQUE,
      active_role TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parent_students (
      id TEXT PRIMARY KEY,
      parent_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(parent_user_id, student_user_id)
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      class_code TEXT UNIQUE,
      teacher_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      students INTEGER NOT NULL DEFAULT 0,
      progress INTEGER NOT NULL DEFAULT 0,
      next_session TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS class_students (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      UNIQUE(class_id, student_user_id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      teacher_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'lesson',
      description TEXT NOT NULL,
      content TEXT,
      options TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      bank_status TEXT NOT NULL DEFAULT 'none',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ide_quests (
      id TEXT PRIMARY KEY,
      teacher_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      mission TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 100,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      bank_status TEXT NOT NULL DEFAULT 'none',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_material_progress (
      id TEXT PRIMARY KEY,
      student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      progress INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      UNIQUE(student_user_id, material_id)
    );

    CREATE TABLE IF NOT EXISTS student_quest_progress (
      id TEXT PRIMARY KEY,
      student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id TEXT NOT NULL REFERENCES ide_quests(id) ON DELETE CASCADE,
      progress INTEGER NOT NULL DEFAULT 0,
      earned_points INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      UNIQUE(student_user_id, quest_id)
    );

    CREATE TABLE IF NOT EXISTS teacher_journals (
      id TEXT PRIMARY KEY,
      teacher_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mood TEXT,
      success_reflection TEXT,
      improvement_reflection TEXT,
      anecdote TEXT,
      todos TEXT,
      photo_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_requests (
      id TEXT PRIMARY KEY,
      requester_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_quotas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      messages_count INTEGER NOT NULL DEFAULT 0,
      window_start_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  ensureColumn("users", "full_name", "TEXT");
  ensureColumn("users", "school_name", "TEXT");
  ensureColumn("users", "contact_channel", "TEXT");
  ensureColumn("users", "contact_value", "TEXT");
  ensureColumn("users", "profile_completed", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("classes", "class_code", "TEXT");
  ensureColumn("materials", "content", "TEXT");
  ensureColumn("materials", "options", "TEXT");
  ensureColumn("materials", "bank_status", "TEXT NOT NULL DEFAULT 'none'");
  ensureColumn("ide_quests", "bank_status", "TEXT NOT NULL DEFAULT 'none'");
  rawDb.exec("CREATE UNIQUE INDEX IF NOT EXISTS classes_class_code_idx ON classes(class_code);");
}

function ensureColumn(table: string, column: string, definition: string) {
  const rows = rawDb.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (rows.some((row) => row.name === column)) return;
  rawDb.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}
