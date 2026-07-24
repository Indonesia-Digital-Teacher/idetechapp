import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import {
  bankRequests,
  chatQuotas,
  aiGenerationQuotas,
  classes,
  classStudents,
  ideQuests,
  materials,
  parentStudents,
  permissions,
  rolePermissions,
  roles,
  studentMaterialProgress,
  studentQuestProgress,
  teacherJournals,
  userRoles,
  users,
  activityLogs,
  globalAnnouncements,
  masterSubjects,
  masterGrades,
  systemSettings,
  lessonPlans,
  blogs,
  coinTransactions,
  consultationThreads,
  consultationMessages,
  teacherTodos
} from "../db/schema";
import type { RoleName } from "../db/schema";
import { type AppEnv, authRequired, requirePermission, requireRole } from "../lib/auth";
import { writeActivityLog } from "../lib/activity";
import { findMaterial, formatMaterialAsMarkdownTable, generateFallbackRPP, scaleToActualMeetings, type ScaledMeeting } from "../lib/materials";
import type { Semester } from "../data/materials";
import { getChatQuotaConfig, getAiGenerationQuotaConfig, getGeneralSettings } from "../lib/settings";
import { getS3Config } from "../lib/storage";
import { dashboardCatalog, permissionCatalog, roleCatalog, studentQuestCatalog } from "../lib/catalog";
import authRoutes from "./auth";

const app = new Hono<AppEnv>();

// CYBRA may take more than a minute for long educational prompts. Keep this
// configurable while preventing an invalid environment value from disabling
// request cancellation altogether.
function getCybraTimeoutMs(): number {
  const configured = Number(process.env.CYBRA_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return 180_000;
  return Math.min(Math.max(configured, 45_000), 300_000);
}

// ─── Real-Time Chat Infrastructure (SSE) ─────────────────────────────────────
// threadId → Set of SSE response controllers
type SseController = { enqueue: (data: string) => void; close: () => void };
const sseClients = new Map<string, Set<SseController>>();

// userId → { threadId, lastSeen }
const onlinePresence = new Map<string, { threadId: string; lastSeen: number }>();

// threadId:userId → boolean (is typing)
const typingState = new Map<string, ReturnType<typeof setTimeout>>();
const teacherConsultationClients = new Map<string, Set<SseController>>();

function broadcastToThread(threadId: string, event: string, data: unknown) {
  const clients = sseClients.get(threadId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of clients) {
    try { ctrl.enqueue(payload); } catch { /* client disconnected */ }
  }
}

function broadcastToTeacher(teacherUserId: string, event: string, data: unknown) {
  const clients = teacherConsultationClients.get(teacherUserId);
  if (!clients || clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(payload);
    } catch {
      /* client disconnected */
    }
  }
}

function getOnlineUsersInThread(threadId: string): string[] {
  const now = Date.now();
  const result: string[] = [];
  for (const [userId, info] of onlinePresence.entries()) {
    if (info.threadId === threadId && now - info.lastSeen < 35000) {
      result.push(userId);
    }
  }
  return result;
}
// ─────────────────────────────────────────────────────────────────────────────

app.route("/auth", authRoutes);

// Telegram account linking endpoint (for bot integration)
app.post("/api/auth/telegram-link", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    telegramUserId: string;
    email: string;
  };

  const { telegramUserId, email } = body;

  if (!telegramUserId || !email) {
    return c.json({ message: "telegramUserId dan email wajib diisi." }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return c.json({ message: "Akun dengan email tersebut tidak ditemukan." }, 404);
  }

  if (user.status !== "active") {
    return c.json({ message: "Akun belum aktif atau sudah dinonaktifkan." }, 403);
  }

  // Generate session token
  const crypto = await import("node:crypto");
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  // Save session token to user
  await db
    .update(users)
    .set({
      sessionToken: token,
      sessionTokenCreatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return c.json({
    user: { id: user.id, email: user.email },
    token,
  });
});

app.get("/health", (c) => c.json({ status: "ok", app: "IdeTech", apiBase: "/api" }));

app.use("/dashboard", authRequired);
app.use("/dashboard/*", authRequired);
app.use("/roles", authRequired);
app.use("/roles/*", authRequired);
app.use("/profile", authRequired);
app.use("/schools/*", authRequired);
app.use("/admin/*", authRequired);
app.use("/teacher/*", authRequired);
app.use("/student/*", authRequired);
app.use("/parent/*", authRequired);

app.get("/dashboard", async (c) => {
  const user = c.get("authUser");
  const baseDashboard = dashboardCatalog[user.activeRole];
  const dashboard = JSON.parse(JSON.stringify(baseDashboard));

  if (user.activeRole === "admin") {
    const allUsers = await db.select().from(users);
    const pendingUsersCount = allUsers.filter((u) => u.status === "pending").length;

    const allClasses = await db.select().from(classes);
    const activeClassesCount = allClasses.filter((cls) => cls.status === "active").length;

    const allPermissions = await db.select().from(permissions);
    const permissionsCount = allPermissions.length;

    dashboard.metrics[0].value = pendingUsersCount.toString();
    dashboard.metrics[1].value = activeClassesCount.toString();
    dashboard.metrics[2].value = permissionsCount.toString();
  } else if (user.activeRole === "teacher") {
    const allRoles = await db.select().from(roles);
    const teacherRole = allRoles.find((r) => r.name === "teacher");
    const studentRole = allRoles.find((r) => r.name === "student");
    
    const allUserRoles = await db.select().from(userRoles);
    
    const studentsCount = allUserRoles.filter((ur) => ur.roleId === studentRole?.id).length;
    const teachersCount = allUserRoles.filter((ur) => ur.roleId === teacherRole?.id).length;
    
    const allClasses = await db.select().from(classes);
    const classesCount = allClasses.length;
    
    const allMaterials = await db.select().from(materials);
    const materialsCount = allMaterials.length;
    
    const allQuests = await db.select().from(ideQuests);
    const questsCount = allQuests.length;

    dashboard.metrics[0].value = studentsCount.toString();
    dashboard.metrics[1].value = teachersCount.toString();
    dashboard.metrics[2].value = classesCount.toString();
    dashboard.metrics[3].value = materialsCount.toString();
    dashboard.metrics[4].value = questsCount.toString();
  }

  const activeAnnouncements = await db.select().from(globalAnnouncements).where(eq(globalAnnouncements.isActive, true)).orderBy(desc(globalAnnouncements.createdAt));

  return c.json({ user, dashboard, announcements: activeAnnouncements });
});

app.get("/roles", async (c) => {
  const rows = await db.select().from(roles);
  return c.json({ roles: rows, catalog: roleCatalog });
});

app.get("/permissions", authRequired, async (c) => {
  const rows = await db.select().from(permissions);
  return c.json({ permissions: rows, catalog: permissionCatalog });
});

app.patch("/profile", async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    fullName?: string;
    schoolName?: string;
    contactChannel?: "wa" | "telegram";
    contactValue?: string;
  };

  const fullName = body.fullName?.trim() ?? "";
  const schoolName = body.schoolName?.trim() ?? "";
  const contactChannel = body.contactChannel;
  const contactValue = body.contactValue?.trim() ?? "";

  if (fullName.length < 3) return c.json({ message: "Nama lengkap minimal 3 karakter." }, 400);
  if (fullName.length > 100) return c.json({ message: "Nama lengkap maksimal 100 karakter." }, 400);
  if (!/^[a-zA-Z\s.'’`]+$/.test(fullName)) {
    return c.json({ message: "Nama lengkap hanya boleh mengandung huruf, spasi, titik, atau tanda petik." }, 400);
  }
  if (schoolName.length < 3) return c.json({ message: "Nama sekolah wajib dipilih." }, 400);
  if (schoolName.length > 150) return c.json({ message: "Nama sekolah maksimal 150 karakter." }, 400);
  if (contactChannel !== "wa" && contactChannel !== "telegram") return c.json({ message: "Pilih kontak WA atau Telegram." }, 400);
  if (contactValue.length > 50) return c.json({ message: "Kontak maksimal 50 karakter." }, 400);
  if (contactChannel === "wa" && !/^[0-9+][0-9\s-]{7,18}$/.test(contactValue)) return c.json({ message: "Nomor WA tidak valid." }, 400);
  if (contactChannel === "telegram" && !/^@?[a-zA-Z0-9_]{5,32}$/.test(contactValue)) return c.json({ message: "Username Telegram tidak valid." }, 400);

  await db
    .update(users)
    .set({
      fullName,
      schoolName,
      contactChannel,
      contactValue: contactChannel === "telegram" && !contactValue.startsWith("@") ? `@${contactValue}` : contactValue,
      profileCompleted: true,
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  return c.json({ ok: true });
});

app.get("/schools/search", async (c) => {
  const query = c.req.query("q")?.trim() ?? "";
  if (query.length < 2) return c.json({ schools: [] });

  try {
    const variants = buildSchoolQueryVariants(query);
    const payloads = await Promise.all(
      variants.map(async (variant) => {
        try {
          const response = await fetch(`https://api-sekolah-indonesia.vercel.app/sekolah/s?sekolah=${encodeURIComponent(variant)}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/json"
            }
          });
          if (!response.ok) return null;
          return (await response.json()) as unknown;
        } catch (err) {
          console.error("Error fetching school variant:", variant, err);
          return null;
        }
      })
    );

    return c.json({ schools: normalizeSchoolPayload(payloads, query) });
  } catch (error) {
    console.error("School search general error:", error);
    return c.json({ schools: [] });
  }
});

app.get("/admin/users", requireRole(["admin"]), requirePermission("user.manage"), async (c) => {
  const rows = await db.select().from(users);
  const enriched = await Promise.all(
    rows.map(async (user) => {
      const roleRows = await db
        .select({ name: roles.name, label: roles.label })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));

      return { ...user, roles: roleRows };
    })
  );

  return c.json({ users: enriched });
});

app.patch("/admin/users/:id/verify", requireRole(["admin"]), requirePermission("user.manage"), async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ message: "User id wajib diisi." }, 400);

  const body = (await c.req.json().catch(() => ({}))) as { status?: "active" | "pending" | "suspended"; roles?: RoleName[] };
  const status = body.status ?? "active";
  const authUser = c.get("authUser");

  if (authUser.id === id && status !== "active") {
    return c.json({ message: "Admin aktif tidak bisa menonaktifkan akunnya sendiri." }, 400);
  }

  if (authUser.id === id && body.roles && !body.roles.includes("admin")) {
    return c.json({ message: "Admin aktif tidak bisa mencabut role admin miliknya sendiri." }, 400);
  }

  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id));

  if (body.roles) {
    const selectedRoles = await db.select().from(roles);
    await db.delete(userRoles).where(eq(userRoles.userId, id));

    for (const roleName of body.roles) {
      const role = selectedRoles.find((item) => item.name === roleName);
      if (!role) continue;

      await db
        .insert(userRoles)
        .ignore()
        .values({
          id: `ur_${crypto.randomUUID()}`,
          userId: id,
          roleId: role.id,
          createdAt: new Date()
        });
    }
  }

  return c.json({ ok: true });
});

app.delete("/admin/users/:id", requireRole(["admin"]), requirePermission("user.manage"), async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ message: "User id wajib diisi." }, 400);

  const authUser = c.get("authUser");
  if (authUser.id === id) {
    return c.json({ message: "Admin aktif tidak bisa menghapus akunnya sendiri." }, 400);
  }

  await db.delete(users).where(eq(users.id, id));

  await writeActivityLog({
    userId: authUser.id,
    action: "delete",
    resourceType: "user",
    resourceId: id
  });

  return c.json({ ok: true });
});

app.get("/admin/access", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  try {
  const [allUsers, allRoles, allPermissions, allRolePermissions] = await Promise.all([
    db.select().from(users),
    db.select().from(roles),
    db.select().from(permissions),
    db
      .select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
  ]);

  const rolePermissionMap = allRoles.map((role) => ({
    ...role,
    permissions: allRolePermissions
      .filter((item) => item.roleId === role.id)
      .map((item) => allPermissions.find((permission) => permission.id === item.permissionId)?.name)
      .filter(Boolean)
  }));

  return c.json({
    roles: rolePermissionMap,
    permissions: allPermissions,
    system: {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((user) => user.status === "active").length,
      pendingUsers: allUsers.filter((user) => user.status === "pending").length,
      suspendedUsers: allUsers.filter((user) => user.status === "suspended").length,
      totalRoles: allRoles.length,
      totalPermissions: allPermissions.length,
      database: process.env.DATABASE_URL ?? "idetech.sqlite",
      authProvider: "Google OAuth",
      apiBase: "/api"
    }
  });
  } catch (err) {
    console.error("[admin/access] Gagal memuat ringkasan akses sistem:", err);
    throw err;
  }
});

app.patch("/admin/roles/:name/permissions", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const roleName = c.req.param("name") as RoleName;
  const body = (await c.req.json().catch(() => ({}))) as { permissions?: string[] };
  const permissionNames = body.permissions ?? [];

  const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
  if (!role) return c.json({ message: "Role tidak ditemukan." }, 404);

  const selectedPermissions = await db.select().from(permissions);
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

  for (const permissionName of permissionNames) {
    const permission = selectedPermissions.find((item) => item.name === permissionName);
    if (!permission) continue;

    await db.insert(rolePermissions).values({
      id: `rp_${crypto.randomUUID()}`,
      roleId: role.id,
      permissionId: permission.id,
      createdAt: new Date()
    });
  }

  return c.json({ ok: true });
});

app.get("/admin/settings", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const rows = await db.select().from(systemSettings);
  return c.json({ settings: rows });
});

app.patch("/admin/settings", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { key: string; value: string };
  if (!body.key || !body.value) return c.json({ message: "Key dan Value wajib diisi." }, 400);

  if (body.key === "google.role_rule") {
    try {
      JSON.parse(body.value);
    } catch {
      return c.json({ message: "Format JSON tidak valid." }, 400);
    }
  }

  await db
    .insert(systemSettings)
    .values({
      key: body.key,
      value: body.value,
      description: "Diperbarui dari dashboard",
      updatedAt: new Date()
    })
    .onDuplicateKeyUpdate({
      set: {
        value: body.value,
        updatedAt: new Date()
      }
    });

  return c.json({ ok: true });
});

app.get("/admin/classes", requireRole(["admin"]), requirePermission("class.manage"), async (c) => {
  const [classRows, userRows] = await Promise.all([
    db.select().from(classes).orderBy(desc(classes.updatedAt)),
    db.select().from(users)
  ]);

  return c.json({
    classes: classRows.map((item) => {
      const teacher = userRows.find((user) => user.id === item.teacherUserId);
      return {
        ...item,
        teacherName: teacher?.fullName ?? teacher?.name ?? "Guru",
        teacherEmail: teacher?.email ?? "-"
      };
    })
  });
});

app.post("/admin/classes", requireRole(["admin"]), requirePermission("class.manage"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    teacherUserId?: string;
    name?: string;
    subject?: string;
    grade?: string;
    students?: number;
    status?: "active" | "draft" | "archived";
  };

  const name = body.name?.trim();
  const subject = body.subject?.trim();
  const grade = body.grade?.trim();
  const teacherUserId = body.teacherUserId?.trim() || user.id;

  if (!name || !subject || !grade) {
    return c.json({ message: "Nama kelas, mapel, dan jenjang wajib diisi." }, 400);
  }

  const [teacher] = await db.select().from(users).where(eq(users.id, teacherUserId)).limit(1);
  if (!teacher) return c.json({ message: "Guru tidak ditemukan." }, 404);

  const now = new Date();
  const classCode = await generateClassCode();
  const classId = `cls_${crypto.randomUUID()}`;
  await db
    .insert(classes)
    .values({
      id: classId,
      classCode,
      teacherUserId,
      name,
      subject,
      grade,
      students: Math.max(0, Number(body.students ?? 0)),
      progress: 0,
      nextSession: classCode,
      status: body.status ?? "active",
      createdAt: now,
      updatedAt: now
    });

  const [created] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "class",
    resourceId: classId,
    details: { name, subject, grade, teacherUserId }
  });

  return c.json({ class: created }, 201);
});

app.patch("/admin/classes/:id", requireRole(["admin"]), requirePermission("class.manage"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID kelas wajib diisi." }, 400);
  const body = (await c.req.json().catch(() => ({}))) as {
    teacherUserId?: string;
    name?: string;
    subject?: string;
    grade?: string;
    students?: number;
    progress?: number;
    status?: "active" | "draft" | "archived";
  };

  const [targetClass] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  if (!targetClass) return c.json({ message: "Kelas tidak ditemukan." }, 404);

  if (body.teacherUserId) {
    const [teacher] = await db.select().from(users).where(eq(users.id, body.teacherUserId)).limit(1);
    if (!teacher) return c.json({ message: "Guru tidak ditemukan." }, 404);
  }

  await db
    .update(classes)
    .set({
      teacherUserId: body.teacherUserId ?? targetClass.teacherUserId,
      name: body.name?.trim() || targetClass.name,
      subject: body.subject?.trim() || targetClass.subject,
      grade: body.grade?.trim() || targetClass.grade,
      students: body.students === undefined ? targetClass.students : Math.max(0, Number(body.students)),
      progress: body.progress === undefined ? targetClass.progress : Math.max(0, Math.min(100, Number(body.progress))),
      status: body.status ?? targetClass.status,
      updatedAt: new Date()
    })
    .where(eq(classes.id, id));

  const [updated] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "update",
    resourceType: "class",
    resourceId: id,
    details: { name: body.name, subject: body.subject, grade: body.grade, status: body.status }
  });

  return c.json({ class: updated });
});

app.delete("/admin/classes/:id", requireRole(["admin"]), requirePermission("class.manage"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID kelas wajib diisi." }, 400);
  const [targetClass] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  if (!targetClass) return c.json({ message: "Kelas tidak ditemukan." }, 404);

  await db.delete(classes).where(eq(classes.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "delete",
    resourceType: "class",
    resourceId: id
  });

  return c.json({ ok: true });
});

// --- ADVANCED FEATURES ENDPOINTS ---

app.get("/admin/announcements", requireRole(["admin"]), async (c) => {
  const rows = await db.select().from(globalAnnouncements).orderBy(desc(globalAnnouncements.createdAt));
  const userRows = await db.select().from(users);
  
  const enriched = rows.map((item) => {
    const author = userRows.find((u) => u.id === item.authorUserId);
    return {
      ...item,
      authorName: author?.name || "System"
    };
  });
  return c.json({ announcements: enriched });
});

app.post("/admin/announcements", requireRole(["admin"]), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as any;
  
  if (!body.title || !body.content) {
    return c.json({ message: "Judul dan konten wajib diisi." }, 400);
  }
  
  const id = `ann_${crypto.randomUUID()}`;
  const now = new Date();
  await db.insert(globalAnnouncements).values({
    id,
    title: body.title,
    content: body.content,
    type: body.type || "info",
    isActive: body.isActive !== undefined ? body.isActive : true,
    authorUserId: user.id,
    createdAt: now,
    updatedAt: now
  });
  
  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "announcement",
    resourceId: id,
    details: { title: body.title }
  });
  
  const [created] = await db.select().from(globalAnnouncements).where(eq(globalAnnouncements.id, id));
  return c.json({ announcement: created }, 201);
});

app.delete("/admin/announcements/:id", requireRole(["admin"]), async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID wajib disertakan" }, 400);
  await db.delete(globalAnnouncements).where(eq(globalAnnouncements.id, id));
  return c.json({ ok: true });
});

// --- AI GENERATION QUOTAS HELPERS ---

async function getAiQuotaStatus(userId: string, email: string) {
  const now = new Date();
  const windowMs = 3 * 60 * 60 * 1000; // 3 hours

  const [dbUser] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userCreatedAt = dbUser?.createdAt ?? new Date();
  const isFirst24Hours = now.getTime() - userCreatedAt.getTime() < 24 * 60 * 60 * 1000;

  const { defaultLimit, overrides } = await getAiGenerationQuotaConfig();
  const limit = isFirst24Hours 
    ? 3 
    : (overrides[email] !== undefined ? overrides[email] : defaultLimit);

  const [quota] = await db.select().from(aiGenerationQuotas).where(eq(aiGenerationQuotas.userId, userId)).limit(1);

  let used = 0;
  let resetAt = new Date(now.getTime() + windowMs).toISOString();

  if (quota) {
    const isExpired = now.getTime() - quota.lastResetAt.getTime() > windowMs;
    if (!isExpired) {
      used = quota.generationsCount;
      resetAt = new Date(quota.lastResetAt.getTime() + windowMs).toISOString();
    }
  }

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt
  };
}

async function checkAndConsumeAiQuota(userId: string, email: string): Promise<{ allowed: boolean; message?: string }> {
  const now = new Date();
  const windowMs = 3 * 60 * 60 * 1000; // 3 hours
  const status = await getAiQuotaStatus(userId, email);
  const generalSettings = await getGeneralSettings();
  const adminContactWa = generalSettings.adminContactWa || "6281234567890";

  if (status.remaining <= 0) {
    const nextReset = new Date(status.resetAt);
    const diffMs = nextReset.getTime() - now.getTime();
    const hoursLeft = Math.max(0.1, diffMs / (60 * 60 * 1000));
    const nextResetMsg = hoursLeft >= 1 
      ? `dalam ${Math.ceil(hoursLeft)} jam` 
      : `dalam ${Math.ceil(hoursLeft * 60)} menit`;
    return {
      allowed: false,
      message: `Kuota untuk Generate AI (RPP/Materi/Quest/Program Semester) sudah habis. Maksimal ${status.limit} kali per 3 jam. Silakan coba lagi ${nextResetMsg}. Hubungi Admin jika ingin mendapatkan kuota tambahan (berbayar): https://wa.me/${adminContactWa}?text=Halo%20Admin%20IdeTech%2C%20saya%20ingin%20membeli%20tambahan%20kuota%20AI%20Generator.`
    };
  }

  const [quota] = await db.select().from(aiGenerationQuotas).where(eq(aiGenerationQuotas.userId, userId)).limit(1);

  if (!quota) {
    await db.insert(aiGenerationQuotas).values({
      id: `aig_${nanoid(12)}`,
      userId: userId,
      generationsCount: 1,
      lastResetAt: now,
      updatedAt: now
    });
  } else {
    const isExpired = now.getTime() - quota.lastResetAt.getTime() > windowMs;
    if (isExpired) {
      await db.update(aiGenerationQuotas).set({
        generationsCount: 1,
        lastResetAt: now,
        updatedAt: now
      }).where(eq(aiGenerationQuotas.id, quota.id));
    } else {
      await db.update(aiGenerationQuotas).set({
        generationsCount: quota.generationsCount + 1,
        updatedAt: now
      }).where(eq(aiGenerationQuotas.id, quota.id));
    }
  }

  return { allowed: true };
}

// --- WELCOME QUOTES ENDPOINTS ---

// Public: fetch active quotes per role (called on client after login)
app.get("/welcome-quotes", authRequired, async (c) => {
  const user = c.get("authUser");
  const { getWelcomeQuotesConfig } = await import("../lib/settings");
  const config = await getWelcomeQuotesConfig();

  let aiQuota = null;

  if (user.activeRole === "teacher" || user.activeRole === "admin") {
    aiQuota = await getAiQuotaStatus(user.id, user.email);
  }

  return c.json({ quotes: config.quotes, aiQuota });
});

// Admin: get all quotes (including inactive)
app.get("/admin/welcome-quotes", requireRole(["admin"]), async (c) => {
  const { getWelcomeQuotesConfig } = await import("../lib/settings");
  const config = await getWelcomeQuotesConfig();
  return c.json({ quotes: config.quotes });
});

// Admin: add a new quote
app.post("/admin/welcome-quotes", requireRole(["admin"]), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    text?: string;
    author?: string;
    roles?: string[];
  };
  if (!body.text?.trim()) return c.json({ message: "Teks kutipan wajib diisi." }, 400);
  if (!body.roles?.length) return c.json({ message: "Minimal satu role wajib dipilih." }, 400);

  const { getWelcomeQuotesConfig, setSystemSetting } = await import("../lib/settings");
  const config = await getWelcomeQuotesConfig();
  const newQuote = {
    id: `wq_${nanoid(8)}`,
    text: body.text.trim(),
    author: body.author?.trim() || undefined,
    roles: body.roles as ("teacher" | "student" | "parent")[],
    isActive: true
  };
  config.quotes.push(newQuote);
  await setSystemSetting("welcome.quotes_config", config, "Konfigurasi quotes selamat datang per role.");
  return c.json({ quote: newQuote }, 201);
});

// Admin: toggle active/inactive
app.patch("/admin/welcome-quotes/:id", requireRole(["admin"]), async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { isActive?: boolean; text?: string; author?: string; roles?: string[] };

  const { getWelcomeQuotesConfig, setSystemSetting } = await import("../lib/settings");
  const config = await getWelcomeQuotesConfig();
  const idx = config.quotes.findIndex((q) => q.id === id);
  if (idx === -1) return c.json({ message: "Quote tidak ditemukan." }, 404);

  if (body.isActive !== undefined) config.quotes[idx].isActive = body.isActive;
  if (body.text !== undefined) config.quotes[idx].text = body.text.trim();
  if (body.author !== undefined) config.quotes[idx].author = body.author.trim() || undefined;
  if (body.roles !== undefined) config.quotes[idx].roles = body.roles as ("teacher" | "student" | "parent")[];

  await setSystemSetting("welcome.quotes_config", config, "Konfigurasi quotes selamat datang per role.");
  return c.json({ quote: config.quotes[idx] });
});

// Admin: delete a quote
app.delete("/admin/welcome-quotes/:id", requireRole(["admin"]), async (c) => {
  const id = c.req.param("id");
  const { getWelcomeQuotesConfig, setSystemSetting } = await import("../lib/settings");
  const config = await getWelcomeQuotesConfig();
  const before = config.quotes.length;
  config.quotes = config.quotes.filter((q) => q.id !== id);
  if (config.quotes.length === before) return c.json({ message: "Quote tidak ditemukan." }, 404);
  await setSystemSetting("welcome.quotes_config", config, "Konfigurasi quotes selamat datang per role.");
  return c.json({ ok: true });
});

app.get("/admin/master", requireRole(["admin"]), async (c) => {
  const [subjects, grades] = await Promise.all([
    db.select().from(masterSubjects).orderBy(desc(masterSubjects.createdAt)),
    db.select().from(masterGrades).orderBy(desc(masterGrades.createdAt))
  ]);
  return c.json({ subjects, grades });
});

app.post("/admin/master/subjects", requireRole(["admin"]), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as any;
  if (!body.name) return c.json({ message: "Nama mata pelajaran wajib diisi." }, 400);
  
  const id = `ms_${crypto.randomUUID()}`;
  await db.insert(masterSubjects).values({
    id,
    name: body.name,
    description: body.description || "",
    createdAt: new Date()
  });
  
  return c.json({ ok: true }, 201);
});

app.post("/admin/master/grades", requireRole(["admin"]), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as any;
  if (!body.name) return c.json({ message: "Nama tingkatan kelas wajib diisi." }, 400);
  
  const id = `mg_${crypto.randomUUID()}`;
  await db.insert(masterGrades).values({
    id,
    name: body.name,
    description: body.description || "",
    createdAt: new Date()
  });
  
  return c.json({ ok: true }, 201);
});

app.delete("/admin/master/:type/:id", requireRole(["admin"]), async (c) => {
  const { type, id } = c.req.param();
  if (type === "subjects") {
    await db.delete(masterSubjects).where(eq(masterSubjects.id, id));
  } else if (type === "grades") {
    await db.delete(masterGrades).where(eq(masterGrades.id, id));
  }
  return c.json({ ok: true });
});

app.get("/admin/logs", requireRole(["admin"]), async (c) => {
  const search = c.req.query("search")?.trim() || "";
  const actionFilter = c.req.query("action")?.trim() || "";
  const resourceFilter = c.req.query("resourceType")?.trim() || "";
  const fromDate = c.req.query("from")?.trim() || "";
  const toDate = c.req.query("to")?.trim() || "";
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
  const limit = 15;
  const offset = (page - 1) * limit;

  const userRows = await db.select().from(users);
  const userById = new Map(userRows.map(u => [u.id, u]));

  let matchedUserIds: string[] | null = null;
  if (search) {
    const lower = search.toLowerCase();
    matchedUserIds = userRows
      .filter(u => (u.name || "").toLowerCase().includes(lower) || (u.email || "").toLowerCase().includes(lower))
      .map(u => u.id);
  }

  const conditions = [];
  if (actionFilter) conditions.push(eq(activityLogs.action, actionFilter));
  if (resourceFilter) conditions.push(eq(activityLogs.resourceType, resourceFilter));
  if (fromDate) conditions.push(gte(activityLogs.createdAt, new Date(fromDate)));
  if (toDate) conditions.push(lte(activityLogs.createdAt, new Date(toDate + "T23:59:59.999Z")));
  if (search) {
    const likeSearch = `%${search}%`;
    const orParts = [
      like(activityLogs.action, likeSearch),
      like(activityLogs.resourceType, likeSearch),
      like(activityLogs.details, likeSearch),
      like(activityLogs.resourceId, likeSearch)
    ];
    if (matchedUserIds && matchedUserIds.length > 0) {
      orParts.push(inArray(activityLogs.userId, matchedUserIds));
    }
    conditions.push(or(...orParts));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(activityLogs).where(whereClause);
  const total = Number(countRow?.count || 0);

  const rows = await db.select().from(activityLogs)
    .where(whereClause)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const enriched = rows.map((item) => {
    const user = userById.get(item.userId);
    return {
      ...item,
      userName: user?.name || "Unknown",
      userEmail: user?.email || "-"
    };
  });

  return c.json({
    logs: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});


app.get("/teacher/search-students", requireRole(["teacher", "admin"]), async (c) => {
  const q = c.req.query("q") || "";
  if (!q || q.length < 2) {
    return c.json({ students: [] });
  }

  const searchResults = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl
    })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(roles.name, "student"),
        or(like(users.name, `%${q}%`), like(users.email, `%${q}%`))
      )
    )
    .limit(10);

  return c.json({ students: searchResults });
});

app.get("/teacher/classes", requireRole(["teacher", "admin"]), requirePermission("class.manage"), async (c) => {
  const user = c.get("authUser");
  const rows =
    user.activeRole === "admin"
      ? await db.select().from(classes).orderBy(desc(classes.updatedAt))
      : await db.select().from(classes).where(eq(classes.teacherUserId, user.id)).orderBy(desc(classes.updatedAt));

  const totalStudents = rows.reduce((total, item) => total + item.students, 0);
  const averageProgress = rows.length
    ? Math.round(rows.reduce((total, item) => total + item.progress, 0) / rows.length)
    : 0;

  return c.json({
    classes: rows,
    summary: {
      totalClasses: rows.length,
      totalStudents,
      averageProgress
    }
  });
});

app.post("/teacher/classes", requireRole(["teacher", "admin"]), requirePermission("class.manage"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string;
    subject?: string;
    grade?: string;
    students?: number;
  };

  const name = body.name?.trim();
  const subject = body.subject?.trim();
  const grade = body.grade?.trim();

  if (!name || !subject || !grade) {
    return c.json({ message: "Nama kelas, mapel, dan jenjang wajib diisi." }, 400);
  }

  const now = new Date();
  const classCode = await generateClassCode();
  const classId = `cls_${crypto.randomUUID()}`;
  await db
    .insert(classes)
    .values({
      id: classId,
      classCode,
      teacherUserId: user.id,
      name,
      subject,
      grade,
      students: Math.max(0, Number(body.students ?? 0)),
      progress: 0,
      nextSession: classCode,
      status: "active",
      createdAt: now,
      updatedAt: now
    });

  const [created] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "class",
    resourceId: classId,
    details: { name, subject, grade, teacherUserId: user.id }
  });

  return c.json({ class: created }, 201);
});

