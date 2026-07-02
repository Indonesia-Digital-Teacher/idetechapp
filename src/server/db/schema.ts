import { relations } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    avatarUrl: text("avatar_url"),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    fullName: text("full_name"),
    schoolName: text("school_name"),
    contactChannel: text("contact_channel", { enum: ["wa", "telegram"] }),
    contactValue: text("contact_value"),
    profileCompleted: integer("profile_completed", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["active", "pending", "suspended"] }).notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email)
  })
);

export const oauthAccounts = sqliteTable(
  "oauth_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("oauth_provider_account_idx").on(
      table.provider,
      table.providerAccountId
    )
  })
);

export const roles = sqliteTable(
  "roles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull()
  },
  (table) => ({
    nameIdx: uniqueIndex("roles_name_idx").on(table.name)
  })
);

export const permissions = sqliteTable(
  "permissions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull()
  },
  (table) => ({
    nameIdx: uniqueIndex("permissions_name_idx").on(table.name)
  })
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    userRoleIdx: uniqueIndex("user_roles_user_role_idx").on(table.userId, table.roleId)
  })
);

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    rolePermissionIdx: uniqueIndex("role_permissions_role_permission_idx").on(
      table.roleId,
      table.permissionId
    )
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull(),
    activeRole: text("active_role").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_idx").on(table.sessionToken)
  })
);

export const parentStudents = sqliteTable(
  "parent_students",
  {
    id: text("id").primaryKey(),
    parentUserId: text("parent_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    parentStudentIdx: uniqueIndex("parent_students_parent_student_idx").on(
      table.parentUserId,
      table.studentUserId
    )
  })
);

export const classes = sqliteTable(
  "classes",
  {
    id: text("id").primaryKey(),
    classCode: text("class_code"),
    teacherUserId: text("teacher_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    grade: text("grade").notNull(),
    students: integer("students").notNull().default(0),
    progress: integer("progress").notNull().default(0),
    nextSession: text("next_session").notNull(),
    status: text("status", { enum: ["active", "draft", "archived"] }).notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    classCodeIdx: uniqueIndex("classes_class_code_idx").on(table.classCode)
  })
);

export const classStudents = sqliteTable(
  "class_students",
  {
    id: text("id").primaryKey(),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    classStudentIdx: uniqueIndex("class_students_class_student_idx").on(table.classId, table.studentUserId)
  })
);

export const materials = sqliteTable("materials", {
  id: text("id").primaryKey(),
  teacherUserId: text("teacher_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type", { enum: ["lesson", "video", "document", "quiz"] }).notNull().default("lesson"),
  description: text("description").notNull(),
  content: text("content"), // Menyimpan isi Markdown, URL Video, URL PDF, atau JSON Quiz
  options: text("options", { mode: "json" }), // Menyimpan pengaturan tambahan (seperti allowDownload)
  status: text("status", { enum: ["draft", "published"] }).notNull().default("published"),
  bankStatus: text("bank_status", { enum: ["none", "pending", "approved", "rejected"] }).notNull().default("none"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const ideQuests = sqliteTable("ide_quests", {
  id: text("id").primaryKey(),
  teacherUserId: text("teacher_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  materialId: text("material_id").references(() => materials.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  mission: text("mission").notNull(),
  points: integer("points").notNull().default(100),
  dueDate: text("due_date").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("published"),
  bankStatus: text("bank_status", { enum: ["none", "pending", "approved", "rejected"] }).notNull().default("none"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const studentMaterialProgress = sqliteTable(
  "student_material_progress",
  {
    id: text("id").primaryKey(),
    studentUserId: text("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    materialId: text("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    studentMaterialIdx: uniqueIndex("student_material_progress_student_material_idx").on(table.studentUserId, table.materialId)
  })
);

export const studentQuestProgress = sqliteTable(
  "student_quest_progress",
  {
    id: text("id").primaryKey(),
    studentUserId: text("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questId: text("quest_id").notNull().references(() => ideQuests.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    earnedPoints: integer("earned_points").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (table) => ({
    studentQuestIdx: uniqueIndex("student_quest_progress_student_quest_idx").on(table.studentUserId, table.questId)
  })
);

export const teacherJournals = sqliteTable("teacher_journals", {
  id: text("id").primaryKey(),
  teacherUserId: text("teacher_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mood: text("mood"),
  successReflection: text("success_reflection"),
  improvementReflection: text("improvement_reflection"),
  anecdote: text("anecdote"),
  todos: text("todos"),
  photoUrl: text("photo_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const bankRequests = sqliteTable("bank_requests", {
  id: text("id").primaryKey(),
  requesterUserId: text("requester_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetClassId: text("target_class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  itemType: text("item_type", { enum: ["material", "quest"] }).notNull(),
  itemId: text("item_id").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const chatQuotas = sqliteTable("chat_quotas", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messagesCount: integer("messages_count").notNull().default(0),
  windowStartAt: integer("window_start_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const userRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
  userRoles: many(userRoles),
  sessions: many(sessions),
  classes: many(classes),
  classStudents: many(classStudents),
  materials: many(materials),
  ideQuests: many(ideQuests),
  materialProgress: many(studentMaterialProgress),
  questProgress: many(studentQuestProgress)
}));

export const roleRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions)
}));

export const permissionRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions)
}));

export const userRoleRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] })
}));

export const rolePermissionRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] })
}));

export const classRelations = relations(classes, ({ one }) => ({
  teacher: one(users, { fields: [classes.teacherUserId], references: [users.id] })
}));

export const classStudentRelations = relations(classStudents, ({ one }) => ({
  class: one(classes, { fields: [classStudents.classId], references: [classes.id] }),
  student: one(users, { fields: [classStudents.studentUserId], references: [users.id] })
}));

export const materialRelations = relations(materials, ({ one }) => ({
  teacher: one(users, { fields: [materials.teacherUserId], references: [users.id] }),
  class: one(classes, { fields: [materials.classId], references: [classes.id] })
}));

export const ideQuestRelations = relations(ideQuests, ({ one }) => ({
  teacher: one(users, { fields: [ideQuests.teacherUserId], references: [users.id] }),
  class: one(classes, { fields: [ideQuests.classId], references: [classes.id] }),
  material: one(materials, { fields: [ideQuests.materialId], references: [materials.id] })
}));

export const studentMaterialProgressRelations = relations(studentMaterialProgress, ({ one }) => ({
  student: one(users, { fields: [studentMaterialProgress.studentUserId], references: [users.id] }),
  material: one(materials, { fields: [studentMaterialProgress.materialId], references: [materials.id] })
}));

export const studentQuestProgressRelations = relations(studentQuestProgress, ({ one }) => ({
  student: one(users, { fields: [studentQuestProgress.studentUserId], references: [users.id] }),
  quest: one(ideQuests, { fields: [studentQuestProgress.questId], references: [ideQuests.id] })
}));

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: text("details"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const globalAnnouncements = sqliteTable("global_announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type", { enum: ["info", "warning", "success"] }).notNull().default("info"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  authorUserId: text("author_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const masterSubjects = sqliteTable("master_subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const masterGrades = sqliteTable("master_grades", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export type RoleName = "admin" | "teacher" | "student" | "parent";
