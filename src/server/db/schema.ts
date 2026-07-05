import { relations } from "drizzle-orm";
import {
  boolean,
  datetime,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar
} from "drizzle-orm/mysql-core";

const pk = (name = "id") => varchar(name, { length: 64 }).primaryKey();
const fk = (name: string) => varchar(name, { length: 64 }).notNull();
const optionalFk = (name: string) => varchar(name, { length: 64 });
const ts = (name: string) => datetime(name, { mode: "date", fsp: 3 }).notNull();
const optionalTs = (name: string) => datetime(name, { mode: "date", fsp: 3 });

export const users = mysqlTable(
  "users",
  {
    id: pk(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    emailVerified: boolean("email_verified").notNull().default(false),
    fullName: varchar("full_name", { length: 255 }),
    schoolName: varchar("school_name", { length: 255 }),
    contactChannel: mysqlEnum("contact_channel", ["wa", "telegram"]),
    contactValue: varchar("contact_value", { length: 100 }),
    profileCompleted: boolean("profile_completed").notNull().default(false),
    status: mysqlEnum("status", ["active", "pending", "suspended"]).notNull().default("pending"),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at")
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email)
  })
);

export const oauthAccounts = mysqlTable(
  "oauth_accounts",
  {
    id: pk(),
    userId: fk("user_id").references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: optionalTs("expires_at"),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at")
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("oauth_provider_account_idx").on(
      table.provider,
      table.providerAccountId
    )
  })
);

export const roles = mysqlTable(
  "roles",
  {
    id: pk(),
    name: varchar("name", { length: 50 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    description: text("description").notNull()
  },
  (table) => ({
    nameIdx: uniqueIndex("roles_name_idx").on(table.name)
  })
);

export const permissions = mysqlTable(
  "permissions",
  {
    id: pk(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description").notNull()
  },
  (table) => ({
    nameIdx: uniqueIndex("permissions_name_idx").on(table.name)
  })
);

export const userRoles = mysqlTable(
  "user_roles",
  {
    id: pk(),
    userId: fk("user_id").references(() => users.id, { onDelete: "cascade" }),
    roleId: fk("role_id").references(() => roles.id, { onDelete: "cascade" }),
    createdAt: ts("created_at")
  },
  (table) => ({
    userRoleIdx: uniqueIndex("user_roles_user_role_idx").on(table.userId, table.roleId)
  })
);

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    id: pk(),
    roleId: fk("role_id").references(() => roles.id, { onDelete: "cascade" }),
    permissionId: fk("permission_id").references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: ts("created_at")
  },
  (table) => ({
    rolePermissionIdx: uniqueIndex("role_permissions_role_permission_idx").on(
      table.roleId,
      table.permissionId
    )
  })
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: pk(),
    userId: fk("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    activeRole: varchar("active_role", { length: 50 }).notNull(),
    expiresAt: ts("expires_at"),
    createdAt: ts("created_at")
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_idx").on(table.sessionToken)
  })
);

export const parentStudents = mysqlTable(
  "parent_students",
  {
    id: pk(),
    parentUserId: fk("parent_user_id").references(() => users.id, { onDelete: "cascade" }),
    studentUserId: fk("student_user_id").references(() => users.id, { onDelete: "cascade" }),
    relationship: varchar("relationship", { length: 100 }).notNull(),
    createdAt: ts("created_at")
  },
  (table) => ({
    parentStudentIdx: uniqueIndex("parent_students_parent_student_idx").on(
      table.parentUserId,
      table.studentUserId
    )
  })
);

export const classes = mysqlTable(
  "classes",
  {
    id: pk(),
    classCode: varchar("class_code", { length: 50 }),
    teacherUserId: fk("teacher_user_id").references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    grade: varchar("grade", { length: 50 }).notNull(),
    students: int("students").notNull().default(0),
    progress: int("progress").notNull().default(0),
    nextSession: varchar("next_session", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["active", "draft", "archived"]).notNull().default("active"),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at")
  },
  (table) => ({
    classCodeIdx: uniqueIndex("classes_class_code_idx").on(table.classCode)
  })
);

export const classStudents = mysqlTable(
  "class_students",
  {
    id: pk(),
    classId: fk("class_id").references(() => classes.id, { onDelete: "cascade" }),
    studentUserId: fk("student_user_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at")
  },
  (table) => ({
    classStudentIdx: uniqueIndex("class_students_class_student_idx").on(table.classId, table.studentUserId)
  })
);