app.patch("/teacher/classes/:id", requireRole(["teacher", "admin"]), requirePermission("class.manage"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID kelas wajib diisi." }, 400);

  const body = (await c.req.json().catch(() => ({}))) as {
    unlockedLevel?: number;
  };

  const [targetClass] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  if (!targetClass || (user.activeRole !== "admin" && targetClass.teacherUserId !== user.id)) {
    return c.json({ message: "Kelas tidak ditemukan atau bukan milik guru aktif." }, 404);
  }

  if (body.unlockedLevel !== undefined) {
    const level = Math.max(1, Number(body.unlockedLevel));
    await db
      .update(classes)
      .set({
        unlockedLevel: level,
        updatedAt: new Date()
      })
      .where(eq(classes.id, id));
  }

  const [updated] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);

  return c.json({ class: updated });
});

app.delete("/teacher/classes/:classId/students/:studentId", requireRole(["teacher", "admin"]), requirePermission("class.manage"), async (c) => {
  const user = c.get("authUser");
  const classId = c.req.param("classId");
  const studentId = c.req.param("studentId");

  if (!classId || !studentId) {
    return c.json({ message: "Parameter tidak lengkap." }, 400);
  }

  const [targetClass] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!targetClass) {
    return c.json({ message: "Kelas tidak ditemukan." }, 404);
  }
  if (user.activeRole !== "admin" && targetClass.teacherUserId !== user.id) {
    return c.json({ message: "Anda tidak memiliki akses ke kelas ini." }, 403);
  }

  await db.delete(classStudents)
    .where(
      and(
        eq(classStudents.classId, classId),
        eq(classStudents.studentUserId, studentId)
      )
    );

  await writeActivityLog({
    userId: user.id,
    action: "remove_student",
    resourceType: "class_student",
    resourceId: `${classId}_${studentId}`,
    details: { classId, studentId }
  });

  return c.json({ ok: true });
});

// ─── Teacher To-Do List ───────────────────────────────────────────────────────

app.get("/teacher/todos", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const rows = await db
    .select()
    .from(teacherTodos)
    .where(eq(teacherTodos.userId, user.id))
    .orderBy(desc(teacherTodos.createdAt));
  return c.json({ todos: rows });
});

function parseTeacherTodoDueDate(input: unknown): Date | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializeTeacherTodo(todo: {
  id: string;
  userId: string;
  classId: string | null;
  category: string | null;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  isCompleted: boolean;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...todo,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString()
  };
}

app.post("/teacher/todos", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const body = await c.req.json<{ 
    title: string; 
    description?: string; 
    priority?: "high" | "medium" | "low"; 
    dueDate?: string;
    classId?: string;
    category?: string;
  }>();

  if (!body.title?.trim()) {
    return c.json({ message: "Judul tugas wajib diisi." }, 400);
  }

  const dueDate = parseTeacherTodoDueDate(body.dueDate);
  if (body.dueDate && dueDate === null) {
    return c.json({ message: "Format tenggat tugas tidak valid." }, 400);
  }

  const todoTitleForLog = body.title.trim();

  try {
    const now = new Date();
    const id = nanoid();
    const todo = {
      id,
      userId: user.id,
      classId: body.classId || null,
      category: body.category?.trim() || null,
      title: todoTitleForLog,
      description: body.description?.trim() || null,
      priority: body.priority ?? "medium",
      isCompleted: false,
      dueDate,
      createdAt: now,
      updatedAt: now
    };

    await db.insert(teacherTodos).values(todo);
    return c.json({ todo: serializeTeacherTodo(todo) }, 201);
  } catch (error) {
    console.error("Failed to create teacher todo:", error);
    const detail = error instanceof Error ? error.message : String(error);
    await writeActivityLog({
      userId: user.id,
      action: "create_error",
      resourceType: "teacher_todo",
      details: { error: detail, todoTitle: todoTitleForLog }
    }).catch(() => {});
    const message =
      process.env.NODE_ENV === "production"
        ? "Gagal menyimpan tugas. Coba ulangi beberapa saat lagi."
        : `Gagal menyimpan tugas: ${detail}`;
    return c.json({ message }, 500);
  }
});

app.patch("/teacher/todos/:id", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID tidak valid." }, 400);
  const body = await c.req.json<{ 
    title?: string; 
    description?: string; 
    priority?: "high" | "medium" | "low"; 
    isCompleted?: boolean; 
    dueDate?: string | null;
    classId?: string | null;
    category?: string | null;
  }>();

  const [existing] = await db.select().from(teacherTodos).where(and(eq(teacherTodos.id, id), eq(teacherTodos.userId, user.id))).limit(1);
  if (!existing) return c.json({ message: "Tugas tidak ditemukan." }, 404);

  const updates: Partial<typeof teacherTodos.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.isCompleted !== undefined) updates.isCompleted = body.isCompleted;
  if (body.classId !== undefined) updates.classId = body.classId || null;
  if (body.category !== undefined) updates.category = body.category || null;
  if ("dueDate" in body) {
    if (body.dueDate === null) {
      updates.dueDate = null;
    } else {
      const dueDate = parseTeacherTodoDueDate(body.dueDate);
      if (body.dueDate && dueDate === null) {
        return c.json({ message: "Format tenggat tugas tidak valid." }, 400);
      }
      updates.dueDate = dueDate;
    }
  }

  try {
    await db.update(teacherTodos).set(updates).where(eq(teacherTodos.id, id));
    return c.json({
      todo: {
        ...existing,
        ...updates,
        updatedAt: (updates.updatedAt ?? new Date()).toISOString(),
        createdAt: existing.createdAt.toISOString(),
        dueDate: updates.dueDate ? updates.dueDate.toISOString() : updates.dueDate === null ? null : existing.dueDate ? existing.dueDate.toISOString() : null,
        classId: updates.classId !== undefined ? updates.classId : existing.classId,
        category: updates.category !== undefined ? updates.category : existing.category
      }
    });
  } catch (error) {
    console.error("Failed to update teacher todo:", error);
    const detail = error instanceof Error ? error.message : String(error);
    await writeActivityLog({
      userId: user.id,
      action: "update_error",
      resourceType: "teacher_todo",
      resourceId: id || null,
      details: { error: detail }
    }).catch(() => {});
    const message =
      process.env.NODE_ENV === "production"
        ? "Gagal memperbarui tugas. Coba ulangi beberapa saat lagi."
        : `Gagal memperbarui tugas: ${detail}`;
    return c.json({ message }, 500);
  }
});

app.delete("/teacher/todos/:id", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID tidak valid." }, 400);

  const [existing] = await db.select().from(teacherTodos).where(and(eq(teacherTodos.id, id), eq(teacherTodos.userId, user.id))).limit(1);
  if (!existing) return c.json({ message: "Tugas tidak ditemukan." }, 404);

  await db.delete(teacherTodos).where(eq(teacherTodos.id, id));
  return c.json({ ok: true });
});

