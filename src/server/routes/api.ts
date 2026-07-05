import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import {
  bankRequests,
  chatQuotas,
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
  systemSettings
} from "../db/schema";
import type { RoleName } from "../db/schema";
import { type AppEnv, authRequired, requirePermission, requireRole } from "../lib/auth";
import { writeActivityLog } from "../lib/activity";
import { getChatQuotaConfig } from "../lib/settings";
import { getS3Config } from "../lib/storage";
import { dashboardCatalog, permissionCatalog, roleCatalog, studentQuestCatalog } from "../lib/catalog";
import authRoutes from "./auth";

const app = new Hono<AppEnv>();

app.route("/auth", authRoutes);

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
  if (schoolName.length < 3) return c.json({ message: "Nama sekolah wajib dipilih." }, 400);
  if (contactChannel !== "wa" && contactChannel !== "telegram") return c.json({ message: "Pilih kontak WA atau Telegram." }, 400);
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

  if (body.key === "google_auth_rules") {
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
    details: JSON.stringify({ title: body.title })
  });
  
  const [created] = await db.select().from(globalAnnouncements).where(eq(globalAnnouncements.id, id));
  return c.json({ announcement: created }, 201);
});

app.delete("/admin/announcements/:id", requireRole(["admin"]), async (c) => {
  const id = c.req.param("id");
  await db.delete(globalAnnouncements).where(eq(globalAnnouncements.id, id));
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
  const rows = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(100);
  const userRows = await db.select().from(users);
  
  const enriched = rows.map((item) => {
    const user = userRows.find((u) => u.id === item.userId);
    return {
      ...item,
      userName: user?.name || "Unknown",
      userEmail: user?.email || "-"
    };
  });
  
  return c.json({ logs: enriched });
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
    avatarUrl: users.avatarUrl
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
      studentName: sc.studentName,
      studentEmail: sc.studentEmail,
      avatarUrl: sc.avatarUrl,
      className: teacherClasses.find(c => c.id === sc.classId)?.name || "Unknown",
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
    const cybraUrl = process.env.CYBRA_API_URL || "https://cybrabot.ferilee.gurumuda.eu.org";
    const response = await fetch(`${cybraUrl}/api/integration/chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (IdeTech Server) AppleWebKit/537.36"
      },
      body: JSON.stringify(body)
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

app.post("/teacher/bank-submit", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as { type: "material" | "quest"; id: string };
  if (!body.type || !body.id) return c.json({ message: "Type dan ID wajib diisi." }, 400);

  if (body.type === "material") {
    const [item] = await db.select().from(materials).where(eq(materials.id, body.id)).limit(1);
    if (!item || (user.activeRole !== "admin" && item.teacherUserId !== user.id)) return c.json({ message: "Materi tidak ditemukan." }, 404);
    await db.update(materials).set({ bankStatus: "pending", updatedAt: new Date() }).where(eq(materials.id, body.id));
  } else {
    const [item] = await db.select().from(ideQuests).where(eq(ideQuests.id, body.id)).limit(1);
    if (!item || (user.activeRole !== "admin" && item.teacherUserId !== user.id)) return c.json({ message: "IdeQuest tidak ditemukan." }, 404);
    await db.update(ideQuests).set({ bankStatus: "pending", updatedAt: new Date() }).where(eq(ideQuests.id, body.id));
  }
  return c.json({ ok: true });
});

app.get("/admin/bank-queue", requireRole(["admin"]), requirePermission("bank.manage"), async (c) => {
  const [materialRows, questRows, userRows] = await Promise.all([
    db.select().from(materials).where(eq(materials.bankStatus, "pending")).orderBy(desc(materials.updatedAt)),
    db.select().from(ideQuests).where(eq(ideQuests.bankStatus, "pending")).orderBy(desc(ideQuests.updatedAt)),
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
  const [materialRows, questRows, userRows] = await Promise.all([
    db.select().from(materials).where(eq(materials.bankStatus, "approved")).orderBy(desc(materials.updatedAt)),
    db.select().from(ideQuests).where(eq(ideQuests.bankStatus, "approved")).orderBy(desc(ideQuests.updatedAt)),
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
    }))
  });
});

app.post("/teacher/bank-requests", requireRole(["teacher", "admin"]), requirePermission("bank.manage"), async (c) => {
  const user = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as {
    itemType: "material" | "quest";
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
  } else {
    const [item] = await db.select().from(ideQuests).where(eq(ideQuests.id, body.itemId)).limit(1);
    if (!item || item.bankStatus !== "approved") return c.json({ message: "IdeQuest tidak tersedia di bank." }, 404);
    if (item.teacherUserId === user.id) return c.json({ message: "Anda tidak perlu meminta IdeQuest Anda sendiri." }, 400);
    ownerUserId = item.teacherUserId;
  }

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
  const [incoming, outgoing, userRows, materialRows, questRows] = await Promise.all([
    db.select().from(bankRequests).where(eq(bankRequests.ownerUserId, user.id)).orderBy(desc(bankRequests.createdAt)),
    db.select().from(bankRequests).where(eq(bankRequests.requesterUserId, user.id)).orderBy(desc(bankRequests.createdAt)),
    db.select().from(users),
    db.select().from(materials),
    db.select().from(ideQuests)
  ]);

  const mapRequest = (req: any) => {
    const requester = userRows.find((u) => u.id === req.requesterUserId);
    const owner = userRows.find((u) => u.id === req.ownerUserId);
    const item = req.itemType === "material" 
      ? materialRows.find(m => m.id === req.itemId) 
      : questRows.find(q => q.id === req.itemId);
    
    return {
      ...req,
      requesterName: requester?.fullName ?? requester?.name ?? "Guru",
      ownerName: owner?.fullName ?? owner?.name ?? "Guru",
      itemTitle: item?.title ?? "Item tidak diketahui"
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
    } else {
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

app.get("/student/materials", requireRole(["student"]), async (c) => {
  const user = c.get("authUser");
  const classIds = await getStudentClassIds(user.id);
  const progressRows = await db.select().from(studentMaterialProgress).where(eq(studentMaterialProgress.studentUserId, user.id));
  const allMaterials = await db.select().from(materials).orderBy(desc(materials.updatedAt));
  const visibleMaterials = allMaterials
    .filter((material) => classIds.includes(material.classId) && material.status === "published")
    .map((material) => {
      const progress = progressRows.find((row) => row.materialId === material.id);
      return {
        ...material,
        progress: progress?.progress ?? 0,
        completedAt: progress?.completedAt ?? null
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
  const dbQuests = (await db.select().from(ideQuests).orderBy(desc(ideQuests.updatedAt)))
    .filter((quest) => classIds.includes(quest.classId) && quest.status === "published")
    .map((quest) => {
      const progress = progressRows.find((row) => row.questId === quest.id);
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
        materialId: quest.materialId
      };
    });
  const fallbackQuests = studentQuestCatalog.map(({ dueSoon, ...quest }) => quest);
  const quests = dbQuests.length ? dbQuests : fallbackQuests;

  return c.json({
    quests,
    meta: {
      pendingCount: quests.filter((quest) => quest.progress < 100).length,
      dueSoonCount: dbQuests.length ? quests.filter((quest) => quest.progress < 100).length : studentQuestCatalog.filter((quest) => quest.dueSoon).length,
      earnedBadges: quests.filter((quest) => quest.progress >= 80).length,
      totalPoints: quests.reduce((total, quest) => total + quest.points, 0)
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
  const pendingCount = dbQuests.length ? dbQuests.filter((quest) => (questProgressRows.find((row) => row.questId === quest.id)?.progress ?? 0) < 100).length : studentQuestCatalog.filter((quest) => quest.progress < 100).length;
  const dueSoonCount = dbQuests.length ? pendingCount : studentQuestCatalog.filter((quest) => quest.dueSoon).length;
  const earnedBadges = dbQuests.length ? questProgressRows.filter((row) => row.progress >= 100).length : studentQuestCatalog.filter((quest) => quest.progress >= 80).length;
  const totalPoints = dbQuests.length
    ? questProgressRows.reduce((total, progress) => total + progress.earnedPoints, 0)
    : studentQuestCatalog.reduce((total, quest) => total + quest.points, 0);
  const radarWarning = dbQuests.length ? dbQuests.some((quest) => quest.points < 100) : studentQuestCatalog.some((quest) => quest.progress < 50);
  const completedMaterials = visibleMaterials.filter((material) => (materialProgressRows.find((row) => row.materialId === material.id)?.progress ?? 0) >= 100).length;
  const completedQuests = dbQuests.length
    ? dbQuests.filter((quest) => (questProgressRows.find((row) => row.questId === quest.id)?.progress ?? 0) >= 100).length
    : studentQuestCatalog.filter((quest) => quest.progress >= 100).length;
  const totalUnits = visibleMaterials.length + (dbQuests.length || studentQuestCatalog.length);
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
      summary: activeClass ? `${activeClass.name} • ${activeClass.subject}` : "Gabung ke kelas untuk mulai progres"
    }
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

export default app;