export const materials = mysqlTable("materials", {
  id: pk(),
  teacherUserId: fk("teacher_user_id").references(() => users.id, { onDelete: "cascade" }),
  classId: fk("class_id").references(() => classes.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["lesson", "video", "document", "quiz"]).notNull().default("lesson"),
  description: text("description").notNull(),
  content: text("content"),
  options: json("options"),
  status: mysqlEnum("status", ["draft", "published"]).notNull().default("published"),
  bankStatus: mysqlEnum("bank_status", ["none", "pending", "approved", "rejected"]).notNull().default("none"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at")
});

export const ideQuests = mysqlTable("ide_quests", {
  id: pk(),
  teacherUserId: fk("teacher_user_id").references(() => users.id, { onDelete: "cascade" }),
  classId: fk("class_id").references(() => classes.id, { onDelete: "cascade" }),
  materialId: optionalFk("material_id").references(() => materials.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  mission: text("mission").notNull(),
  points: int("points").notNull().default(100),
  dueDate: varchar("due_date", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("published"),
  bankStatus: mysqlEnum("bank_status", ["none", "pending", "approved", "rejected"]).notNull().default("none"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at")
});

export const studentMaterialProgress = mysqlTable(
  "student_material_progress",
  {
    id: pk(),
    studentUserId: fk("student_user_id").references(() => users.id, { onDelete: "cascade" }),
    materialId: fk("material_id").references(() => materials.id, { onDelete: "cascade" }),
    progress: int("progress").notNull().default(0),
    completedAt: optionalTs("completed_at"),
    updatedAt: ts("updated_at")
  },
  (table) => ({
    studentMaterialIdx: uniqueIndex("student_material_progress_student_material_idx").on(
      table.studentUserId,
      table.materialId
    )
  })
);

export const studentQuestProgress = mysqlTable(
  "student_quest_progress",
  {
    id: pk(),
    studentUserId: fk("student_user_id").references(() => users.id, { onDelete: "cascade" }),
    questId: fk("quest_id").references(() => ideQuests.id, { onDelete: "cascade" }),
    progress: int("progress").notNull().default(0),
    earnedPoints: int("earned_points").notNull().default(0),
    submissionText: text("submission_text"),
    submissionFileUrl: text("submission_file_url"),
    teacherFeedback: text("teacher_feedback"),
    completedAt: optionalTs("completed_at"),
    updatedAt: ts("updated_at")
  },
  (table) => ({
    studentQuestIdx: uniqueIndex("student_quest_progress_student_quest_idx").on(
      table.studentUserId,
      table.questId
    )
  })
);

export const teacherJournals = mysqlTable("teacher_journals", {
  id: pk(),
  teacherUserId: fk("teacher_user_id").references(() => users.id, { onDelete: "cascade" }),
  mood: varchar("mood", { length: 100 }),
  successReflection: text("success_reflection"),
  improvementReflection: text("improvement_reflection"),
  anecdote: text("anecdote"),
  todos: text("todos"),
  photoUrl: text("photo_url"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at")
});

export const bankRequests = mysqlTable("bank_requests", {
  id: pk(),
  requesterUserId: fk("requester_user_id").references(() => users.id, { onDelete: "cascade" }),
  ownerUserId: fk("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  targetClassId: fk("target_class_id").references(() => classes.id, { onDelete: "cascade" }),
  itemType: mysqlEnum("item_type", ["material", "quest"]).notNull(),
  itemId: fk("item_id"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at")
});

export const chatQuotas = mysqlTable("chat_quotas", {
  id: pk(),
  userId: fk("user_id").references(() => users.id, { onDelete: "cascade" }),
  messagesCount: int("messages_count").notNull().default(0),
  windowStartAt: ts("window_start_at"),
  updatedAt: ts("updated_at")
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

export const activityLogs = mysqlTable("activity_logs", {
  id: pk(),
  userId: fk("user_id").references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: optionalFk("resource_id"),
  details: text("details"),
  createdAt: ts("created_at")
});

export const globalAnnouncements = mysqlTable("global_announcements", {
  id: pk(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["info", "warning", "success"]).notNull().default("info"),
  isActive: boolean("is_active").notNull().default(true),
  authorUserId: fk("author_user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at")
});

export const masterSubjects = mysqlTable("master_subjects", {
  id: pk(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: ts("created_at")
});

export const masterGrades = mysqlTable("master_grades", {
  id: pk(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: ts("created_at")
});

export const systemSettings = mysqlTable("system_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: ts("updated_at")
});

export type RoleName = "admin" | "teacher" | "student" | "parent";