app.post("/teacher/todos/suggest", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");

  try {
    const teacherClasses = await db
      .select()
      .from(classes)
      .where(eq(classes.teacherUserId, user.id));

    const teacherMaterials = await db
      .select()
      .from(materials)
      .where(eq(materials.teacherUserId, user.id))
      .orderBy(desc(materials.createdAt))
      .limit(5);

    if (teacherClasses.length === 0) {
      const fallback = [
        {
          title: "Buat Kelas Baru",
          description: "Buat kelas baru untuk memulai pembelajaran dan menambahkan murid.",
          priority: "high",
          category: "teaching",
          classId: null
        },
        {
          title: "Periksa Progres Siswa di Radar Pintar",
          description: "Buka menu Radar Pintar untuk mendeteksi siswa yang mengalami perlambatan belajar.",
          priority: "high",
          category: "grading",
          classId: null
        },
        {
          title: "Unggah Materi di IdeStudio",
          description: "Tambahkan materi bacaan baru atau kuis tantangan di kelas untuk meningkatkan engagement siswa.",
          priority: "medium",
          category: "teaching",
          classId: null
        }
      ];
      return c.json({ suggestions: fallback });
    }

    const cybraUrl = process.env.CYBRA_API_URL || "https://asisten.ferilee.gurumuda.eu.org";
    const prompt = `Anda adalah Asisten AI pendidik untuk platform IdeTech.
Tugas Anda adalah menganalisis profil dan data guru berikut ini, lalu memberikan 3 sampai 5 saran tugas (To-Do List) yang sangat relevan, spesifik, dan siap aksi untuk guru ini.

Data Guru:
- Daftar Kelas Aktif: ${JSON.stringify(teacherClasses.map(c => ({ id: c.id, nama: c.name, mapel: c.subject, grade: c.grade, jumlahSiswa: c.students })))}
- Materi Terbaru di IdeStudio: ${JSON.stringify(teacherMaterials.map(m => ({ judul: m.title, tipe: m.type })))}

Tugas yang disarankan harus bervariasi, misalnya:
- Administrasi pembelajaran (membuat atau meninjau RPP untuk kelas/materi tertentu).
- Aktivitas mengajar (menyiapkan media ajar/konten interaktif di IdeStudio).
- Penilaian/Grading (menilai tugas/kuis atau memberikan feedback).
- Lainnya (seperti menjadwalkan konsolidasi dengan orang tua).

Pastikan Anda menyertakan ID kelas yang sesuai dari daftar kelas aktif jika tugas tersebut spesifik untuk kelas tertentu.

Format keluaran HARUS berupa array JSON murni, jangan sertakan tag pembungkus markdown seperti \`\`\`json di awal/akhir respons, langsung saja berikan array objek JSON dengan struktur persis seperti contoh berikut:
[
  {
    "title": "Buat materi interaktif Trigonometri",
    "description": "Siapkan slide dan video penjelasan trigonometri untuk diunggah di IdeStudio kelas Matematika 10A.",
    "priority": "high",
    "category": "teaching",
    "classId": "id-kelas-matematika-10a"
  }
]

Ingat: hanya kembalikan array JSON murni saja agar bisa diparse dengan JSON.parse!`;

    const aiRes = await fetch(`${cybraUrl}/api/integration/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, history: [] }),
      signal: AbortSignal.timeout(getCybraTimeoutMs())
    });

    if (!aiRes.ok) {
      throw new Error(`AI Service returned status ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let suggestions = [];
    if (aiData.reply) {
      let replyText = aiData.reply.trim();
      if (replyText.startsWith("```")) {
        replyText = replyText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      suggestions = JSON.parse(replyText);
    }

    return c.json({ suggestions });
  } catch (error) {
    console.error("Failed to suggest teacher todos:", error);
    await writeActivityLog({
      userId: user.id,
      action: "ai_error",
      resourceType: "teacher_todos_suggest",
      details: { error: String(error), message: error instanceof Error ? error.message : "Unknown error" }
    }).catch(() => {});
    const fallback = [
      {
        title: "Tinjau RPP Mingguan",
        description: "Evaluasi dan sesuaikan modul ajar / RPP untuk kelas yang akan berlangsung minggu ini.",
        priority: "medium",
        category: "rpp",
        classId: null
      },
      {
        title: "Periksa Progres Siswa di Radar Pintar",
        description: "Buka menu Radar Pintar untuk mendeteksi siswa yang mengalami perlambatan belajar.",
        priority: "high",
        category: "grading",
        classId: null
      },
      {
        title: "Unggah Materi di IdeStudio",
        description: "Tambahkan materi bacaan baru atau kuis tantangan di kelas untuk meningkatkan engagement siswa.",
        priority: "medium",
        category: "teaching",
        classId: null
      }
    ];
    return c.json({ suggestions: fallback });
  }
});

function getSmartFallbackMeetings(capaianPembelajaran: string, totalCount: number) {
  const cpLower = capaianPembelajaran.toLowerCase();
  
  const isMath = cpLower.includes("eksponen") || 
                 cpLower.includes("akar") || 
                 cpLower.includes("barisan") || 
                 cpLower.includes("deret") || 
                 cpLower.includes("aljabar") || 
                 cpLower.includes("matematika") || 
                 cpLower.includes("fungsi") || 
                 cpLower.includes("persamaan linear") || 
                 cpLower.includes("kuadrat");
                 
  if (isMath) {
    const mathTopics = [
      {
        unit: "Bab 1: Eksponen dan Bentuk Akar",
        title: "Definisi Eksponen & Sifat Perkalian Perpangkatan",
        description: "Mempelajari konsep dasar eksponen serta sifat perkalian dan pembagian perpangkatan.",
        elemen: "Bilangan",
        category: "teaching"
      },
      {
        unit: "Bab 1: Eksponen dan Bentuk Akar",
        title: "Pangkat Nol, Negatif, & Konsep Pangkat Pecahan",
        description: "Mengeksplorasi pangkat nol, pangkat negatif, dan penyelesaian bentuk pangkat pecahan.",
        elemen: "Bilangan",
        category: "teaching"
      },
      {
        unit: "Bab 1: Eksponen dan Bentuk Akar",
        title: "Hubungan Eksponen dengan Bentuk Akar & Merasionalkan Penyebut",
        description: "Mempelajari bentuk akar, hubungan dengan eksponen, dan cara merasionalkan penyebut.",
        elemen: "Bilangan",
        category: "teaching"
      },
      {
        unit: "Bab 2: Barisan dan Deret",
        title: "Konsep Barisan Aritmetika & Penentuan Suku ke-n",
        description: "Mempelajari pola bilangan, konsep barisan aritmetika, dan menghitung rumus suku ke-n.",
        elemen: "Bilangan",
        category: "teaching"
      },
      {
        unit: "Bab 2: Barisan dan Deret",
        title: "Konsep Barisan Geometri & Pemodelan Masalah Bakteri/Virus",
        description: "Mempelajari barisan geometri dan memodelkan masalah pembelahan sel/pertumbuhan virus.",
        elemen: "Bilangan",
        category: "teaching"
      },
      {
        unit: "Bab 2: Barisan dan Deret",
        title: "Deret Aritmetika, Deret Geometri, & Bunga Tunggal/Majemuk",
        description: "Menerapkan konsep deret aritmetika/geometri pada simulasi bunga bank dan pertumbuhan.",
        elemen: "Bilangan",
        category: "teaching"
      },
      {
        unit: "Review & PTS",
        title: "Evaluasi Mandiri & Review Setengah Semester",
        description: "Melakukan pembahasan soal latihan, evaluasi mandiri, dan projek simulasi tabungan.",
        elemen: "-",
        category: "rpp"
      },
      {
        unit: "Review & PTS",
        title: "Penilaian Tengah Semester (PTS)",
        description: "Melaksanakan asesmen sumatif tengah semester untuk menguji kompetensi eksponen dan barisan.",
        elemen: "-",
        category: "grading"
      },
      {
        unit: "Bab 4: Sistem Persamaan & Pertidaksamaan Linear",
        title: "Memodelkan Sistem Persamaan Linear Tiga Variabel (SPLTV)",
        description: "Memahami cara membuat model matematika dari masalah kontekstual ke bentuk SPLTV.",
        elemen: "Aljabar & Fungsi",
        category: "teaching"
      },
      {
        unit: "Bab 4: Sistem Persamaan & Pertidaksamaan Linear",
        title: "Penyelesaian SPLTV dengan Metode Eliminasi & Substitusi",
        description: "Mempelajari metode eliminasi dan substitusi untuk menentukan himpunan penyelesaian SPLTV.",
        elemen: "Aljabar & Fungsi",
        category: "teaching"
      },
      {
        unit: "Bab 4: Sistem Persamaan & Pertidaksamaan Linear",
        title: "Sistem Pertidaksamaan Linear Dua Variabel (SPtLDV) & Grafik",
        description: "Menggambar daerah penyelesaian SPtLDV pada grafik kartesius dan menganalisis daerah bersih.",
        elemen: "Aljabar & Fungsi",
        category: "teaching"
      },
      {
        unit: "Bab 5: Persamaan dan Fungsi Kuadrat",
        title: "Menyelesaikan Persamaan Kuadrat dengan Faktorisasi & ABC",
        description: "Mempelajari metode faktorisasi, melengkapkan kuadrat sempurna, dan rumus ABC.",
        elemen: "Aljabar & Fungsi",
        category: "teaching"
      },
      {
        unit: "Bab 5: Persamaan dan Fungsi Kuadrat",
        title: "Karakteristik Fungsi Kuadrat & Aplikasi Gerak Parabola",
        description: "Menentukan titik puncak, sumbu simetri, dan memodelkan masalah fisika gerak parabola.",
        elemen: "Aljabar & Fungsi",
        category: "teaching"
      },
      {
        unit: "Review & Akhir Semester",
        title: "Refleksi Akhir Semester, Review Konsep, & PAS",
        description: "Melakukan refleksi akhir semester ganjil, penguatan konsep aljabar, dan Penilaian Akhir Semester.",
        elemen: "-",
        category: "grading"
      }
    ];

    return Array.from({ length: totalCount }).map((_, idx) => {
      const step = mathTopics.length / totalCount;
      const topicIdx = Math.min(Math.floor(idx * step), mathTopics.length - 1);
      const baseTopic = mathTopics[topicIdx];
      return {
        meetingNumber: idx + 1,
        unit: baseTopic.unit,
        title: `Pertemuan ${idx + 1}: ${baseTopic.title}`,
        description: baseTopic.description,
        elemen: baseTopic.elemen,
        priority: "medium" as const,
        category: baseTopic.category
      };
    });
  }

  const generalTopics = [
    { unit: "Orientasi", title: "Pengenalan dan Orientasi Pembelajaran", description: "Orientasi kelas, penyampaian tujuan pembelajaran, dan asesmen awal non-kognitif.", elemen: "Umum", category: "teaching" },
    { unit: "Unit 1: Konsep Dasar", title: "Eksplorasi Konsep Dasar", description: "Menggali konsep dasar materi sesuai capaian pembelajaran melalui diskusi interaktif.", elemen: "Konsep", category: "teaching" },
    { unit: "Unit 1: Konsep Dasar", title: "Analisis dan Studi Kasus Kontekstual", description: "Menghubungkan teori dasar dengan studi kasus atau masalah nyata di sekitar siswa.", elemen: "Konsep", category: "teaching" },
    { unit: "Unit 1: Konsep Dasar", title: "Diskusi Kelompok dan Kolaborasi Kelas", description: "Siswa bekerja dalam kelompok untuk memecahkan lembar kerja yang diberikan guru.", elemen: "Kolaborasi", category: "teaching" },
    { unit: "Review & PTS", title: "Review Tengah Semester", description: "Mengulang kembali materi-materi penting yang telah dipelajari selama setengah semester.", elemen: "-", category: "rpp" },
    { unit: "Review & PTS", title: "Penilaian Tengah Semester (PTS)", description: "Mengukur pemahaman siswa melalui penilaian tertulis atau penilaian kinerja.", elemen: "-", category: "grading" },
    { unit: "Unit 2: Aplikasi Projek", title: "Penerapan Konsep pada Projek Kreatif", description: "Membuat rencana atau draf projek kelompok yang relevan dengan topik bahasan.", elemen: "Aplikasi", category: "teaching" },
    { unit: "Unit 2: Aplikasi Projek", title: "Pendalaman Materi dan Penugasan Mandiri", description: "Membahas kesulitan siswa dan memberikan latihan tambahan untuk penguatan mandiri.", elemen: "Aplikasi", category: "teaching" },
    { unit: "Unit 2: Aplikasi Projek", title: "Presentasi Projek dan Umpan Balik Rekan", description: "Setiap kelompok mempresentasikan hasil projek dan mendapatkan feedback dari rekan kelas.", elemen: "Kolaborasi", category: "teaching" },
    { unit: "Review & PAS", title: "Review Akhir Semester & Penguatan Konsep", description: "Melakukan rangkuman materi seluruh semester dan sesi tanya jawab persiapan ujian.", elemen: "-", category: "rpp" },
    { unit: "Review & PAS", title: "Refleksi Akhir Semester & Evaluasi Hasil", description: "Melaksanakan asesmen akhir semester (PAS) dan merefleksikan proses belajar mengajar.", elemen: "-", category: "grading" }
  ];

  return Array.from({ length: totalCount }).map((_, idx) => {
    const step = generalTopics.length / totalCount;
    const topicIdx = Math.min(Math.floor(idx * step), generalTopics.length - 1);
    const baseTopic = generalTopics[topicIdx];
    return {
      meetingNumber: idx + 1,
      unit: baseTopic.unit,
      title: `Pertemuan ${idx + 1}: ${baseTopic.title}`,
      description: baseTopic.description,
      elemen: baseTopic.elemen,
      priority: "medium" as const,
      category: baseTopic.category
    };
  });
}

app.post("/teacher/todos/semester-plan", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const rawBody = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const body = {
    capaianPembelajaran: String(rawBody.capaianPembelajaran || ""),
    teachingDays: Array.isArray(rawBody.teachingDays) ? rawBody.teachingDays.map((d: unknown) => Number(d)) : [],
    startDate: String(rawBody.startDate || ""),
    endDate: String(rawBody.endDate || ""),
    maxMeetings: rawBody.maxMeetings ? Number(rawBody.maxMeetings) : undefined,
    classId: rawBody.classId ? String(rawBody.classId) : null,
    mapel: rawBody.mapel ? String(rawBody.mapel) : null,
    fase: rawBody.fase ? String(rawBody.fase) : null,
    semester: rawBody.semester ? String(rawBody.semester) : null,
    useMaterial: rawBody.useMaterial === true || rawBody.useMaterial === "true",
  };

  if (!body.capaianPembelajaran?.trim()) {
    return c.json({ message: "Capaian Pembelajaran wajib diisi." }, 400);
  }
  if (!body.teachingDays || !Array.isArray(body.teachingDays) || body.teachingDays.length === 0) {
    return c.json({ message: "Pilih minimal satu hari mengajar." }, 400);
  }
  if (!body.startDate || !body.endDate) {
    return c.json({ message: "Tanggal awal dan akhir semester wajib diisi." }, 400);
  }

  // Quota check/consume for semester plan
  const quotaCheck = await checkAndConsumeAiQuota(user.id, user.email);
  if (!quotaCheck.allowed) {
    return c.json({ message: quotaCheck.message }, 429);
  }

  const dates: string[] = [];
  try {
    let current = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (!isNaN(current.getTime()) && !isNaN(end.getTime()) && current <= end) {
      while (current <= end) {
        const day = current.getDay();
        if (body.teachingDays.includes(day)) {
          dates.push(current.toISOString().split("T")[0]);
          if (body.maxMeetings && dates.length >= body.maxMeetings) {
            break;
          }
        }
        current.setDate(current.getDate() + 1);
      }
    }
  } catch (err) {
    return c.json({ message: "Format tanggal tidak valid." }, 400);
  }

  if (dates.length === 0) {
    return c.json({ message: "Tidak ada hari mengajar yang cocok dalam rentang tanggal tersebut." }, 400);
  }

  // Deteksi semester jika tidak dikirim client
  let semester: Semester | null = body.semester === "ganjil" || body.semester === "genap" ? (body.semester as Semester) : null;
  if (!semester && body.startDate) {
    const startMonth = new Date(body.startDate).getMonth() + 1; // 1-12
    semester = startMonth >= 7 && startMonth <= 12 ? "ganjil" : "genap";
  }

  const mapel = body.mapel;
  const fase = body.fase === "E" || body.fase === "F" ? body.fase : null;
  const material = mapel && fase && semester ? findMaterial(mapel, fase, semester) : null;

  // Mode Template Lokal: langsung pakai materi dari /docs/material tanpa AI
  if (body.useMaterial && material) {
    const scaled = scaleToActualMeetings(material, dates.length, {
      classId: body.classId,
      dueDates: dates
    });
    const finalMeetings = scaled.map((m) => ({
      title: m.title,
      description: m.description,
      priority: m.priority,
      category: m.category,
      dueDate: m.dueDate || dates[m.meetingNumber - 1] || dates[dates.length - 1],
      classId: m.classId,
      unit: m.unit,
      elemen: m.elemen
    }));
    return c.json({ meetings: finalMeetings });
  }

  try {
    let outlineBlock = "";
    if (material) {
      outlineBlock = `

Berikut adalah outline materi resmi (dari BSKAP/ATP) untuk ${material.mapelLabel} Fase ${material.fase} Semester ${material.semester === "ganjil" ? "Ganjil" : "Genap"}:
${formatMaterialAsMarkdownTable(material)}

Gunakan outline ini sebagai panduan utama saat mendistribusikan topik. Pertahankan urutan dan nama bab/unit; sesuaikan hanya penomoran pertemuan agar tepat ${dates.length} pertemuan.`;
    }

    const prompt = `Anda adalah Asisten AI pendidik untuk platform IdeTech.
Tugas Anda adalah merancang program semester (rincian materi pembelajaran per pertemuan) berdasarkan Capaian Pembelajaran (CP) berikut ini.

Capaian Pembelajaran (CP):
"${body.capaianPembelajaran}"${outlineBlock}

Rencana semester ini harus dibagi menjadi tepat ${dates.length} pertemuan/topik materi pembelajaran secara berurutan.

Berikut adalah contoh pembagian materi berdasarkan Capaian Pembelajaran (diambil dari Matematika Fase E sebagai contoh pembagian):
- Unit/Bab: Eksponen dan Bentuk Akar
  * Pertemuan 1 - 4: Definisi Eksponen, Sifat-sifat perkalian, pembagian, dan perpangkatan eksponen. (Elemen: Bilangan)
  * Pertemuan 5 - 7: Pangkat nol, pangkat negatif, dan konsep pangkat pecahan. (Elemen: Bilangan)
  * Pertemuan 8 - 10: Hubungan eksponen dengan bentuk akar dan teknik merasionalkan penyebut. (Elemen: Bilangan)
- Unit/Bab: Barisan dan Deret
  * Pertemuan 11 - 13: Konsep Barisan Aritmetika dan penentuan suku ke-n. (Elemen: Bilangan)
  * Pertemuan 14 - 16: Konsep Barisan Geometri dan pemodelan masalah pembelahan bakteri/virus. (Elemen: Bilangan)
  * Pertemuan 17 - 20: Deret Aritmetika, Deret Geometri, dan aplikasi pada Bunga Tunggal & Majemuk. (Elemen: Bilangan)
- Review & Evaluasi Tengah Semester
  * Pertemuan 21 - 24: Evaluasi Mandiri, Projek kontekstual, dan PTS.
- Unit/Bab: Sistem Persamaan & Pertidaksamaan Linear
  * Pertemuan 25 - 27: Memodelkan masalah ke dalam Sistem Persamaan Linear Tiga Variabel (SPLTV). (Elemen: Aljabar & Fungsi)
  * Pertemuan 28 - 30: Penyelesaian SPLTV dengan metode eliminasi dan substitusi. (Elemen: Aljabar & Fungsi)
  * Pertemuan 31 - 34: Sistem Pertidaksamaan Linear Dua Variabel (SPtLDV) dan penentuan daerah penyelesaian grafik. (Elemen: Aljabar & Fungsi)
- Unit/Bab: Persamaan dan Fungsi Kuadrat
  * Pertemuan 35 - 38: Menyelesaikan Persamaan Kuadrat (Faktorisasi, Kuadrat Sempurna, Rumus ABC). (Elemen: Aljabar & Fungsi)
  * Pertemuan 39 - 42: Karakteristik Fungsi Kuadrat (titik puncak, sumbu simetri) dan aplikasi gerak parabola. (Elemen: Aljabar & Fungsi)
- Review & Akhir Semester
  * Pertemuan 43 - 44: Refleksi akhir semester ganjil dan penguatan konsep.

Petunjuk Utama untuk Anda:
1. Pahami CP yang diinput di atas. Analisis elemen-elemen dan topik bahasan di dalamnya.
2. Pecah CP tersebut menjadi bab/unit dan sub-topik materi ajar yang konkret dan berurutan dari dasar ke tingkat lebih lanjut.
3. Distribusikan bab/unit dan sub-topik tersebut secara merata ke dalam tepat ${dates.length} pertemuan. Sebagai contoh, jika suatu bab besar membutuhkan waktu lebih lama, bab tersebut bisa dipecah menjadi beberapa sub-topik untuk beberapa pertemuan berurutan (misal: Pertemuan 1-3 membahas konsep A, Pertemuan 4-6 membahas konsep B).
4. Jangan menuliskan judul pertemuan yang generik (misalnya: hindari menggunakan judul yang sama berulang-ulang seperti "Pembahasan Capaian Pembelajaran" untuk semua pertemuan). Judul tiap pertemuan harus spesifik menggambarkan topik bahasan/materi pelajaran yang diajarkan pada pertemuan tersebut (contoh: "Pertemuan 1: Konsep Dasar Eksponen dan Sifat Perkalian").
5. Buat deskripsi pertemuan yang informatif yang menjelaskan sub-topik ajar atau aktivitas belajar yang akan dilakukan pada pertemuan tersebut.
6. Masukkan juga sesi Review, PTS, atau PAS di tengah atau akhir semester secara proporsional sesuai jumlah pertemuan yang ada.
7. Tentukan nama Bab/Unit ("unit") dan Elemen Kurikulum ("elemen") yang sesuai untuk masing-masing pertemuan (misalnya unit: "Bab 1: Eksponen dan Bentuk Akar", elemen: "Bilangan").

Format keluaran HARUS berupa array JSON murni, jangan sertakan tag pembungkus markdown seperti \`\`\`json di awal/akhir respons, langsung saja berikan array objek JSON dengan struktur persis seperti contoh berikut:
[
  {
    "meetingNumber": 1,
    "unit": "Bab 1: Eksponen dan Bentuk Akar",
    "title": "Pertemuan 1: Definisi Eksponen dan Sifat Perkalian",
    "description": "Membahas konsep dasar eksponen beserta sifat perkalian dan pembagian perpangkatan.",
    "elemen": "Bilangan",
    "priority": "medium",
    "category": "teaching"
  }
]
`;

    const cybraUrl = process.env.CYBRA_API_URL || "https://asisten.ferilee.gurumuda.eu.org";
    const aiRes = await fetch(`${cybraUrl}/api/integration/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, history: [] }),
      signal: AbortSignal.timeout(getCybraTimeoutMs())
    });

    let meetings = [];
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      if (aiData.reply) {
        let replyText = aiData.reply.trim();
        if (replyText.startsWith("```")) {
          replyText = replyText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        try {
          meetings = JSON.parse(replyText);
        } catch (e) {
          console.error("Failed to parse AI semester response:", e);
        }
      }
    }

    if (!meetings || !Array.isArray(meetings) || meetings.length === 0) {
      if (material) {
        meetings = scaleToActualMeetings(material, dates.length, {
          classId: body.classId,
          dueDates: dates
        }).map((m) => ({
          title: m.title,
          description: m.description,
          priority: m.priority,
          category: m.category,
          dueDate: m.dueDate,
          classId: m.classId,
          unit: m.unit,
          elemen: m.elemen
        }));
      } else {
        meetings = getSmartFallbackMeetings(body.capaianPembelajaran, dates.length);
      }
    }

    const finalMeetings = meetings.slice(0, dates.length).map((m: any, idx: number) => {
      const dateStr = dates[idx] || dates[dates.length - 1];
      return {
        title: m.title || `Pertemuan ${idx + 1}`,
        description: m.description || "",
        priority: m.priority || "medium",
        category: m.category || "teaching",
        dueDate: dateStr,
        classId: body.classId || null,
        unit: m.unit || "",
        elemen: m.elemen || ""
      };
    });

    return c.json({ meetings: finalMeetings });
  } catch (error) {
    console.error("Failed to generate semester plan:", error);
    await writeActivityLog({
      userId: user.id,
      action: "ai_error",
      resourceType: "semester_plan",
      resourceId: body.classId || null,
      details: {
        error: String(error),
        message: error instanceof Error ? error.message : "Unknown error",
        teachingDays: body.teachingDays,
        startDate: body.startDate,
        endDate: body.endDate
      }
    }).catch(() => {});
    const fallbackMeetings = (material
      ? scaleToActualMeetings(material, dates.length, { classId: body.classId, dueDates: dates })
      : getSmartFallbackMeetings(body.capaianPembelajaran, dates.length)
    ).map((m, idx) => ({
      title: m.title,
      description: m.description,
      priority: m.priority,
      category: m.category,
      dueDate: dates[idx] || dates[dates.length - 1],
      classId: body.classId || null,
      unit: m.unit || "",
      elemen: m.elemen || ""
    }));
    return c.json({ meetings: fallbackMeetings });
  }
});

// ─── Teacher Materials ────────────────────────────────────────────────────────

app.get("/teacher/materials", requireRole(["teacher", "admin"]), requirePermission("material.create"), async (c) => {
  const user = c.get("authUser");
  const rows =
    user.activeRole === "admin"
      ? await db.select().from(materials).orderBy(desc(materials.updatedAt))
      : await db.select().from(materials).where(eq(materials.teacherUserId, user.id)).orderBy(desc(materials.updatedAt));

  return c.json({ materials: rows });
});

app.post("/teacher/materials", requireRole(["teacher", "admin"]), requirePermission("material.create"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    classId?: string;
    title?: string;
    type?: "lesson" | "video" | "document" | "quiz";
    description?: string;
    content?: string;
    options?: unknown;
    level?: number;
  };

  const title = body.title?.trim();
  const description = body.description?.trim();
  if (!body.classId || !title || !description) {
    return c.json({ message: "Kelas, judul materi, dan deskripsi wajib diisi." }, 400);
  }

  const [targetClass] = await db.select().from(classes).where(eq(classes.id, body.classId));
  if (!targetClass || (user.activeRole !== "admin" && targetClass.teacherUserId !== user.id)) {
    return c.json({ message: "Kelas tidak ditemukan atau bukan milik guru aktif." }, 404);
  }

  const now = new Date();
  const materialId = `mat_${crypto.randomUUID()}`;
  await db
    .insert(materials)
    .values({
      id: materialId,
      teacherUserId: user.id,
      classId: body.classId,
      title,
      type: body.type ?? "lesson",
      description,
      content: body.content ?? null,
      options: body.options ?? null,
      status: "published",
      level: Math.max(1, Number(body.level ?? 1)),
      createdAt: now,
      updatedAt: now
    });

  const [created] = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "material",
    resourceId: materialId,
    details: { title, type: body.type ?? "lesson", classId: body.classId }
  });

  return c.json({ material: created }, 201);
});

app.patch("/teacher/materials/:id", requireRole(["teacher", "admin"]), requirePermission("material.create"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID materi wajib diisi." }, 400);
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    type?: "lesson" | "video" | "document" | "quiz";
    description?: string;
    content?: string;
    options?: unknown;
    status?: "draft" | "published";
    level?: number;
  };

  const [targetMaterial] = await db.select().from(materials).where(eq(materials.id, id));
  if (!targetMaterial || (user.activeRole !== "admin" && targetMaterial.teacherUserId !== user.id)) {
    return c.json({ message: "Materi tidak ditemukan atau bukan milik guru aktif." }, 404);
  }

  await db
    .update(materials)
    .set({
      title: body.title?.trim() || targetMaterial.title,
      type: body.type ?? targetMaterial.type,
      description: body.description?.trim() || targetMaterial.description,
      content: body.content !== undefined ? body.content : targetMaterial.content,
      options: body.options !== undefined ? body.options : targetMaterial.options,
      status: body.status ?? targetMaterial.status,
      level: body.level !== undefined ? Math.max(1, Number(body.level)) : targetMaterial.level,
      updatedAt: new Date()
    })
    .where(eq(materials.id, id));

  const [updated] = await db.select().from(materials).where(eq(materials.id, id)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "update",
    resourceType: "material",
    resourceId: id,
    details: { title: body.title, type: body.type, status: body.status }
  });

  return c.json({ material: updated });
});

app.delete("/teacher/materials/:id", requireRole(["teacher", "admin"]), requirePermission("material.create"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID materi wajib diisi." }, 400);

  const [targetMaterial] = await db.select().from(materials).where(eq(materials.id, id));
  if (!targetMaterial || (user.activeRole !== "admin" && targetMaterial.teacherUserId !== user.id)) {
    return c.json({ message: "Materi tidak ditemukan atau bukan milik guru aktif." }, 404);
  }

  await db.delete(materials).where(eq(materials.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "delete",
    resourceType: "material",
    resourceId: id
  });

  return c.json({ ok: true });
});

app.get("/teacher/idequests", requireRole(["teacher", "admin"]), requirePermission("quest.manage"), async (c) => {
  const user = c.get("authUser");
  const rows =
    user.activeRole === "admin"
      ? await db.select().from(ideQuests).orderBy(desc(ideQuests.updatedAt))
      : await db.select().from(ideQuests).where(eq(ideQuests.teacherUserId, user.id)).orderBy(desc(ideQuests.updatedAt));

  return c.json({ quests: rows });
});

app.post("/teacher/idequests", requireRole(["teacher", "admin"]), requirePermission("quest.manage"), async (c) => {
  const user = c.get("authUser");
  
  let body: any = {};
  const contentType = c.req.header("content-type") || "";
  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    body = await c.req.parseBody();
  } else {
    body = await c.req.json().catch(() => ({}));
  }

  const title = (body.title as string)?.trim();
  let mission = (body.mission as string)?.trim();
  const dueDate = (body.dueDate as string)?.trim() || "7d";
  const photo = body.photo as File | undefined;
  
  if (!body.classId || !title || !mission) {
    return c.json({ message: "Kelas, judul IdeQuest, dan misi wajib diisi." }, 400);
  }

  const [targetClass] = await db.select().from(classes).where(eq(classes.id, body.classId));
  if (!targetClass || (user.activeRole !== "admin" && targetClass.teacherUserId !== user.id)) {
    return c.json({ message: "Kelas tidak ditemukan atau bukan milik guru aktif." }, 404);
  }

  if (body.materialId) {
    const [targetMaterial] = await db.select().from(materials).where(eq(materials.id, body.materialId as string));
    if (!targetMaterial || targetMaterial.classId !== body.classId) {
      return c.json({ message: "Materi tidak ditemukan di kelas yang dipilih." }, 400);
    }
  }

  if (photo) {
    try {
      const s3Config = getS3Config();
      const s3 = new S3Client({
        endpoint: s3Config.endpoint,
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey
        },
        forcePathStyle: true
      });

      const ext = photo.name.split('.').pop() || "png";
      const key = `quests/${user.id}-${Date.now()}.${ext}`;
      const buffer = await photo.arrayBuffer();

      await s3.send(new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: photo.type
      }));

      const photoUrl = `${s3Config.publicBaseUrl}/${key}`;
      mission += `\n\n![Lampiran Gambar](${photoUrl})`;
    } catch (err) {
      console.error("Gagal upload lampiran gambar quest ke RustFS:", err);
      await writeActivityLog({
        userId: user.id,
        action: "upload_error",
        resourceType: "quest_attachment",
        details: { error: String(err), message: err instanceof Error ? err.message : "Unknown error" }
      }).catch(() => {});
      return c.json({ message: "Gagal mengunggah gambar lampiran." }, 500);
    }
  }

  const now = new Date();
  const questId = `iq_${crypto.randomUUID()}`;
  await db
    .insert(ideQuests)
    .values({
      id: questId,
      teacherUserId: user.id,
      classId: body.classId as string,
      materialId: (body.materialId as string) || null,
      title,
      mission,
      points: Math.max(0, Number(body.points ?? 100)),
      dueDate,
      status: "published",
      level: Math.max(1, Number(body.level ?? 1)),
      createdAt: now,
      updatedAt: now
    });

  const [created] = await db.select().from(ideQuests).where(eq(ideQuests.id, questId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "idequest",
    resourceId: questId,
    details: { title, classId: body.classId, materialId: body.materialId || null }
  });

  return c.json({ quest: created }, 201);
});

app.patch("/teacher/idequests/:id", requireRole(["teacher", "admin"]), requirePermission("quest.manage"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID IdeQuest wajib diisi." }, 400);
  const body = (await c.req.json().catch(() => ({}))) as {
    materialId?: string | null;
    title?: string;
    mission?: string;
    points?: number;
    dueDate?: string;
    status?: "draft" | "published" | "archived";
    level?: number;
  };

  const [targetQuest] = await db.select().from(ideQuests).where(eq(ideQuests.id, id));
  if (!targetQuest || (user.activeRole !== "admin" && targetQuest.teacherUserId !== user.id)) {
    return c.json({ message: "IdeQuest tidak ditemukan atau bukan milik guru aktif." }, 404);
  }

  if (body.materialId !== undefined && body.materialId !== null) {
    const [targetMaterial] = await db.select().from(materials).where(eq(materials.id, body.materialId));
    if (!targetMaterial || targetMaterial.classId !== targetQuest.classId) {
      return c.json({ message: "Materi tidak ditemukan di kelas yang dipilih." }, 400);
    }
  }

  await db
    .update(ideQuests)
    .set({
      materialId: body.materialId !== undefined ? body.materialId : targetQuest.materialId,
      title: body.title?.trim() || targetQuest.title,
      mission: body.mission?.trim() || targetQuest.mission,
      points: body.points !== undefined ? Math.max(0, Number(body.points)) : targetQuest.points,
      dueDate: body.dueDate?.trim() || targetQuest.dueDate,
      status: body.status ?? targetQuest.status,
      level: body.level !== undefined ? Math.max(1, Number(body.level)) : targetQuest.level,
      updatedAt: new Date()
    })
    .where(eq(ideQuests.id, id));

  const [updated] = await db.select().from(ideQuests).where(eq(ideQuests.id, id)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "update",
    resourceType: "idequest",
    resourceId: id,
    details: { title: body.title, status: body.status }
  });

  return c.json({ quest: updated });
});

app.delete("/teacher/idequests/:id", requireRole(["teacher", "admin"]), requirePermission("quest.manage"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID IdeQuest wajib diisi." }, 400);

  const [targetQuest] = await db.select().from(ideQuests).where(eq(ideQuests.id, id));
  if (!targetQuest || (user.activeRole !== "admin" && targetQuest.teacherUserId !== user.id)) {
    return c.json({ message: "IdeQuest tidak ditemukan atau bukan milik guru aktif." }, 404);
  }

  await db.delete(ideQuests).where(eq(ideQuests.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "delete",
    resourceType: "idequest",
    resourceId: id
  });

  return c.json({ ok: true });
});

app.get("/teacher/student-progress", requireRole(["teacher", "admin"]), requirePermission("report.view"), async (c) => {
  const user = c.get("authUser");
  
  const teacherClasses = await db.select().from(classes).where(eq(classes.teacherUserId, user.id));
  const classIds = teacherClasses.map(c => c.id);

  if (classIds.length === 0) {
    return c.json({ progress: [] });
  }

  const studentsInClasses = await db.select({
    studentId: classStudents.studentUserId,
    classId: classStudents.classId,
    studentName: users.name,
    studentEmail: users.email,
    avatarUrl: users.avatarUrl,
    joinedAt: classStudents.createdAt
  })
  .from(classStudents)
  .innerJoin(users, eq(classStudents.studentUserId, users.id))
  .where(inArray(classStudents.classId, classIds));

  const teacherMaterials = await db.select().from(materials).where(inArray(materials.classId, classIds));
  const materialIds = teacherMaterials.map(m => m.id);

  const teacherQuests = await db.select().from(ideQuests).where(inArray(ideQuests.classId, classIds));
  const questIds = teacherQuests.map(q => q.id);

  let matProgress: any[] = [];
  if (materialIds.length > 0) {
    matProgress = await db.select().from(studentMaterialProgress).where(inArray(studentMaterialProgress.materialId, materialIds));
  }

  let qstProgress: any[] = [];
  if (questIds.length > 0) {
    qstProgress = await db.select().from(studentQuestProgress).where(inArray(studentQuestProgress.questId, questIds));
  }

  const result = studentsInClasses.map(sc => {
    const studentMats = teacherMaterials.filter(m => m.classId === sc.classId).map(m => {
      const prog = matProgress.find(p => p.materialId === m.id && p.studentUserId === sc.studentId);
      const isLate = (m.options as any)?.dueDate && prog?.completedAt 
        ? new Date(prog.completedAt).getTime() > new Date((m.options as any).dueDate).getTime() 
        : false;
      
      return {
        id: m.id,
        title: m.title,
        type: 'material',
        progress: prog?.progress || 0,
        completedAt: prog?.completedAt || null,
        dueDate: (m.options as any)?.dueDate || null,
        isLate
      };
    });

    const studentQsts = teacherQuests.filter(q => q.classId === sc.classId).map(q => {
      const prog = qstProgress.find(p => p.questId === q.id && p.studentUserId === sc.studentId);
      const isLate = q.dueDate && prog?.completedAt 
        ? new Date(prog.completedAt).getTime() > new Date(q.dueDate).getTime() 
        : false;
      
      return {
        id: q.id,
        title: q.title,
        type: 'quest',
        progress: prog?.progress || 0,
        completedAt: prog?.completedAt || null,
        dueDate: q.dueDate || null,
        isLate,
        submissionText: prog?.submissionText || null,
        submissionFileUrl: prog?.submissionFileUrl || null,
        teacherFeedback: prog?.teacherFeedback || null,
        earnedPoints: prog?.earnedPoints || 0,
        maxPoints: q.points
      };
    });

    return {
      studentId: sc.studentId,
      classId: sc.classId,
      studentName: sc.studentName,
      studentEmail: sc.studentEmail,
      avatarUrl: sc.avatarUrl,
      className: teacherClasses.find(c => c.id === sc.classId)?.name || "Unknown",
      joinedAt: sc.joinedAt,
      materials: studentMats,
      quests: studentQsts
    };
  });

  return c.json({ progress: result });
});

app.post("/teacher/student-progress/grade-quest", requireRole(["teacher", "admin"]), requirePermission("report.view"), async (c) => {
  const user = c.get("authUser");
  const body = await c.req.json().catch(() => ({}));
  
  if (!body.studentId || !body.questId || typeof body.earnedPoints !== 'number') {
    return c.json({ message: "Parameter tidak lengkap." }, 400);
  }

  const [quest] = await db.select().from(ideQuests).where(eq(ideQuests.id, body.questId));
  if (!quest || (user.activeRole !== "admin" && quest.teacherUserId !== user.id)) {
    return c.json({ message: "IdeQuest tidak ditemukan atau bukan milik Anda." }, 403);
  }

  const progressRows = await db.select().from(studentQuestProgress)
    .where(eq(studentQuestProgress.studentUserId, body.studentId));
  const progress = progressRows.find(p => p.questId === body.questId);
  
  if (!progress) {
    return c.json({ message: "Siswa belum mengumpulkan IdeQuest ini." }, 400);
  }

  await db.update(studentQuestProgress)
    .set({
      earnedPoints: body.earnedPoints,
      teacherFeedback: body.feedback || null,
      updatedAt: new Date()
    })
    .where(eq(studentQuestProgress.id, progress.id));

  await writeActivityLog({
    userId: user.id,
    action: "grade",
    resourceType: "student_quest_progress",
    resourceId: progress.id,
    details: { earnedPoints: body.earnedPoints, feedback: body.feedback }
  });

  return c.json({ ok: true });
});

app.post("/teacher/journals", requireRole(["teacher", "admin"]), requirePermission("journal.manage"), async (c) => {
  const user = c.get("authUser");
  const body = await c.req.parseBody();
  const photo = body.photo as File | undefined;
  let photoUrl = null;

  if (photo) {
    let s3Config;
    try {
      s3Config = getS3Config();
    } catch (err) {
      console.error("Konfigurasi S3/RustFS tidak lengkap:", err);
      return c.json({ message: "Konfigurasi storage belum lengkap." }, 500);
    }

    try {
      const s3 = new S3Client({
        endpoint: s3Config.endpoint,
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey
        },
        forcePathStyle: true
      });

      const ext = photo.name.split('.').pop() || "png";
      const key = `journals/${user.id}-${Date.now()}.${ext}`;
      const buffer = await photo.arrayBuffer();

      await s3.send(new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: photo.type
      }));

      photoUrl = `${s3Config.publicBaseUrl}/${key}`;
    } catch (err) {
      console.error("Gagal upload foto ke RustFS:", err);
      await writeActivityLog({
        userId: user.id,
        action: "upload_error",
        resourceType: "journal_photo",
        details: { error: String(err), message: err instanceof Error ? err.message : "Unknown error" }
      }).catch(() => {});
      return c.json({ message: "Gagal mengunggah foto jurnal." }, 500);
    }
  }

  const now = new Date();
  const journalId = `jrn_${nanoid(12)}`;
  await db.insert(teacherJournals).values({
    id: journalId,
    teacherUserId: user.id,
    mood: typeof body.mood === "string" ? body.mood : null,
    successReflection: typeof body.success === "string" ? body.success : null,
    improvementReflection: typeof body.improvement === "string" ? body.improvement : null,
    anecdote: typeof body.anecdote === "string" ? body.anecdote : null,
    todos: typeof body.todos === "string" ? body.todos : null,
    photoUrl,
    createdAt: now,
    updatedAt: now
  });

  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "journal",
    resourceId: journalId,
    details: { mood: body.mood, hasPhoto: Boolean(photoUrl) }
  });

  return c.json({ ok: true, photoUrl });
});

app.get("/teacher/journals", requireRole(["teacher", "admin"]), requirePermission("journal.manage"), async (c) => {
  const user = c.get("authUser");
  const journals = await db
    .select()
    .from(teacherJournals)
    .where(eq(teacherJournals.teacherUserId, user.id))
    .orderBy(desc(teacherJournals.createdAt));

  return c.json({ journals });
});

app.get("/teacher/chat-quota", requireRole(["teacher", "admin"]), requirePermission("chat.use"), async (c) => {
  const user = c.get("authUser");
  const now = new Date();
  const { limit, windowMs } = await getChatQuotaConfig();

  let [quota] = await db.select().from(chatQuotas).where(eq(chatQuotas.userId, user.id)).limit(1);

  if (!quota) {
    return c.json({ remaining: limit, resetAt: new Date(now.getTime() + windowMs).toISOString(), limit });
  }

  const isExpired = now.getTime() - quota.windowStartAt.getTime() > windowMs;
  if (isExpired) {
    return c.json({ remaining: limit, resetAt: new Date(now.getTime() + windowMs).toISOString(), limit });
  }

  const resetAt = new Date(quota.windowStartAt.getTime() + windowMs).toISOString();
  return c.json({ remaining: Math.max(0, limit - quota.messagesCount), resetAt, limit });
});

app.post("/teacher/chat-consume", requireRole(["teacher", "admin"]), requirePermission("chat.use"), async (c) => {
  const user = c.get("authUser");
  const now = new Date();
  const { limit, windowMs } = await getChatQuotaConfig();

  let [quota] = await db.select().from(chatQuotas).where(eq(chatQuotas.userId, user.id)).limit(1);

  if (!quota) {
    await db.insert(chatQuotas).values({
      id: `cq_${nanoid(12)}`,
      userId: user.id,
      messagesCount: 1,
      windowStartAt: now,
      updatedAt: now
    });
    return c.json({ allowed: true, remaining: limit - 1, resetAt: new Date(now.getTime() + windowMs).toISOString() });
  }

  const isExpired = now.getTime() - quota.windowStartAt.getTime() > windowMs;

  if (isExpired) {
    await db.update(chatQuotas).set({
      messagesCount: 1,
      windowStartAt: now,
      updatedAt: now
    }).where(eq(chatQuotas.id, quota.id));
    return c.json({ allowed: true, remaining: limit - 1, resetAt: new Date(now.getTime() + windowMs).toISOString() });
  }

  const resetAt = new Date(quota.windowStartAt.getTime() + windowMs).toISOString();

  if (quota.messagesCount >= limit) {
    return c.json({ allowed: false, message: `Kuota obrolan habis. Anda mendapat ${limit} pesan dalam periode ini.` }, 429);
  }

  await db.update(chatQuotas).set({
    messagesCount: quota.messagesCount + 1,
    updatedAt: now
  }).where(eq(chatQuotas.id, quota.id));

  return c.json({ allowed: true, remaining: limit - (quota.messagesCount + 1), resetAt });
});

app.post("/teacher/chat", requireRole(["teacher", "admin"]), requirePermission("chat.use"), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { message?: string; history?: any[] };
  if (!body.message) return c.json({ message: "Pesan tidak boleh kosong." }, 400);

  try {
    const cybraUrl = process.env.CYBRA_API_URL || "https://asisten.ferilee.gurumuda.eu.org";
    const response = await fetch(`${cybraUrl}/api/integration/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (IdeTech Server) AppleWebKit/537.36"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(getCybraTimeoutMs())
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`Cybra error ${response.status}:`, errorText);
      return c.json({ message: `Gagal terhubung ke AI (CybraFeriBot). Status: ${response.status}` }, 502);
    }

    const data = await response.json();
    return c.json(data);
  } catch (err: any) {
    console.error("Cybra integration error:", err);
    return c.json({ message: `Koneksi ke backend CybraFeriBot gagal: ${err.message}` }, 500);
  }
});

app.post("/teacher/generate-ai", requireRole(["teacher", "admin"]), requirePermission("chat.use"), async (c) => {
  const user = c.get("authUser");
  const rawBody = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const body = {
    prompt: String(rawBody.prompt || ""),
    mapel: rawBody.mapel ? String(rawBody.mapel) : null,
    fase: rawBody.fase === "E" || rawBody.fase === "F" ? (rawBody.fase as "E" | "F") : null,
    semester: rawBody.semester === "ganjil" || rawBody.semester === "genap" ? (rawBody.semester as Semester) : null,
    pertemuanKe: rawBody.pertemuanKe ? Number(rawBody.pertemuanKe) : null
  };
  if (!body.prompt) return c.json({ message: "Prompt tidak boleh kosong." }, 400);

  const quotaCheck = await checkAndConsumeAiQuota(user.id, user.email);
  if (!quotaCheck.allowed) {
    return c.json({ message: quotaCheck.message }, 429);
  }

  // Inject materi context ke prompt jika tersedia
  let enrichedPrompt = body.prompt;
  if (body.mapel && body.fase && body.semester) {
    const material = findMaterial(body.mapel, body.fase, body.semester);
    if (material && body.pertemuanKe) {
      // Cari unit & sub-topik untuk pertemuan ini
      const target = material.units.find(u => u.pertemuanStart <= body.pertemuanKe! && u.pertemuanEnd >= body.pertemuanKe!);
      if (target) {
        const sub = target.subTopics.find(s => s.pertemuanStart <= body.pertemuanKe! && s.pertemuanEnd >= body.pertemuanKe!);
        enrichedPrompt += `

---
KONTEN MATERI RESMI UNTUK RPP INI:
Mapel: ${material.mapelLabel}, Fase ${material.fase}, Semester ${material.semester === "ganjil" ? "Ganjil" : "Genap"}
Pertemuan ke-${body.pertemuanKe}
Unit: ${target.unit}${sub ? `
Sub-topik: ${sub.topik}
Tujuan/Elemen: ${sub.deskripsi}` : ""}
---
Sesuaikan RPP di atas dengan konten materi resmi ini.`;
      } else {
        enrichedPrompt += `

---
OUTLINE MATERI RESMI ${material.mapelLabel} Fase ${material.fase} Semester ${material.semester === "ganjil" ? "Ganjil" : "Genap"}:
${formatMaterialAsMarkdownTable(material)}
---
Gunakan outline ini sebagai referensi kurikulum.`;
      }
    } else if (material) {
      enrichedPrompt += `

---
OUTLINE MATERI RESMI ${material.mapelLabel} Fase ${material.fase} Semester ${material.semester === "ganjil" ? "Ganjil" : "Genap"}:
${formatMaterialAsMarkdownTable(material)}
---
Gunakan outline ini sebagai referensi kurikulum.`;
    }
  }

  try {
    const cybraUrl = process.env.CYBRA_API_URL || "https://asisten.ferilee.gurumuda.eu.org";
    const response = await fetch(`${cybraUrl}/api/integration/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (IdeTech Server) AppleWebKit/537.36"
      },
      body: JSON.stringify({ message: enrichedPrompt, history: [] }),
      signal: AbortSignal.timeout(getCybraTimeoutMs())
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`Cybra AI error ${response.status}:`, errorText);
      await writeActivityLog({
        userId: user.id,
        action: "ai_error",
        resourceType: "ai_generate",
        details: { status: response.status, errorText, prompt: body.prompt?.slice(0, 200) }
      }).catch(() => {});

      // Fallback RPP lokal dari materi resmi jika CYBRA mengembalikan status non-2xx
      if (body.mapel && body.fase && body.semester) {
        const fallback = generateFallbackRPP({
          mapel: body.mapel,
          fase: body.fase,
          semester: body.semester,
          pertemuanKe: body.pertemuanKe,
          topic: body.prompt?.slice(0, 120),
          grade: undefined,
          duration: undefined,
          model: undefined
        });
        if (fallback) {
          return c.json({
            reply: fallback,
            fallback: true,
            message: `Layanan AI CYBRA sedang tidak tersedia (Status ${response.status}). RPP ini dibuat otomatis dari materi resmi.`
          });
        }
      }

      return c.json({ message: `Gagal terhubung ke AI Dianyssa. Status: ${response.status}` }, 502);
    }

    const data = await response.json();
    return c.json(data);
  } catch (err: any) {
    console.error("Cybra AI error:", err);
    await writeActivityLog({
      userId: user.id,
      action: "ai_error",
      resourceType: "ai_generate",
      details: { error: String(err), message: err.message, prompt: body.prompt?.slice(0, 200) }
    }).catch(() => {});

    // Fallback RPP lokal dari materi resmi jika CYBRA timeout/error
    if (body.mapel && body.fase && body.semester) {
      const fallback = generateFallbackRPP({
        mapel: body.mapel,
        fase: body.fase,
        semester: body.semester,
        pertemuanKe: body.pertemuanKe,
        topic: body.prompt?.slice(0, 120),
        grade: undefined,
        duration: undefined,
        model: undefined
      });
      if (fallback) {
        return c.json({ reply: fallback, fallback: true, message: "Layanan AI CYBRA sedang tidak tersedia. RPP ini dibuat otomatis dari materi resmi." });
      }
    }

    return c.json({ message: "Layanan AI CYBRA sedang tidak tersedia. Silakan coba lagi nanti atau gunakan Template Materi untuk Program Semester." }, 504);
  }
});

app.post("/teacher/bank-submit", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as { type: "material" | "quest" | "rpp"; id: string };
  if (!body.type || !body.id) return c.json({ message: "Type dan ID wajib diisi." }, 400);

  if (body.type === "material") {
    const [item] = await db.select().from(materials).where(eq(materials.id, body.id)).limit(1);
    if (!item || (user.activeRole !== "admin" && item.teacherUserId !== user.id)) return c.json({ message: "Materi tidak ditemukan." }, 404);
    await db.update(materials).set({ bankStatus: "pending", updatedAt: new Date() }).where(eq(materials.id, body.id));
  } else if (body.type === "quest") {
    const [item] = await db.select().from(ideQuests).where(eq(ideQuests.id, body.id)).limit(1);
    if (!item || (user.activeRole !== "admin" && item.teacherUserId !== user.id)) return c.json({ message: "IdeQuest tidak ditemukan." }, 404);
    await db.update(ideQuests).set({ bankStatus: "pending", updatedAt: new Date() }).where(eq(ideQuests.id, body.id));
  } else if (body.type === "rpp") {
    const [item] = await db.select().from(lessonPlans).where(eq(lessonPlans.id, body.id)).limit(1);
    if (!item || (user.activeRole !== "admin" && item.teacherUserId !== user.id)) return c.json({ message: "RPP tidak ditemukan." }, 404);
    await db.update(lessonPlans).set({ bankStatus: "pending", updatedAt: new Date() }).where(eq(lessonPlans.id, body.id));
  } else {
    return c.json({ message: "Tipe item tidak valid." }, 400);
  }
  return c.json({ ok: true });
});

app.get("/teacher/rpps", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const rpps = await db.select().from(lessonPlans).where(eq(lessonPlans.teacherUserId, user.id)).orderBy(desc(lessonPlans.updatedAt));
  const subjects = await db.select().from(masterSubjects);
  const classList = await db.select().from(classes).where(eq(classes.teacherUserId, user.id));
  return c.json({ rpps, subjects, classes: classList });
});

app.post("/teacher/rpps", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    topic: string;
    grade: string;
    duration: string;
    model: string;
    content: string;
    status?: "draft" | "published";
    classId?: string;
    subjectId?: string;
  };
  
  if (!body.topic || !body.content) return c.json({ message: "Data RPP tidak valid." }, 400);

  const newId = `rpp_${nanoid(12)}`;
  const now = new Date();
  
  await db.insert(lessonPlans).values({
    id: newId,
    teacherUserId: user.id,
    topic: body.topic,
    grade: body.grade,
    duration: body.duration,
    model: body.model,
    content: body.content,
    status: body.status || "draft",
    classId: body.classId || null,
    subjectId: body.subjectId || null,
    bankStatus: "none",
    createdAt: now,
    updatedAt: now
  });

  return c.json({ id: newId, ok: true });
});

app.put("/teacher/rpps/:id", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id") as string;
  const body = (await c.req.json().catch(() => ({}))) as any; // Allow partial updates
  
  const [existing] = await db.select().from(lessonPlans).where(eq(lessonPlans.id, id)).limit(1);
  if (!existing || existing.teacherUserId !== user.id) return c.json({ message: "RPP tidak ditemukan." }, 404);
  
  const updateData: any = { updatedAt: new Date() };
  if (body.topic !== undefined) updateData.topic = body.topic;
  if (body.grade !== undefined) updateData.grade = body.grade;
  if (body.duration !== undefined) updateData.duration = body.duration;
  if (body.model !== undefined) updateData.model = body.model;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.classId !== undefined) updateData.classId = body.classId;
  if (body.subjectId !== undefined) updateData.subjectId = body.subjectId;
  
  await db.update(lessonPlans).set(updateData).where(eq(lessonPlans.id, id));
  return c.json({ ok: true });
});

app.delete("/teacher/rpps/:id", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id") as string;
  const [existing] = await db.select().from(lessonPlans).where(eq(lessonPlans.id, id)).limit(1);
  if (!existing || existing.teacherUserId !== user.id) return c.json({ message: "RPP tidak ditemukan." }, 404);
  
  await db.delete(lessonPlans).where(eq(lessonPlans.id, id));
  return c.json({ ok: true });
});

app.get("/admin/bank-queue", requireRole(["admin"]), requirePermission("bank.manage"), async (c) => {
  const [materialRows, questRows, rppRows, userRows] = await Promise.all([
    db.select().from(materials).where(eq(materials.bankStatus, "pending")).orderBy(desc(materials.updatedAt)),
    db.select().from(ideQuests).where(eq(ideQuests.bankStatus, "pending")).orderBy(desc(ideQuests.updatedAt)),
    db.select().from(lessonPlans).where(eq(lessonPlans.bankStatus, "pending")).orderBy(desc(lessonPlans.updatedAt)),
    db.select().from(users)
  ]);

  return c.json({
    materials: materialRows.map((item) => ({
      ...item,
      teacherName: userRows.find((u) => u.id === item.teacherUserId)?.fullName ?? "Guru"
    })),
    quests: questRows.map((item) => ({
      ...item,
      teacherName: userRows.find((u) => u.id === item.teacherUserId)?.fullName ?? "Guru"
    })),
    lessonPlans: rppRows.map((item) => ({
      ...item,
      teacherName: userRows.find((u) => u.id === item.teacherUserId)?.fullName ?? "Guru"
    }))
  });
});

app.patch("/admin/bank-queue/:type/:id", requireRole(["admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const type = c.req.param("type");
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { status: "approved" | "rejected" };
  if (!id || (body.status !== "approved" && body.status !== "rejected")) return c.json({ message: "Invalid payload." }, 400);

  if (type === "material") {
    await db.update(materials).set({ bankStatus: body.status, updatedAt: new Date() }).where(eq(materials.id, id));
  } else if (type === "quest") {
    await db.update(ideQuests).set({ bankStatus: body.status, updatedAt: new Date() }).where(eq(ideQuests.id, id));
  } else if (type === "rpp") {
    await db.update(lessonPlans).set({ bankStatus: body.status, updatedAt: new Date() }).where(eq(lessonPlans.id, id));
  }

  await writeActivityLog({
    userId: user.id,
    action: body.status === "approved" ? "approve" : "reject",
    resourceType: type === "material" ? "material" : "idequest",
    resourceId: id,
    details: { status: body.status, type }
  });

  return c.json({ ok: true });
});

app.get("/teacher/bank-public", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const [materialRows, questRows, rppRows, userRows] = await Promise.all([
    db.select().from(materials).where(eq(materials.bankStatus, "approved")).orderBy(desc(materials.updatedAt)),
    db.select().from(ideQuests).where(eq(ideQuests.bankStatus, "approved")).orderBy(desc(ideQuests.updatedAt)),
    db.select().from(lessonPlans).where(eq(lessonPlans.bankStatus, "approved")).orderBy(desc(lessonPlans.updatedAt)),
    db.select().from(users)
  ]);

  return c.json({
    materials: materialRows.map((item) => ({
      ...item,
      teacherName: userRows.find((u) => u.id === item.teacherUserId)?.fullName ?? "Guru"
    })),
    quests: questRows.map((item) => ({
      ...item,
      teacherName: userRows.find((u) => u.id === item.teacherUserId)?.fullName ?? "Guru"
    })),
    lessonPlans: rppRows.map((item) => ({
      ...item,
      teacherName: userRows.find((u) => u.id === item.teacherUserId)?.fullName ?? "Guru"
    }))
  });
});

// The library is the read/adopt seam for curated content. It keeps the
// contributor's source item intact and returns classroom-ready packages made
// of one material plus its linked IdeQuests.
app.get("/teacher/library", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const [materialRows, questRows, userRows, classRows] = await Promise.all([
    db.select().from(materials).where(eq(materials.bankStatus, "approved")).orderBy(desc(materials.updatedAt)),
    db.select().from(ideQuests).where(eq(ideQuests.bankStatus, "approved")).orderBy(desc(ideQuests.updatedAt)),
    db.select().from(users),
    db.select().from(classes)
  ]);
  const contributorName = (userId: string) => userRows.find((user) => user.id === userId)?.fullName ?? "Kontributor IdeTech";
  const publicQuest = (quest: any) => ({ ...quest, contributorName: contributorName(quest.teacherUserId) });

  return c.json({
    packages: materialRows.map((material) => ({
      id: material.id,
      title: material.title,
      contributorName: contributorName(material.teacherUserId),
      subject: classRows.find((item) => item.id === material.classId)?.subject ?? "Umum",
      grade: classRows.find((item) => item.id === material.classId)?.grade ?? null,
      material: { ...material, contributorName: contributorName(material.teacherUserId) },
      quests: questRows.filter((quest) => quest.materialId === material.id).map(publicQuest)
    })),
    materials: materialRows.map((material) => ({ ...material, contributorName: contributorName(material.teacherUserId) })),
    quests: questRows.filter((quest) => !quest.materialId).map(publicQuest)
  });
});

app.post("/teacher/library/packages/:materialId/adopt", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const materialId = c.req.param("materialId");
  const body = (await c.req.json().catch(() => ({}))) as { targetClassId?: string };
  if (!materialId || !body.targetClassId) return c.json({ message: "Paket dan kelas tujuan wajib diisi." }, 400);

  const [[sourceMaterial], [targetClass], sourceQuests] = await Promise.all([
    db.select().from(materials).where(eq(materials.id, materialId)).limit(1),
    db.select().from(classes).where(eq(classes.id, body.targetClassId)).limit(1),
    db.select().from(ideQuests).where(and(eq(ideQuests.materialId, materialId), eq(ideQuests.bankStatus, "approved")))
  ]);
  if (!sourceMaterial || sourceMaterial.bankStatus !== "approved") return c.json({ message: "Paket pembelajaran tidak tersedia." }, 404);
  if (!targetClass || (user.activeRole !== "admin" && targetClass.teacherUserId !== user.id)) return c.json({ message: "Kelas tujuan tidak valid." }, 400);

  const now = new Date();
  const clonedMaterialId = `mat_${crypto.randomUUID()}`;
  await db.insert(materials).values({
    id: clonedMaterialId,
    teacherUserId: user.id,
    classId: targetClass.id,
    title: sourceMaterial.title,
    type: sourceMaterial.type,
    description: sourceMaterial.description,
    content: sourceMaterial.content,
    options: sourceMaterial.options,
    status: "published",
    bankStatus: "none",
    level: sourceMaterial.level,
    createdAt: now,
    updatedAt: now
  });

  const clonedQuests = [] as Array<{ id: string; sourceId: string }>;
  for (const sourceQuest of sourceQuests) {
    const clonedQuestId = `iq_${crypto.randomUUID()}`;
    await db.insert(ideQuests).values({
      id: clonedQuestId,
      teacherUserId: user.id,
      classId: targetClass.id,
      materialId: clonedMaterialId,
      title: sourceQuest.title,
      mission: sourceQuest.mission,
      points: sourceQuest.points,
      dueDate: sourceQuest.dueDate,
      status: "published",
      bankStatus: "none",
      level: sourceQuest.level,
      createdAt: now,
      updatedAt: now
    });
    clonedQuests.push({ id: clonedQuestId, sourceId: sourceQuest.id });
  }

  const [material] = await db.select().from(materials).where(eq(materials.id, clonedMaterialId)).limit(1);
  const quests = clonedQuests.length
    ? await db.select().from(ideQuests).where(inArray(ideQuests.id, clonedQuests.map((quest) => quest.id)))
    : [];
  await writeActivityLog({
    userId: user.id,
    action: "adopt",
    resourceType: "learning_package",
    resourceId: materialId,
    details: { targetClassId: targetClass.id, materialId: clonedMaterialId, questCount: quests.length }
  });
  return c.json({ material, quests }, 201);
});

app.post("/teacher/library/quests/:questId/adopt", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const questId = c.req.param("questId");
  const body = (await c.req.json().catch(() => ({}))) as { targetClassId?: string };
  if (!questId || !body.targetClassId) return c.json({ message: "IdeQuest dan kelas tujuan wajib diisi." }, 400);
  const [[sourceQuest], [targetClass]] = await Promise.all([
    db.select().from(ideQuests).where(eq(ideQuests.id, questId)).limit(1),
    db.select().from(classes).where(eq(classes.id, body.targetClassId)).limit(1)
  ]);
  if (!sourceQuest || sourceQuest.bankStatus !== "approved") return c.json({ message: "IdeQuest tidak tersedia di perpustakaan." }, 404);
  if (!targetClass || (user.activeRole !== "admin" && targetClass.teacherUserId !== user.id)) return c.json({ message: "Kelas tujuan tidak valid." }, 400);

  const now = new Date();
  const clonedQuestId = `iq_${crypto.randomUUID()}`;
  await db.insert(ideQuests).values({
    id: clonedQuestId,
    teacherUserId: user.id,
    classId: targetClass.id,
    materialId: null,
    title: sourceQuest.title,
    mission: sourceQuest.mission,
    points: sourceQuest.points,
    dueDate: sourceQuest.dueDate,
    status: "published",
    bankStatus: "none",
    level: sourceQuest.level,
    createdAt: now,
    updatedAt: now
  });
  const [quest] = await db.select().from(ideQuests).where(eq(ideQuests.id, clonedQuestId)).limit(1);
  await writeActivityLog({ userId: user.id, action: "adopt", resourceType: "idequest", resourceId: questId, details: { targetClassId: targetClass.id, questId: clonedQuestId } });
  return c.json({ quest }, 201);
});

app.post("/teacher/bank-requests", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    itemType: "material" | "quest" | "rpp";
    itemId: string;
    targetClassId: string;
  };

  if (!body.itemType || !body.itemId || !body.targetClassId) return c.json({ message: "Payload tidak lengkap." }, 400);

  let ownerUserId: string | null = null;
  if (body.itemType === "material") {
    const [item] = await db.select().from(materials).where(eq(materials.id, body.itemId)).limit(1);
    if (!item || item.bankStatus !== "approved") return c.json({ message: "Materi tidak tersedia di bank." }, 404);
    if (item.teacherUserId === user.id) return c.json({ message: "Anda tidak perlu meminta materi Anda sendiri." }, 400);
    ownerUserId = item.teacherUserId;
  } else if (body.itemType === "quest") {
    const [item] = await db.select().from(ideQuests).where(eq(ideQuests.id, body.itemId)).limit(1);
    if (!item || item.bankStatus !== "approved") return c.json({ message: "IdeQuest tidak tersedia di bank." }, 404);
    if (item.teacherUserId === user.id) return c.json({ message: "Anda tidak perlu meminta IdeQuest Anda sendiri." }, 400);
    ownerUserId = item.teacherUserId;
  } else if (body.itemType === "rpp") {
    const [item] = await db.select().from(lessonPlans).where(eq(lessonPlans.id, body.itemId)).limit(1);
    if (!item || item.bankStatus !== "approved") return c.json({ message: "RPP tidak tersedia di bank." }, 404);
    if (item.teacherUserId === user.id) return c.json({ message: "Anda tidak perlu meminta RPP Anda sendiri." }, 400);
    ownerUserId = item.teacherUserId;
  }

  if (!ownerUserId) return c.json({ message: "Tipe item tidak dikenali." }, 400);

  const [targetClass] = await db.select().from(classes).where(eq(classes.id, body.targetClassId)).limit(1);
  if (!targetClass || targetClass.teacherUserId !== user.id) return c.json({ message: "Kelas target tidak valid." }, 400);

  const now = new Date();
  const requestId = `breq_${crypto.randomUUID()}`;
  await db.insert(bankRequests).values({
    id: requestId,
    requesterUserId: user.id,
    ownerUserId,
    targetClassId: body.targetClassId,
    itemType: body.itemType,
    itemId: body.itemId,
    status: "pending",
    createdAt: now,
    updatedAt: now
  });

  const [request] = await db.select().from(bankRequests).where(eq(bankRequests.id, requestId)).limit(1);
  return c.json({ request }, 201);
});

app.get("/teacher/bank-requests", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const [incoming, outgoing, userRows, materialRows, questRows, rppRows] = await Promise.all([
    db.select().from(bankRequests).where(eq(bankRequests.ownerUserId, user.id)).orderBy(desc(bankRequests.createdAt)),
    db.select().from(bankRequests).where(eq(bankRequests.requesterUserId, user.id)).orderBy(desc(bankRequests.createdAt)),
    db.select().from(users),
    db.select().from(materials),
    db.select().from(ideQuests),
    db.select().from(lessonPlans)
  ]);

  const mapRequest = (req: any) => {
    const requester = userRows.find((u) => u.id === req.requesterUserId);
    const owner = userRows.find((u) => u.id === req.ownerUserId);
    let itemTitle = "Item tidak diketahui";
    if (req.itemType === "material") {
      itemTitle = materialRows.find(m => m.id === req.itemId)?.title ?? itemTitle;
    } else if (req.itemType === "quest") {
      itemTitle = questRows.find(q => q.id === req.itemId)?.title ?? itemTitle;
    } else if (req.itemType === "rpp") {
      itemTitle = rppRows.find(r => r.id === req.itemId)?.topic ?? itemTitle;
    }
    
    return {
      ...req,
      requesterName: requester?.fullName ?? requester?.name ?? "Guru",
      ownerName: owner?.fullName ?? owner?.name ?? "Guru",
      itemTitle
    };
  };

  return c.json({
    incoming: incoming.map(mapRequest),
    outgoing: outgoing.map(mapRequest)
  });
});

app.patch("/teacher/bank-requests/:id", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { status: "approved" | "rejected" };
  if (!id || (body.status !== "approved" && body.status !== "rejected")) return c.json({ message: "Invalid payload." }, 400);

  const [request] = await db.select().from(bankRequests).where(eq(bankRequests.id, id)).limit(1);
  if (!request) return c.json({ message: "Permintaan tidak ditemukan." }, 404);
  if (request.ownerUserId !== user.id) return c.json({ message: "Anda tidak berhak memproses permintaan ini." }, 403);
  if (request.status !== "pending") return c.json({ message: "Permintaan sudah diproses." }, 400);

  await db.update(bankRequests).set({ status: body.status, updatedAt: new Date() }).where(eq(bankRequests.id, id));

  if (body.status === "approved") {
    const now = new Date();
    if (request.itemType === "material") {
      const [item] = await db.select().from(materials).where(eq(materials.id, request.itemId)).limit(1);
      if (item) {
        await db.insert(materials).values({
          id: `mat_${crypto.randomUUID()}`,
          teacherUserId: request.requesterUserId,
          classId: request.targetClassId,
          title: `${item.title} (Clone)`,
          type: item.type,
          description: item.description,
          content: item.content,
          options: item.options,
          status: "published",
          bankStatus: "none",
          createdAt: now,
          updatedAt: now
        });
      }
    } else if (request.itemType === "quest") {
      const [item] = await db.select().from(ideQuests).where(eq(ideQuests.id, request.itemId)).limit(1);
      if (item) {
        await db.insert(ideQuests).values({
          id: `iq_${crypto.randomUUID()}`,
          teacherUserId: request.requesterUserId,
          classId: request.targetClassId,
          materialId: null,
          title: `${item.title} (Clone)`,
          mission: item.mission,
          points: item.points,
          dueDate: item.dueDate,
          status: "published",
          bankStatus: "none",
          createdAt: now,
          updatedAt: now
        });
      }
    } else if (request.itemType === "rpp") {
      const [item] = await db.select().from(lessonPlans).where(eq(lessonPlans.id, request.itemId)).limit(1);
      if (item) {
        await db.insert(lessonPlans).values({
          id: `rpp_${crypto.randomUUID()}`,
          teacherUserId: request.requesterUserId,
          topic: `${item.topic} (Clone)`,
          grade: item.grade,
          duration: item.duration,
          model: item.model,
          content: item.content,
          bankStatus: "none",
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }

  return c.json({ ok: true });
});

async function getStudentClassIds(userId: string) {
  const rows = await db.select().from(classStudents).where(eq(classStudents.studentUserId, userId));
  return rows.map((row) => row.classId);
}

app.get("/student/classes", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const joinedRows = await db.select().from(classStudents).where(eq(classStudents.studentUserId, user.id));
  const allClasses = await db.select().from(classes).orderBy(desc(classes.updatedAt));
  const studentClasses = allClasses.filter((item) => joinedRows.some((row) => row.classId === item.id));

  return c.json({ classes: studentClasses });
});

app.post("/student/claim-welcome", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  if (user.welcomeBonusClaimed) {
    return c.json({ message: "Welcome bonus sudah diklaim sebelumnya." }, 400);
  }
  
  const newCoins = user.coins + 100;
  await db.update(users).set({ 
    welcomeBonusClaimed: true, 
    coins: newCoins,
    updatedAt: new Date() 
  }).where(eq(users.id, user.id));
  
  await db.insert(coinTransactions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    amount: 100,
    type: "welcome_bonus",
    description: "Bonus pendaftaran IdeTech",
    createdAt: new Date()
  });
  
  return c.json({ ok: true, bonus: 100 });
});

app.get("/student/coins/history", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const history = await db.select().from(coinTransactions).where(eq(coinTransactions.userId, user.id)).orderBy(desc(coinTransactions.createdAt)).limit(20);
  return c.json(history);
});

app.post("/student/check-in", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const now = new Date();
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD in WIB
  
  if (user.lastCheckInDate === today) {
    return c.json({ message: "Anda sudah melakukan check-in hari ini." }, 400);
  }
  
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  
  let newStreak = 1;
  if (user.lastCheckInDate === yesterdayStr) {
    newStreak = (user.checkInStreak % 7) + 1;
  }
  
  let reward = 10;
  if (newStreak === 2 || newStreak === 5) reward = 40;
  if (newStreak === 3 || newStreak === 6) reward = 100;
  if (newStreak === 7) reward = 500; // Gift Box Max
  
  const newCoins = user.coins + reward;
  
  await db.update(users).set({ 
    coins: newCoins, 
    checkInStreak: newStreak, 
    lastCheckInDate: today, 
    updatedAt: new Date() 
  }).where(eq(users.id, user.id));
  
  await db.insert(coinTransactions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    amount: reward,
    type: "check_in",
    description: `Hadiah Cek-in Harian (Hari ke-${newStreak})`,
    createdAt: new Date()
  });
  
  return c.json({ ok: true, coins: newCoins, streak: newStreak, reward, checkInDate: today });
});

app.post("/student/classes/join", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as { classCode?: string };
  const classCode = body.classCode?.trim().toUpperCase();

  if (!classCode) return c.json({ message: "ClassID wajib diisi." }, 400);

  const [targetClass] = await db.select().from(classes).where(eq(classes.classCode, classCode)).limit(1);
  if (!targetClass || targetClass.status !== "active") {
    return c.json({ message: "ClassID tidak ditemukan atau kelas tidak aktif." }, 404);
  }

  const [existing] = await db
    .select()
    .from(classStudents)
    .where(eq(classStudents.studentUserId, user.id));

  const studentClassIds = await getStudentClassIds(user.id);
  if (studentClassIds.includes(targetClass.id)) {
    return c.json({ message: "Siswa sudah tergabung di kelas ini." }, 409);
  }

  const now = new Date();
  const classStudentId = `cs_${crypto.randomUUID()}`;
  await db
    .insert(classStudents)
    .values({
      id: classStudentId,
      classId: targetClass.id,
      studentUserId: user.id,
      createdAt: now
    });

  const [joined] = await db.select().from(classStudents).where(eq(classStudents.id, classStudentId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "join",
    resourceType: "class_student",
    resourceId: classStudentId,
    details: { classId: targetClass.id, classCode }
  });

  return c.json({ class: targetClass, joined, alreadyHadClass: Boolean(existing) }, 201);
});

async function getLockedStatusMap(studentUserId: string, classIds: string[]) {
  if (classIds.length === 0) return new Map<string, boolean>();

  const classRows = await db.select().from(classes).where(inArray(classes.id, classIds));
  const allMaterials = await db.select().from(materials).where(and(inArray(materials.classId, classIds), eq(materials.status, "published")));
  const allQuests = await db.select().from(ideQuests).where(and(inArray(ideQuests.classId, classIds), eq(ideQuests.status, "published")));

  const materialProgress = await db.select().from(studentMaterialProgress).where(eq(studentMaterialProgress.studentUserId, studentUserId));
  const questProgress = await db.select().from(studentQuestProgress).where(eq(studentQuestProgress.studentUserId, studentUserId));

  const completedMaterialIds = new Set(materialProgress.filter(p => p.progress >= 100).map(p => p.materialId));
  const completedQuestIds = new Set(questProgress.filter(p => p.progress >= 100).map(p => p.questId));

  const lockedMap = new Map<string, boolean>();

  for (const cls of classRows) {
    const classId = cls.id;
    const teacherUnlockedLevel = cls.unlockedLevel;

    const classMaterials = allMaterials.filter(m => m.classId === classId);
    const classQuests = allQuests.filter(q => q.classId === classId);

    const levelsSet = new Set<number>([1]);
    classMaterials.forEach(m => levelsSet.add(m.level));
    classQuests.forEach(q => levelsSet.add(q.level));

    const sortedLevels = Array.from(levelsSet).sort((a, b) => a - b);
    const prerequisiteUnlocked = new Set<number>([1]);

    for (const lvl of sortedLevels) {
      if (lvl === 1) continue;
      const prevLevel = lvl - 1;
      if (prerequisiteUnlocked.has(prevLevel)) {
        const prevMaterials = classMaterials.filter(m => m.level === prevLevel);
        const prevQuests = classQuests.filter(q => q.level === prevLevel);

        const allPrevMaterialsCompleted = prevMaterials.every(m => completedMaterialIds.has(m.id));
        const allPrevQuestsCompleted = prevQuests.every(q => completedQuestIds.has(q.id));

        if (allPrevMaterialsCompleted && allPrevQuestsCompleted) {
          prerequisiteUnlocked.add(lvl);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    for (const lvl of sortedLevels) {
      const isLocked = lvl > teacherUnlockedLevel || !prerequisiteUnlocked.has(lvl);
      lockedMap.set(`${classId}_${lvl}`, isLocked);
    }
  }

  return lockedMap;
}

app.get("/student/materials", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const classIds = await getStudentClassIds(user.id);
  const progressRows = await db.select().from(studentMaterialProgress).where(eq(studentMaterialProgress.studentUserId, user.id));
  const allMaterials = await db.select().from(materials).orderBy(desc(materials.updatedAt));
  const lockedStatusMap = await getLockedStatusMap(user.id, classIds);
  const visibleMaterials = allMaterials
    .filter((material) => classIds.includes(material.classId) && material.status === "published")
    .map((material) => {
      const progress = progressRows.find((row) => row.materialId === material.id);
      const isLocked = lockedStatusMap.get(`${material.classId}_${material.level}`) ?? false;
      return {
        ...material,
        progress: progress?.progress ?? 0,
        completedAt: progress?.completedAt ?? null,
        isLocked
      };
    });

  return c.json({ materials: visibleMaterials });
});

app.post("/student/materials/:id/complete", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID materi wajib diisi." }, 400);
  const classIds = await getStudentClassIds(user.id);
  const [material] = await db.select().from(materials).where(eq(materials.id, id));
  if (!material || material.status !== "published" || !classIds.includes(material.classId)) {
    return c.json({ message: "Materi tidak ditemukan untuk kelas siswa aktif." }, 404);
  }

  const lockedStatusMap = await getLockedStatusMap(user.id, [material.classId]);
  if (lockedStatusMap.get(`${material.classId}_${material.level}`)) {
    return c.json({ message: "Materi ini masih terkunci." }, 403);
  }

  const now = new Date();
  const progressId = `smp_${crypto.randomUUID()}`;
  await db
    .insert(studentMaterialProgress)
    .values({
      id: progressId,
      studentUserId: user.id,
      materialId: id,
      progress: 100,
      completedAt: now,
      updatedAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        progress: 100,
        completedAt: now,
        updatedAt: now
      }
    });

  const [progress] = await db.select().from(studentMaterialProgress).where(eq(studentMaterialProgress.id, progressId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "complete",
    resourceType: "student_material_progress",
    resourceId: progressId,
    details: { materialId: id, progress: 100 }
  });

  return c.json({ progress });
});

app.get("/student/quests", requireRole(["student"]), requirePermission("quest.play"), async (c) => {
  const user = c.get("authUser");
  const classIds = await getStudentClassIds(user.id);
  const progressRows = await db.select().from(studentQuestProgress).where(eq(studentQuestProgress.studentUserId, user.id));
  const lockedStatusMap = await getLockedStatusMap(user.id, classIds);
  const dbQuests = (await db.select().from(ideQuests).orderBy(desc(ideQuests.updatedAt)))
    .filter((quest) => classIds.includes(quest.classId) && quest.status === "published")
    .map((quest) => {
      const progress = progressRows.find((row) => row.questId === quest.id);
      const isLocked = lockedStatusMap.get(`${quest.classId}_${quest.level}`) ?? false;
      return {
        id: quest.id,
        title: quest.title,
        points: quest.points,
        progress: progress?.progress ?? 0,
        earnedPoints: progress?.earnedPoints ?? 0,
        teacherFeedback: progress?.teacherFeedback ?? null,
        completedAt: progress?.completedAt ?? null,
        dueDate: quest.dueDate,
        mission: quest.mission,
        classId: quest.classId,
        materialId: quest.materialId,
        level: quest.level,
        isLocked
      };
    });
  const quests = dbQuests;

  return c.json({
    quests,
    meta: {
      pendingCount: quests.filter((quest) => quest.progress < 100).length,
      dueSoonCount: quests.filter((quest) => quest.progress < 100).length,
      earnedBadges: quests.filter((quest) => quest.progress >= 80).length,
      totalPoints: quests.reduce((total, quest) => total + quest.earnedPoints, 0) + (user.welcomeBonusClaimed ? 100 : 0)
    }
  });
});

app.post("/student/quests/:id/complete", requireRole(["student"]), requirePermission("quest.play"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID IdeQuest wajib diisi." }, 400);

  let body: any = {};
  const contentType = c.req.header("content-type") || "";
  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    body = await c.req.parseBody();
  }

  const answerText = (body.answerText as string)?.trim() || null;
  const file = body.file as File | undefined;
  const classIds = await getStudentClassIds(user.id);
  const [quest] = await db.select().from(ideQuests).where(eq(ideQuests.id, id));
  if (!quest || quest.status !== "published" || !classIds.includes(quest.classId)) {
    return c.json({ message: "IdeQuest tidak ditemukan untuk kelas siswa aktif." }, 404);
  }

  const lockedStatusMap = await getLockedStatusMap(user.id, [quest.classId]);
  if (lockedStatusMap.get(`${quest.classId}_${quest.level}`)) {
    return c.json({ message: "IdeQuest ini masih terkunci." }, 403);
  }

  if (quest.materialId) {
    const materialProgressRows = await db.select().from(studentMaterialProgress).where(eq(studentMaterialProgress.studentUserId, user.id));
    const materialProgress = materialProgressRows.find((row) => row.materialId === quest.materialId);
    if (!materialProgress || materialProgress.progress < 100) {
      return c.json({ message: "Selesaikan materi terkait sebelum mengumpulkan IdeQuest." }, 400);
    }
  }

  let submissionFileUrl = null;
  if (file) {
    try {
      const s3Config = getS3Config();
      const s3 = new S3Client({
        endpoint: s3Config.endpoint,
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey
        },
        forcePathStyle: true
      });

      const ext = file.name.split('.').pop() || "pdf";
      const key = `submissions/${user.id}-${Date.now()}.${ext}`;
      const buffer = await file.arrayBuffer();

      await s3.send(new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: file.type
      }));

      submissionFileUrl = `${s3Config.publicBaseUrl}/${key}`;
    } catch (err) {
      console.error("Gagal upload file jawaban ke RustFS:", err);
      await writeActivityLog({
        userId: user.id,
        action: "upload_error",
        resourceType: "quest_submission_file",
        details: { error: String(err), message: err instanceof Error ? err.message : "Unknown error" }
      }).catch(() => {});
      return c.json({ message: "Gagal mengunggah file jawaban." }, 500);
    }
  }

  const now = new Date();
  const progressId = `sqp_${crypto.randomUUID()}`;
  await db
    .insert(studentQuestProgress)
    .values({
      id: progressId,
      studentUserId: user.id,
      questId: id,
      progress: 100,
      earnedPoints: quest.points,
      submissionText: answerText,
      submissionFileUrl: submissionFileUrl,
      completedAt: now,
      updatedAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        progress: 100,
        earnedPoints: quest.points,
        submissionText: answerText,
        submissionFileUrl: submissionFileUrl,
        completedAt: now,
        updatedAt: now
      }
    });

  const [progress] = await db.select().from(studentQuestProgress).where(eq(studentQuestProgress.id, progressId)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "complete",
    resourceType: "student_quest_progress",
    resourceId: progressId,
    details: { questId: id, progress: 100, earnedPoints: quest.points }
  });

  return c.json({ progress });
});

app.get("/student/achievements", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const materialRows = await db.select().from(studentMaterialProgress).where(eq(studentMaterialProgress.studentUserId, user.id));
  const questRows = await db.select().from(studentQuestProgress).where(eq(studentQuestProgress.studentUserId, user.id));
  const completedMaterials = materialRows.filter((row) => row.progress >= 100).length;
  const completedQuests = questRows.filter((row) => row.progress >= 100).length;
  const totalPoints = questRows.reduce((total, row) => total + row.earnedPoints, 0);

  return c.json({
    achievements: [
      { id: "badge_material", title: "Pembaca Materi", description: "Selesaikan materi dari guru.", value: completedMaterials, unlocked: completedMaterials > 0 },
      { id: "badge_quest", title: "Penakluk IdeQuest", description: "Kumpulkan IdeQuest kelas.", value: completedQuests, unlocked: completedQuests > 0 },
      { id: "badge_points", title: "Pemburu Poin", description: "Raih poin dari quest.", value: totalPoints, unlocked: totalPoints >= 100 }
    ],
    meta: {
      completedMaterials,
      completedQuests,
      totalPoints
    }
  });
});

app.get("/student/indicators", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const hasReportAccess = user.permissions.includes("report.view");
  const classIds = await getStudentClassIds(user.id);
  const queryClassId = c.req.query("classId");
  const allClasses = await db.select().from(classes).orderBy(desc(classes.updatedAt));
  const studentClasses = allClasses.filter((item) => classIds.includes(item.id));
  const activeClass = (queryClassId ? studentClasses.find(c => c.id === queryClassId) : null) ?? studentClasses[0] ?? null;
  const materialProgressRows = await db.select().from(studentMaterialProgress).where(eq(studentMaterialProgress.studentUserId, user.id));
  const visibleMaterials = (await db.select().from(materials))
    .filter((material) => classIds.includes(material.classId) && material.status === "published");
  const questProgressRows = await db.select().from(studentQuestProgress).where(eq(studentQuestProgress.studentUserId, user.id));
  const dbQuests = (await db.select().from(ideQuests)).filter((quest) => classIds.includes(quest.classId) && quest.status === "published");
  const pendingCount = dbQuests.filter((quest) => (questProgressRows.find((row) => row.questId === quest.id)?.progress ?? 0) < 100).length;
  const dueSoonCount = pendingCount;
  const earnedBadges = questProgressRows.filter((row) => row.progress >= 100).length;
  const basePoints = questProgressRows.reduce((total, progress) => total + progress.earnedPoints, 0);
  const totalPoints = basePoints + (user.welcomeBonusClaimed ? 100 : 0);
  const radarWarning = dbQuests.some((quest) => quest.points < 100);
  const completedMaterials = visibleMaterials.filter((material) => (materialProgressRows.find((row) => row.materialId === material.id)?.progress ?? 0) >= 100).length;
  const completedQuests = dbQuests.filter((quest) => (questProgressRows.find((row) => row.questId === quest.id)?.progress ?? 0) >= 100).length;
  const totalUnits = visibleMaterials.length + dbQuests.length;
  const completedUnits = completedMaterials + completedQuests;
  const levelValue = 1 + completedQuests;
  const chapterValue = activeClass ? Math.max(1, visibleMaterials.length) : 1;
  const chapterLabel = activeClass ? activeClass.name : "Belum Masuk Kelas";
  const chapterProgressLabel = totalUnits > 0 ? `${completedUnits}/${totalUnits}` : "0/0";
  const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const formatTimeLeft = (dateString?: string | null) => {
    if (!dateString) return "Bebas";
    const due = new Date(dateString);
    if (isNaN(due.getTime())) return dateString; 
    
    const diff = due.getTime() - Date.now();
    if (diff <= 0) return "Berakhir";
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (d > 0) return `${d}h ${h}j`;
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
  };

  const nextMaterialDueDate = visibleMaterials
    .map((m) => (m.options as any)?.dueDate as string | undefined)
    .filter(Boolean)
    .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0];
    
  const nextQuestDueDate = dbQuests
    .map((q) => q.dueDate)
    .filter(Boolean)
    .sort((a, b) => {
      const ta = new Date(a).getTime();
      const tb = new Date(b).getTime();
      if (isNaN(ta) || isNaN(tb)) return 0;
      return ta - tb;
    })[0];

  let leaderboard: Array<{ name: string; avatarUrl: string | null; points: number; isMe: boolean }> = [];
  if (activeClass) {
    const studentsInClass = await db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        welcomeBonusClaimed: users.welcomeBonusClaimed,
      })
      .from(classStudents)
      .innerJoin(users, eq(classStudents.studentUserId, users.id))
      .where(eq(classStudents.classId, activeClass.id));

    const studentIds = studentsInClass.map((s) => s.id);
    if (studentIds.length > 0) {
      const allQuestProgress = await db
        .select({
          studentUserId: studentQuestProgress.studentUserId,
          earnedPoints: studentQuestProgress.earnedPoints,
        })
        .from(studentQuestProgress)
        .where(inArray(studentQuestProgress.studentUserId, studentIds));

      leaderboard = studentsInClass.map((s) => {
        const studentProgress = allQuestProgress.filter((p) => p.studentUserId === s.id);
        const basePoints = studentProgress.reduce((sum, p) => sum + p.earnedPoints, 0);
        const total = basePoints + (s.welcomeBonusClaimed ? 100 : 0);
        return {
          name: s.name,
          avatarUrl: s.avatarUrl,
          points: total,
          isMe: s.id === user.id
        };
      });
      leaderboard.sort((a, b) => b.points - a.points);
    }
  }

  return c.json({
    left: [
      {
        id: "map",
        title: "Map",
        subtitle: formatTimeLeft(nextMaterialDueDate),
        targetDate: nextMaterialDueDate,
        badge: undefined,
        connected: pendingCount > 0
      },
      {
        id: "quest",
        title: "Quest",
        subtitle: formatTimeLeft(nextQuestDueDate),
        targetDate: nextQuestDueDate,
        badge: pendingCount > 0 ? String(pendingCount) : undefined,
        connected: pendingCount > 0
      },
      {
        id: "rank",
        title: "Piala",
        subtitle: "Season 1",
        badge: earnedBadges > 0 ? String(earnedBadges * 10) : undefined,
        connected: earnedBadges > 0
      }
    ],
    right: [
      {
        id: "tasks",
        title: "Tugas aktif",
        subtitle: formatTimeLeft(nextMaterialDueDate || nextQuestDueDate),
        targetDate: nextMaterialDueDate || nextQuestDueDate,
        badge: dueSoonCount > 0 ? String(dueSoonCount) : undefined,
        connected: dueSoonCount > 0
      },
      {
        id: "coins",
        title: "Poin penuh",
        subtitle: "Full",
        badge: String(totalPoints),
        connected: totalPoints > 0
      },
      {
        id: "radar",
        title: "Radar",
        subtitle: "Terbatas",
        badge: hasReportAccess && radarWarning ? "!" : undefined,
        connected: hasReportAccess && radarWarning
      }
    ],
    nav: {
      studio: dueSoonCount > 0 || pendingCount > 0,
      rank: false,
      map: false,
      quest: dueSoonCount > 0 || pendingCount > 0,
      profile: false
    },
    meta: {
      chapter: chapterLabel,
      chapterProgress: chapterProgressLabel,
      levelButton: `Level ${levelValue}`,
      progressPercent,
      summary: activeClass ? `${activeClass.name} • ${activeClass.subject}` : "Gabung ke kelas untuk mulai progres",
      stats: {
        totalPoints,
        completedQuests,
        completedMaterials,
        earnedBadges,
        classesJoined: classIds.length
      }
    },
    leaderboard
  });
});

app.get("/parent/reports", requireRole(["parent"]), requirePermission("report.view"), async (c) => {
  const user = c.get("authUser");

  const childrenRows = await db
    .select({
      studentId: parentStudents.studentUserId,
      studentName: users.name,
      studentEmail: users.email,
      relationship: parentStudents.relationship,
      avatarUrl: users.avatarUrl,
      schoolName: users.schoolName
    })
    .from(parentStudents)
    .innerJoin(users, eq(parentStudents.studentUserId, users.id))
    .where(eq(parentStudents.parentUserId, user.id));

  const children = await Promise.all(
    childrenRows.map(async (child) => {
      const materialProgressRows = await db
        .select({
          id: materials.id,
          title: materials.title,
          type: materials.type,
          progress: studentMaterialProgress.progress,
          updatedAt: studentMaterialProgress.updatedAt
        })
        .from(studentMaterialProgress)
        .innerJoin(materials, eq(studentMaterialProgress.materialId, materials.id))
        .where(eq(studentMaterialProgress.studentUserId, child.studentId))
        .orderBy(desc(studentMaterialProgress.updatedAt))
        .limit(10);

      const questProgressRows = await db
        .select({
          id: ideQuests.id,
          title: ideQuests.title,
          points: ideQuests.points,
          earnedPoints: studentQuestProgress.earnedPoints,
          progress: studentQuestProgress.progress,
          updatedAt: studentQuestProgress.updatedAt
        })
        .from(studentQuestProgress)
        .innerJoin(ideQuests, eq(studentQuestProgress.questId, ideQuests.id))
        .where(eq(studentQuestProgress.studentUserId, child.studentId))
        .orderBy(desc(studentQuestProgress.updatedAt))
        .limit(10);

      const totalMaterials = materialProgressRows.length;
      const completedMaterials = materialProgressRows.filter((row) => row.progress >= 100).length;
      const totalQuests = questProgressRows.length;
      const completedQuests = questProgressRows.filter((row) => row.progress >= 100).length;

      const total = totalMaterials + totalQuests;
      const completed = completedMaterials + completedQuests;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      const allActivities = [
        ...materialProgressRows.map(m => ({ ...m, category: 'material' })),
        ...questProgressRows.map(q => ({ ...q, category: 'quest' }))
      ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10);

      const latestJournals = await db
        .select({
          id: teacherJournals.id,
          anecdote: teacherJournals.anecdote,
          createdAt: teacherJournals.createdAt,
          teacherFullName: users.fullName,
          teacherName: users.name
        })
        .from(teacherJournals)
        .innerJoin(classes, eq(teacherJournals.teacherUserId, classes.teacherUserId))
        .innerJoin(classStudents, eq(classes.id, classStudents.classId))
        .innerJoin(users, eq(teacherJournals.teacherUserId, users.id))
        .where(eq(classStudents.studentUserId, child.studentId))
        .orderBy(desc(teacherJournals.createdAt))
        .limit(30);

      // Deduplicate journals in case student is in multiple classes of the same teacher
      const uniqueJournals = Array.from(new Map(latestJournals.map(j => [j.id, j])).values());
      const teacherNotes = [];

      for (const journal of uniqueJournals) {
        if (!journal.anecdote) continue;
        
        const teacherDisplayName = journal.teacherFullName || journal.teacherName || 'Guru';
        const noteDate = journal.createdAt;
        let finalNote = "";
        
        if (!journal.anecdote.includes('@')) {
          finalNote = journal.anecdote;
        } else {
          const parts = journal.anecdote.split('@');
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const partWords = part.trim().split(/\s+/);
            if (partWords.length === 0 || !partWords[0]) continue;

            const firstWordPart = partWords[0].replace(/[,.:;]/g, '').toLowerCase();
            const studentWordsLower = child.studentName.toLowerCase().split(/\s+/);

            if (studentWordsLower.includes(firstWordPart)) {
              let matchCount = 1;
              const startIndex = studentWordsLower.indexOf(firstWordPart);
              
              for (let j = 1; j < partWords.length && (startIndex + j) < studentWordsLower.length; j++) {
                const currentPartWord = partWords[j].replace(/[,.:;]/g, '').toLowerCase();
                if (currentPartWord === studentWordsLower[startIndex + j]) {
                  matchCount++;
                } else {
                  break;
                }
              }

              const note = partWords.slice(matchCount).join(' ').trim();
              if (note) {
                finalNote = note;
                break;
              }
            }
          }
        }
        
        if (finalNote) {
          teacherNotes.push({
            id: journal.id,
            note: finalNote,
            date: noteDate,
            teacherName: teacherDisplayName
          });
          
          if (teacherNotes.length >= 5) break; // Return max 5 recent notes
        }
      }

      return {
        id: child.studentId,
        name: child.studentName,
        progress,
        teacherNotes,
        avatarUrl: child.avatarUrl,
        schoolName: child.schoolName,
        recentActivities: allActivities
      };
    })
  );

  return c.json({ children });
});

app.get("/parent/children", requireRole(["parent"]), requirePermission("report.view"), async (c) => {
  const user = c.get("authUser");

  const rows = await db
    .select({
      id: parentStudents.id,
      studentId: parentStudents.studentUserId,
      studentName: users.name,
      studentEmail: users.email,
      relationship: parentStudents.relationship,
      createdAt: parentStudents.createdAt
    })
    .from(parentStudents)
    .innerJoin(users, eq(parentStudents.studentUserId, users.id))
    .where(eq(parentStudents.parentUserId, user.id));

  return c.json({ children: rows });
});

app.get("/parent/search-students", requireRole(["parent"]), requirePermission("report.view"), async (c) => {
  const query = c.req.query("q")?.toLowerCase() || "";
  
  if (query.length < 2) {
    return c.json({ students: [] });
  }

  const studentUsers = await db
    .select({
      id: users.id,
      name: users.name,
      fullName: users.fullName,
      email: users.email,
      avatarUrl: users.avatarUrl
    })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(
      eq(roles.name, 'student'),
      or(
        like(users.name, `%${query}%`),
        like(users.email, `%${query}%`),
        like(users.fullName, `%${query}%`)
      )
    ))
    .limit(10);

  return c.json({ students: studentUsers });
});

app.post("/parent/connect", requireRole(["parent"]), requirePermission("report.view"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    studentEmail?: string;
    relationship?: string;
  };

  const studentEmail = body.studentEmail?.trim();
  const relationship = body.relationship?.trim() || "Orang Tua";

  if (!studentEmail) {
    return c.json({ message: "Email siswa wajib diisi." }, 400);
  }

  const [student] = await db.select().from(users).where(eq(users.email, studentEmail)).limit(1);

  if (!student) {
    return c.json({ message: "User siswa dengan email tersebut tidak ditemukan." }, 404);
  }

  const [existing] = await db
    .select()
    .from(parentStudents)
    .where(
      and(eq(parentStudents.parentUserId, user.id), eq(parentStudents.studentUserId, student.id))
    )
    .limit(1);

  if (existing) {
    return c.json({ message: "Anda sudah terhubung dengan siswa ini." }, 409);
  }

  const now = new Date();
  const id = `ps_${nanoid(12)}`;
  await db.insert(parentStudents).values({
    id,
    parentUserId: user.id,
    studentUserId: student.id,
    relationship,
    createdAt: now
  });

  const [created] = await db.select().from(parentStudents).where(eq(parentStudents.id, id)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "parent_student",
    resourceId: id,
    details: { parentUserId: user.id, studentUserId: student.id, relationship }
  });

  return c.json({ connection: created }, 201);
});

// Consultation endpoints for Parents
app.get("/parent/teachers", requireRole(["parent"]), async (c) => {
  const user = c.get("authUser");
  const studentId = c.req.query("studentId");
  if (!studentId) return c.json({ message: "studentId required" }, 400);

  // Check relationship
  const [ps] = await db.select().from(parentStudents)
    .where(and(eq(parentStudents.parentUserId, user.id), eq(parentStudents.studentUserId, studentId))).limit(1);
  if (!ps) return c.json({ message: "Unauthorized" }, 403);

  // Get teachers for this student
  const teacherRows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    avatarUrl: users.avatarUrl
  })
    .from(classStudents)
    .innerJoin(classes, eq(classStudents.classId, classes.id))
    .innerJoin(users, eq(classes.teacherUserId, users.id))
    .where(eq(classStudents.studentUserId, studentId));
  
  // Dedup
  const uniqueTeachers = Array.from(new Map(teacherRows.map(t => [t.id, t])).values());

  return c.json({ teachers: uniqueTeachers });
});

app.get("/parent/consultations", requireRole(["parent"]), async (c) => {
  const user = c.get("authUser");
  const threads = await db.select({
    id: consultationThreads.id,
    studentId: consultationThreads.studentUserId,
    teacherId: consultationThreads.teacherUserId,
    topic: consultationThreads.topic,
    status: consultationThreads.status,
    updatedAt: consultationThreads.updatedAt,
    teacherName: users.name
  })
    .from(consultationThreads)
    .innerJoin(users, eq(consultationThreads.teacherUserId, users.id))
    .where(eq(consultationThreads.parentUserId, user.id))
    .orderBy(desc(consultationThreads.updatedAt));

  return c.json({ threads });
});

app.post("/parent/consultations", requireRole(["parent"]), async (c) => {
  const user = c.get("authUser");
  const body = await c.req.json().catch(() => ({}));
  if (!body.studentId || !body.teacherId || !body.topic || !body.content) {
    return c.json({ message: "Data tidak lengkap" }, 400);
  }

  // verify ps
  const [ps] = await db.select().from(parentStudents)
    .where(and(eq(parentStudents.parentUserId, user.id), eq(parentStudents.studentUserId, body.studentId))).limit(1);
  if (!ps) return c.json({ message: "Unauthorized" }, 403);

  const threadId = `thr_${nanoid(12)}`;
  const now = new Date();

  await db.insert(consultationThreads).values({
    id: threadId,
    studentUserId: body.studentId,
    parentUserId: user.id,
    teacherUserId: body.teacherId,
    topic: body.topic,
    createdAt: now,
    updatedAt: now
  });

  await db.insert(consultationMessages).values({
    id: `msg_${nanoid(12)}`,
    threadId,
    senderUserId: user.id,
    content: body.content,
    createdAt: now
  });

  const [thread] = await db.select().from(consultationThreads).where(eq(consultationThreads.id, threadId)).limit(1);
  broadcastToTeacher(body.teacherId, "consultation", {
    threadId,
    kind: "new_thread",
    senderUserId: user.id,
    senderName: user.name,
    createdAt: now.toISOString()
  });
  return c.json({ thread }, 201);
});

app.get("/parent/consultations/:id", requireRole(["parent"]), async (c) => {
  const user = c.get("authUser");
  const threadId = c.req.param("id");

  const [thread] = await db.select().from(consultationThreads)
    .where(and(eq(consultationThreads.id, String(threadId)), eq(consultationThreads.parentUserId, user.id))).limit(1);
  
  if (!thread) return c.json({ message: "Not found" }, 404);

  const messages = await db.select({
    id: consultationMessages.id,
    senderId: consultationMessages.senderUserId,
    content: consultationMessages.content,
    createdAt: consultationMessages.createdAt,
    senderName: users.name
  })
    .from(consultationMessages)
    .innerJoin(users, eq(consultationMessages.senderUserId, users.id))
    .where(eq(consultationMessages.threadId, String(threadId)))
    .orderBy(consultationMessages.createdAt);

  return c.json({ thread, messages });
});

app.post("/parent/consultations/:id/reply", requireRole(["parent"]), async (c) => {
  const user = c.get("authUser");
  const threadId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  if (!body.content) return c.json({ message: "Pesan kosong" }, 400);

  const [thread] = await db.select().from(consultationThreads)
    .where(and(eq(consultationThreads.id, String(threadId)), eq(consultationThreads.parentUserId, user.id))).limit(1);
  if (!thread) return c.json({ message: "Not found" }, 404);

  const now = new Date();
  const msgId = `msg_${nanoid(12)}`;
  await db.insert(consultationMessages).values({
    id: msgId,
    threadId: String(threadId),
    senderUserId: user.id,
    content: body.content,
    createdAt: now
  });

  await db.update(consultationThreads).set({ updatedAt: now }).where(eq(consultationThreads.id, String(threadId)));

  // Broadcast new message to SSE clients
  broadcastToThread(String(threadId), "message", {
    id: msgId,
    threadId: String(threadId),
    senderUserId: user.id,
    senderName: user.name,
    content: body.content,
    createdAt: now.toISOString()
  });
  if (thread.teacherUserId) {
    broadcastToTeacher(thread.teacherUserId, "consultation", {
      threadId: String(threadId),
      kind: "message",
      senderUserId: user.id,
      senderName: user.name,
      createdAt: now.toISOString()
    });
  }

  return c.json({ success: true }, 201);
});

// Consultation endpoints for Teacher
app.get("/teacher/consultations", requireRole(["teacher"]), async (c) => {
  const user = c.get("authUser");
  const threads = await db.select({
    id: consultationThreads.id,
    studentId: consultationThreads.studentUserId,
    parentId: consultationThreads.parentUserId,
    topic: consultationThreads.topic,
    status: consultationThreads.status,
    updatedAt: consultationThreads.updatedAt,
    parentName: users.name
  })
    .from(consultationThreads)
    .innerJoin(users, eq(consultationThreads.parentUserId, users.id))
    .where(eq(consultationThreads.teacherUserId, user.id))
    .orderBy(desc(consultationThreads.updatedAt));

  return c.json({ threads });
});

app.get("/teacher/consultations/stream", requireRole(["teacher"]), async (c) => {
  const user = c.get("authUser");
  const controller = { enqueue: (_: string) => {}, close: () => {} };

  const stream = new ReadableStream({
    start(ctrl) {
      controller.enqueue = (data: string) => ctrl.enqueue(new TextEncoder().encode(data));
      controller.close = () => ctrl.close();

      if (!teacherConsultationClients.has(user.id)) teacherConsultationClients.set(user.id, new Set());
      teacherConsultationClients.get(user.id)!.add(controller);

      const ping = setInterval(() => {
        try {
          ctrl.enqueue(new TextEncoder().encode(`:heartbeat\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 25000);

      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(ping);
        teacherConsultationClients.get(user.id)?.delete(controller);
        if (teacherConsultationClients.get(user.id)?.size === 0) {
          teacherConsultationClients.delete(user.id);
        }
      });
    }
  });

  const unreadCount = await (async () => {
    const threads = await db.select({ id: consultationThreads.id })
      .from(consultationThreads)
      .where(and(eq(consultationThreads.teacherUserId, user.id), eq(consultationThreads.status, "open")));

    if (threads.length === 0) return 0;

    const threadIds = threads.map((t) => t.id);
    const recentMessages = await db.select({
      id: consultationMessages.id,
      senderUserId: consultationMessages.senderUserId
    })
      .from(consultationMessages)
      .where(inArray(consultationMessages.threadId, threadIds))
      .orderBy(desc(consultationMessages.createdAt))
      .limit(50);

    return recentMessages.filter((m) => m.senderUserId !== user.id).length;
  })();

  controller.enqueue(`event: consultation\ndata: ${JSON.stringify({ unreadCount })}\n\n`);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
});

// Unread count for teacher badge notification
app.get("/teacher/consultations/unread-count", requireRole(["teacher"]), async (c) => {
  const user = c.get("authUser");
  // Get all teacher's open threads
  const threads = await db.select({ id: consultationThreads.id })
    .from(consultationThreads)
    .where(and(eq(consultationThreads.teacherUserId, user.id), eq(consultationThreads.status, "open")));

  if (threads.length === 0) return c.json({ count: 0 });

  const threadIds = threads.map(t => t.id);
  // Count messages from parents (non-teacher senders) in these threads
  const recentMessages = await db.select({
    id: consultationMessages.id,
    senderUserId: consultationMessages.senderUserId
  })
    .from(consultationMessages)
    .where(and(
      inArray(consultationMessages.threadId, threadIds),
    ))
    .orderBy(desc(consultationMessages.createdAt))
    .limit(50);

  // Filter out messages sent by the teacher themselves to get "incoming" messages
  const unreadCount = recentMessages.filter(m => m.senderUserId !== user.id).length;
  return c.json({ count: Math.min(unreadCount, 99) });
});

// List students with their linked parents for the current teacher
app.get("/teacher/consultations/students", requireRole(["teacher"]), async (c) => {
  const user = c.get("authUser");

  // Get classes owned by this teacher
  const teacherClasses = await db.select({ id: classes.id })
    .from(classes)
    .where(eq(classes.teacherUserId, user.id));

  if (teacherClasses.length === 0) {
    return c.json({ students: [] });
  }

  const classIds = teacherClasses.map(c => c.id);

  // Get distinct students in those classes
  const studentsInClasses = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    avatarUrl: users.avatarUrl,
    classId: classStudents.classId
  })
    .from(classStudents)
    .innerJoin(users, eq(classStudents.studentUserId, users.id))
    .where(inArray(classStudents.classId, classIds));

  const studentIds = [...new Set(studentsInClasses.map(s => s.id))];
  if (studentIds.length === 0) {
    return c.json({ students: [] });
  }

  // Get parents linked to those students
  const parents = await db.select({
    studentUserId: parentStudents.studentUserId,
    parentUserId: parentStudents.parentUserId,
    relationship: parentStudents.relationship,
    parentName: users.name,
    parentEmail: users.email
  })
    .from(parentStudents)
    .innerJoin(users, eq(parentStudents.parentUserId, users.id))
    .where(inArray(parentStudents.studentUserId, studentIds));

  const parentsByStudent = new Map<string, typeof parents>();
  for (const p of parents) {
    if (!parentsByStudent.has(p.studentUserId)) {
      parentsByStudent.set(p.studentUserId, []);
    }
    parentsByStudent.get(p.studentUserId)!.push(p);
  }

  const students = studentsInClasses.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    avatarUrl: s.avatarUrl,
    classId: s.classId,
    parents: parentsByStudent.get(s.id) ?? []
  }));

  return c.json({ students });
});

// Teacher creates a new consultation thread with a parent
app.post("/teacher/consultations", requireRole(["teacher"]), async (c) => {
  const user = c.get("authUser");
  const body = await c.req.json().catch(() => ({}));

  if (!body.studentId || !body.parentId || !body.topic || !body.content) {
    return c.json({ message: "Data tidak lengkap" }, 400);
  }

  // Verify the student belongs to one of the teacher's classes
  const teacherClasses = await db.select({ id: classes.id })
    .from(classes)
    .where(eq(classes.teacherUserId, user.id));

  const classIds = teacherClasses.map(c => c.id);
  if (classIds.length === 0) {
    return c.json({ message: "Unauthorized" }, 403);
  }

  const [membership] = await db.select()
    .from(classStudents)
    .where(and(
      eq(classStudents.studentUserId, body.studentId),
      inArray(classStudents.classId, classIds)
    ))
    .limit(1);

  if (!membership) {
    return c.json({ message: "Unauthorized" }, 403);
  }

  // Verify the parent is linked to the student
  const [ps] = await db.select()
    .from(parentStudents)
    .where(and(
      eq(parentStudents.parentUserId, body.parentId),
      eq(parentStudents.studentUserId, body.studentId)
    ))
    .limit(1);

  if (!ps) {
    return c.json({ message: "Orang tua tidak terhubung dengan murid ini" }, 400);
  }

  // Check for duplicate open thread between same teacher, parent, and student
  const [existing] = await db.select({ id: consultationThreads.id })
    .from(consultationThreads)
    .where(and(
      eq(consultationThreads.teacherUserId, user.id),
      eq(consultationThreads.parentUserId, body.parentId),
      eq(consultationThreads.studentUserId, body.studentId),
      eq(consultationThreads.status, "open")
    ))
    .limit(1);

  if (existing) {
    return c.json({ message: "Konsultasi terbuka sudah ada", threadId: existing.id }, 409);
  }

  const threadId = `thr_${nanoid(12)}`;
  const now = new Date();

  await db.insert(consultationThreads).values({
    id: threadId,
    studentUserId: body.studentId,
    parentUserId: body.parentId,
    teacherUserId: user.id,
    topic: body.topic,
    createdAt: now,
    updatedAt: now
  });

  await db.insert(consultationMessages).values({
    id: `msg_${nanoid(12)}`,
    threadId,
    senderUserId: user.id,
    content: body.content,
    createdAt: now
  });

  const [thread] = await db.select({
    id: consultationThreads.id,
    topic: consultationThreads.topic,
    status: consultationThreads.status,
    parentName: users.name
  })
    .from(consultationThreads)
    .innerJoin(users, eq(consultationThreads.parentUserId, users.id))
    .where(eq(consultationThreads.id, threadId))
    .limit(1);

  broadcastToTeacher(user.id, "consultation", {
    threadId,
    kind: "new_thread",
    senderUserId: user.id,
    senderName: user.name,
    createdAt: now.toISOString()
  });

  broadcastToThread(threadId, "message", {
    id: threadId,
    threadId,
    senderUserId: user.id,
    senderName: user.name,
    content: body.content,
    createdAt: now.toISOString()
  });

  return c.json({ thread }, 201);
});

app.get("/teacher/consultations/:id", requireRole(["teacher"]), async (c) => {
  const user = c.get("authUser");
  const threadId = c.req.param("id");

  const [thread] = await db.select({
    id: consultationThreads.id,
    topic: consultationThreads.topic,
    status: consultationThreads.status,
    parentName: users.name
  }).from(consultationThreads)
    .innerJoin(users, eq(consultationThreads.parentUserId, users.id))
    .where(and(eq(consultationThreads.id, String(threadId)), eq(consultationThreads.teacherUserId, user.id))).limit(1);
  
  if (!thread) return c.json({ message: "Not found" }, 404);

  const messages = await db.select({
    id: consultationMessages.id,
    senderId: consultationMessages.senderUserId,
    content: consultationMessages.content,
    createdAt: consultationMessages.createdAt,
    senderName: users.name
  })
    .from(consultationMessages)
    .innerJoin(users, eq(consultationMessages.senderUserId, users.id))
    .where(eq(consultationMessages.threadId, String(threadId)))
    .orderBy(consultationMessages.createdAt);

  return c.json({ thread, messages });
});

app.post("/teacher/consultations/:id/reply", requireRole(["teacher"]), async (c) => {
  const user = c.get("authUser");
  const threadId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  if (!body.content) return c.json({ message: "Pesan kosong" }, 400);

  const [thread] = await db.select().from(consultationThreads)
    .where(and(eq(consultationThreads.id, String(threadId)), eq(consultationThreads.teacherUserId, user.id))).limit(1);
  if (!thread) return c.json({ message: "Not found" }, 404);

  const now = new Date();
  const msgId = `msg_${nanoid(12)}`;
  await db.insert(consultationMessages).values({
    id: msgId,
    threadId: String(threadId),
    senderUserId: user.id,
    content: body.content,
    createdAt: now
  });

  await db.update(consultationThreads).set({ updatedAt: now }).where(eq(consultationThreads.id, String(threadId)));

  // Broadcast new message to SSE clients
  broadcastToThread(String(threadId), "message", {
    id: msgId,
    threadId: String(threadId),
    senderUserId: user.id,
    senderName: user.name,
    content: body.content,
    createdAt: now.toISOString()
  });
  if (thread.parentUserId) {
    broadcastToTeacher(thread.teacherUserId, "consultation", {
      threadId: String(threadId),
      kind: "message",
      senderUserId: user.id,
      senderName: user.name,
      createdAt: now.toISOString()
    });
  }

  return c.json({ success: true }, 201);
});

app.post("/teacher/consultations/:id/close", requireRole(["teacher"]), async (c) => {
  const user = c.get("authUser");
  const threadId = c.req.param("id");

  const [thread] = await db.select().from(consultationThreads)
    .where(and(eq(consultationThreads.id, String(threadId)), eq(consultationThreads.teacherUserId, user.id))).limit(1);
  if (!thread) return c.json({ message: "Not found" }, 404);

  await db.update(consultationThreads).set({ status: "closed", updatedAt: new Date() }).where(eq(consultationThreads.id, String(threadId)));

  return c.json({ success: true });
});

// ─── Real-Time SSE Endpoints ──────────────────────────────────────────────────

// SSE stream: client connects and receives real-time events for a thread
app.get("/chat/events", authRequired, async (c) => {
  const user = c.get("authUser");
  const threadId = c.req.query("threadId");
  if (!threadId) return c.json({ message: "threadId required" }, 400);

  // Verify user is a participant (parent or teacher)
  const [thread] = await db.select().from(consultationThreads)
    .where(eq(consultationThreads.id, threadId)).limit(1);
  if (!thread) return c.json({ message: "Not found" }, 404);
  if (thread.parentUserId !== user.id && thread.teacherUserId !== user.id) {
    return c.json({ message: "Unauthorized" }, 403);
  }

  const controller = { enqueue: (_: string) => {}, close: () => {} };

  const stream = new ReadableStream({
    start(ctrl) {
      controller.enqueue = (data: string) => ctrl.enqueue(new TextEncoder().encode(data));
      controller.close = () => ctrl.close();

      // Register client
      if (!sseClients.has(threadId)) sseClients.set(threadId, new Set());
      sseClients.get(threadId)!.add(controller);

      // Mark user as online
      onlinePresence.set(user.id, { threadId, lastSeen: Date.now() });

      // Send initial online list
      const onlineUsers = getOnlineUsersInThread(threadId);
      ctrl.enqueue(new TextEncoder().encode(
        `event: presence\ndata: ${JSON.stringify({ onlineUserIds: onlineUsers })}\n\n`
      ));

      // Notify others this user came online
      broadcastToThread(threadId, "presence", { onlineUserIds: getOnlineUsersInThread(threadId) });

      // Heartbeat every 25s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          onlinePresence.set(user.id, { threadId, lastSeen: Date.now() });
          ctrl.enqueue(new TextEncoder().encode(`:heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);

      // Cleanup on disconnect
      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        sseClients.get(threadId)?.delete(controller);
        if (sseClients.get(threadId)?.size === 0) sseClients.delete(threadId);
        onlinePresence.delete(user.id);
        // Notify others this user went offline
        broadcastToThread(threadId, "presence", { onlineUserIds: getOnlineUsersInThread(threadId) });
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
});

// Typing indicator: POST with { threadId, isTyping }
app.post("/chat/typing", authRequired, async (c) => {
  const user = c.get("authUser");
  const body = await c.req.json().catch(() => ({})) as { threadId?: string; isTyping?: boolean };
  if (!body.threadId) return c.json({ message: "threadId required" }, 400);

  const key = `${body.threadId}:${user.id}`;

  if (body.isTyping) {
    // Broadcast typing started
    broadcastToThread(body.threadId, "typing", { userId: user.id, isTyping: true });

    // Auto-stop typing after 4s if no more updates
    if (typingState.has(key)) clearTimeout(typingState.get(key)!);
    typingState.set(key, setTimeout(() => {
      broadcastToThread(body.threadId!, "typing", { userId: user.id, isTyping: false });
      typingState.delete(key);
    }, 4000));
  } else {
    if (typingState.has(key)) {
      clearTimeout(typingState.get(key)!);
      typingState.delete(key);
    }
    broadcastToThread(body.threadId, "typing", { userId: user.id, isTyping: false });
  }

  return c.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────

app.get("/permissions/matrix", authRequired, async (c) => {
  const rows = await db
    .select({
      role: roles.name,
      permission: permissions.name

    })
    .from(rolePermissions)
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

  return c.json({ matrix: rows });
});

async function generateClassCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `IDT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [existing] = await db.select({ id: classes.id }).from(classes).where(eq(classes.classCode, code)).limit(1);
    if (!existing) return code;
  }

  return `IDT-${Date.now().toString(36).toUpperCase()}`;
}

function buildSchoolQueryVariants(query: string) {
  const normalized = query.replace(/\s+/g, " ").trim();
  const compact = normalized
    .replace(/\bSMK\s+NEGERI\b/i, "SMKN")
    .replace(/\bSMA\s+NEGERI\b/i, "SMAN")
    .replace(/\bSMP\s+NEGERI\b/i, "SMPN")
    .replace(/\bSD\s+NEGERI\b/i, "SDN");

  const spaced = normalized
    .replace(/\bSMKN\b/i, "SMK Negeri")
    .replace(/\bSMAN\b/i, "SMA Negeri")
    .replace(/\bSMPN\b/i, "SMP Negeri")
    .replace(/\bSDN\b/i, "SD Negeri");

  return [...new Set([normalized, compact, spaced])].filter(Boolean).slice(0, 3);
}

function normalizeSchoolPayload(payload: unknown, query: string) {
  const payloadList = Array.isArray(payload) ? payload : [payload];
  const source = payloadList.flatMap((entry) => extractSchoolRows(entry));
  const seen = new Set<string>();

  const schools = source
    .map((item) => {
      const row = item as Record<string, unknown>;
      const name = String(row.sekolah ?? row.nama ?? row.nama_sekolah ?? row.name ?? "").trim();
      const city = String(row.kabupaten_kota ?? row.kabupaten ?? row.kota ?? row.alamat_jalan ?? "").trim();
      const province = String(row.propinsi ?? row.provinsi ?? row.province ?? "").trim();
      const npsn = String(row.npsn ?? "").trim();
      return name ? { name, city, province, npsn, score: schoolScore(name, city, province, query) } : null;
    })
    .filter(Boolean)
    .filter((school) => {
      const item = school as { name: string; city: string; province: string; npsn: string };
      const key = item.npsn || `${item.name}-${item.city}-${item.province}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => ((b as { score: number }).score - (a as { score: number }).score))
    .slice(0, 12);

  return schools.map((school) => {
    const { score: _score, ...rest } = school as { name: string; city: string; province: string; npsn: string; score: number };
    return rest;
  });
}

function extractSchoolRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const row = payload as Record<string, unknown> | null;
  if (!row) return [];
  if (Array.isArray(row.dataSekolah)) return row.dataSekolah;
  if (Array.isArray(row.data)) return row.data;
  if (Array.isArray(row.sekolah)) return row.sekolah;
  return [];
}

function schoolScore(name: string, city: string, province: string, query: string) {
  const target = normalizeSchoolText(`${name} ${city} ${province}`);
  const normalizedQuery = normalizeSchoolText(query);
  const compactQuery = normalizeSchoolText(buildSchoolQueryVariants(query)[1] ?? query);
  let score = 0;

  if (target.includes(normalizedQuery)) score += 80;
  if (target.includes(compactQuery)) score += 90;

  for (const token of compactQuery.split(" ").filter((item) => item.length > 1)) {
    if (target.includes(token)) score += 8;
  }

  return score;
}

function normalizeSchoolText(value: string) {
  return value
    .toUpperCase()
    .replace(/\bSMK\s+NEGERI\b/g, "SMKN")
    .replace(/\bSMA\s+NEGERI\b/g, "SMAN")
    .replace(/\bSMP\s+NEGERI\b/g, "SMPN")
    .replace(/\bSD\s+NEGERI\b/g, "SDN")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

// --- New Admin Features ---

app.get("/admin/parent-students", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const rows = await db
    .select({
      id: parentStudents.id,
      parentId: parentStudents.parentUserId,
      parentName: users.name,
      parentEmail: users.email,
      studentId: parentStudents.studentUserId,
      studentName: users.name,
      studentEmail: users.email,
      relationship: parentStudents.relationship,
      createdAt: parentStudents.createdAt
    })
    .from(parentStudents)
    .innerJoin(users, eq(parentStudents.parentUserId, users.id));

  return c.json({ links: rows });
});

app.post("/admin/parent-students", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    parentUserId?: string;
    studentUserId?: string;
    relationship?: string;
  };

  if (!body.parentUserId || !body.studentUserId || !body.relationship?.trim()) {
    return c.json({ message: "parentUserId, studentUserId, dan relationship wajib diisi." }, 400);
  }

  const relationship = body.relationship.trim();
  const [parent] = await db.select().from(users).where(eq(users.id, body.parentUserId)).limit(1);
  const [student] = await db.select().from(users).where(eq(users.id, body.studentUserId)).limit(1);

  if (!parent) {
    return c.json({ message: "User orang tua tidak ditemukan." }, 404);
  }
  if (!student) {
    return c.json({ message: "User siswa tidak ditemukan." }, 404);
  }

  const [existing] = await db
    .select()
    .from(parentStudents)
    .where(
      and(eq(parentStudents.parentUserId, body.parentUserId), eq(parentStudents.studentUserId, body.studentUserId))
    )
    .limit(1);

  if (existing) {
    return c.json({ message: "Relasi orang tua-siswa sudah ada." }, 409);
  }

  const now = new Date();
  const id = `ps_${nanoid(12)}`;
  await db.insert(parentStudents).values({
    id,
    parentUserId: body.parentUserId,
    studentUserId: body.studentUserId,
    relationship,
    createdAt: now
  });

  const [created] = await db.select().from(parentStudents).where(eq(parentStudents.id, id)).limit(1);

  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "parent_student",
    resourceId: id,
    details: { parentUserId: body.parentUserId, studentUserId: body.studentUserId, relationship }
  });

  return c.json({ link: created }, 201);
});

app.put("/admin/parent-students/:id", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) {
    return c.json({ message: "ID relasi wajib diisi." }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    relationship?: string;
  };

  if (!body.relationship?.trim()) {
    return c.json({ message: "Relationship wajib diisi." }, 400);
  }

  const [existing] = await db.select().from(parentStudents).where(eq(parentStudents.id, id)).limit(1);
  if (!existing) {
    return c.json({ message: "Relasi tidak ditemukan." }, 404);
  }

  await db
    .update(parentStudents)
    .set({ relationship: body.relationship.trim() })
    .where(eq(parentStudents.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "update",
    resourceType: "parent_student",
    resourceId: id,
    details: { relationship: body.relationship.trim() }
  });

  const [updated] = await db.select().from(parentStudents).where(eq(parentStudents.id, id)).limit(1);
  return c.json({ link: updated });
});

app.delete("/admin/parent-students/:id", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const user = c.get("authUser");
  const id = c.req.param("id");
  if (!id) {
    return c.json({ message: "ID relasi wajib diisi." }, 400);
  }

  const [existing] = await db.select().from(parentStudents).where(eq(parentStudents.id, id)).limit(1);
  if (!existing) {
    return c.json({ message: "Relasi tidak ditemukan." }, 404);
  }

  await db.delete(parentStudents).where(eq(parentStudents.id, id));

  await writeActivityLog({
    userId: user.id,
    action: "delete",
    resourceType: "parent_student",
    resourceId: id
  });

  return c.json({ ok: true });
});

app.get("/admin/activity-logs", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const rows = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(100);
  return c.json({ logs: rows });
});

app.get("/admin/announcements", requireRole(["admin", "teacher", "student", "parent"]), async (c) => {
  const rows = await db.select().from(globalAnnouncements).orderBy(desc(globalAnnouncements.createdAt));
  return c.json({ announcements: rows });
});

app.post("/admin/announcements", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as { title?: string; content?: string; type?: "info" | "warning" | "success" };
  if (!body.title || !body.content) return c.json({ message: "Judul dan konten wajib diisi." }, 400);
  
  const now = new Date();
  const announcementId = `ann_${crypto.randomUUID()}`;
  await db.insert(globalAnnouncements).values({
    id: announcementId,
    title: body.title.trim(),
    content: body.content.trim(),
    type: body.type ?? "info",
    authorUserId: user.id,
    createdAt: now,
    updatedAt: now
  });
  const [created] = await db.select().from(globalAnnouncements).where(eq(globalAnnouncements.id, announcementId)).limit(1);
  return c.json({ announcement: created });
});

app.get("/admin/master-data", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const [subjects, grades, settings] = await Promise.all([
    db.select().from(masterSubjects),
    db.select().from(masterGrades),
    db.select().from(systemSettings)
  ]);
  return c.json({ subjects, grades, settings });
});

// --- System Settings CRUD ---

app.get("/admin/settings", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const rows = await db.select().from(systemSettings).orderBy(systemSettings.key);
  return c.json({ settings: rows });
});

app.get("/admin/settings/:key", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const key = c.req.param("key");
  if (!key) {
    return c.json({ message: "Key wajib diisi." }, 400);
  }

  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);

  if (!row) {
    return c.json({ message: "Pengaturan tidak ditemukan." }, 404);
  }

  return c.json({ setting: row });
});

app.post("/admin/settings", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    key?: string;
    value?: string;
    description?: string;
  };

  if (!body.key || body.value === undefined) {
    return c.json({ message: "Key dan value wajib diisi." }, 400);
  }

  const key = body.key.trim();
  if (key.length === 0) {
    return c.json({ message: "Key tidak boleh kosong." }, 400);
  }

  const now = new Date();
  await db.insert(systemSettings).values({
    key,
    value: body.value,
    description: body.description?.trim() ?? null,
    updatedAt: now
  });

  await writeActivityLog({
    userId: user.id,
    action: "create",
    resourceType: "system_setting",
    resourceId: key,
    details: { description: body.description?.trim() ?? null }
  });

  const [created] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return c.json({ setting: created }, 201);
});

app.put("/admin/settings/:key", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const user = c.get("authUser");
  const key = c.req.param("key");
  if (!key) {
    return c.json({ message: "Key wajib diisi." }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    value?: string;
    description?: string;
  };

  if (body.value === undefined) {
    return c.json({ message: "Value wajib diisi." }, 400);
  }

  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  if (!existing) {
    return c.json({ message: "Pengaturan tidak ditemukan." }, 404);
  }

  const now = new Date();
  await db
    .update(systemSettings)
    .set({
      value: body.value,
      description: body.description?.trim() ?? existing.description,
      updatedAt: now
    })
    .where(eq(systemSettings.key, key));

  await writeActivityLog({
    userId: user.id,
    action: "update",
    resourceType: "system_setting",
    resourceId: key,
    details: { description: body.description?.trim() ?? existing.description }
  });

  const [updated] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return c.json({ setting: updated });
});

app.delete("/admin/settings/:key", requireRole(["admin"]), requirePermission("system.setting"), async (c) => {
  const user = c.get("authUser");
  const key = c.req.param("key");
  if (!key) {
    return c.json({ message: "Key wajib diisi." }, 400);
  }

  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  if (!existing) {
    return c.json({ message: "Pengaturan tidak ditemukan." }, 404);
  }

  await db.delete(systemSettings).where(eq(systemSettings.key, key));

  await writeActivityLog({
    userId: user.id,
    action: "delete",
    resourceType: "system_setting",
    resourceId: key
  });

  return c.json({ ok: true });
});

// Blog Endpoints
app.get("/public/blogs", async (c) => {
  const allBlogs = await db.select().from(blogs).where(eq(blogs.status, "published")).orderBy(desc(blogs.createdAt));
  return c.json({ blogs: allBlogs });
});

app.get("/admin/blogs", requireRole(["admin"]), requirePermission("blog.manage"), async (c) => {
  const allBlogs = await db.select().from(blogs).orderBy(desc(blogs.createdAt));
  return c.json({ blogs: allBlogs });
});

app.post("/admin/blogs", requireRole(["admin"]), requirePermission("blog.manage"), async (c) => {
  const user = c.get("authUser");
  const body = await c.req.json().catch(() => ({}));
  if (!body.title || !body.content) return c.json({ message: "Judul dan konten wajib diisi." }, 400);

  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + nanoid(6);
  const now = new Date();
  const id = `blg_${nanoid(12)}`;

  await db.insert(blogs).values({
    id,
    authorUserId: user.id,
    title: body.title,
    slug,
    excerpt: body.excerpt || null,
    content: body.content,
    coverImageUrl: body.coverImageUrl || null,
    status: body.status || "draft",
    createdAt: now,
    updatedAt: now
  });

  return c.json({ id, ok: true });
});

app.put("/admin/blogs/:id", requireRole(["admin"]), requirePermission("blog.manage"), async (c) => {
  const id = c.req.param("id") as string;
  const body = await c.req.json().catch(() => ({}));

  const [existing] = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
  if (!existing) return c.json({ message: "Blog tidak ditemukan." }, 404);

  const updateData: any = { updatedAt: new Date() };
  if (body.title !== undefined) {
    updateData.title = body.title;
    if (body.title !== existing.title) {
      updateData.slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + nanoid(6);
    }
  }
  if (body.excerpt !== undefined) updateData.excerpt = body.excerpt;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.coverImageUrl !== undefined) updateData.coverImageUrl = body.coverImageUrl;
  if (body.status !== undefined) updateData.status = body.status;

  await db.update(blogs).set(updateData).where(eq(blogs.id, id));
  return c.json({ ok: true });
});

app.delete("/admin/blogs/:id", requireRole(["admin"]), requirePermission("blog.manage"), async (c) => {
  const id = c.req.param("id") as string;
  const [existing] = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
  if (!existing) return c.json({ message: "Blog tidak ditemukan." }, 404);

  await db.delete(blogs).where(eq(blogs.id, id));
  return c.json({ ok: true });
});

app.post("/admin/blogs/generate", requireRole(["admin"]), requirePermission("blog.manage"), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const prompt = body.prompt;
  
  if (!prompt) return c.json({ message: "Topik atau ide tulisan wajib diisi." }, 400);

  const message = `Buatkan artikel blog edukasi/pendidikan dengan format Markdown yang rapi berdasarkan topik berikut: ${prompt}.
Artikel harus memiliki judul utama (H1), pendahuluan yang menarik, 2-3 poin pembahasan (H2/H3), dan penutup. Gaya bahasa usahakan santai tapi profesional, cocok untuk audiens guru dan orang tua. Jangan sertakan tag markdown \`\`\`markdown di awal/akhir respons, langsung saja berikan teksnya.`;

  try {
    const cybraUrl = process.env.CYBRA_API_URL || "https://asisten.ferilee.gurumuda.eu.org";
    const response = await fetch(`${cybraUrl}/api/integration/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (IdeTech Server) AppleWebKit/537.36"
      },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(getCybraTimeoutMs())
    });

    if (!response.ok) {
      return c.json({ message: "Gagal memanggil AI generator." }, 502);
    }

    const data = await response.json();
    return c.json({ content: data.reply });
  } catch (err: any) {
    return c.json({ message: `Koneksi AI gagal: ${err.message}` }, 500);
  }
});

export default app;
