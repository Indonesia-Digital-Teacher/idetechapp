import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import {
  bankRequests,
  classes,
  classStudents,
  ideQuests,
  materials,
  permissions,
  rolePermissions,
  roles,
  studentMaterialProgress,
  studentQuestProgress,
  teacherJournals,
  userRoles,
  users
} from "../db/schema";
import type { RoleName } from "../db/schema";
import { type AppEnv, authRequired, requirePermission, requireRole } from "../lib/auth";
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

app.get("/dashboard", (c) => {
  const user = c.get("authUser");
  const dashboard = dashboardCatalog[user.activeRole];
  return c.json({ user, dashboard });
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
        .values({
          id: `ur_${crypto.randomUUID()}`,
          userId: id,
          roleId: role.id,
          createdAt: new Date()
        })
        .onConflictDoNothing();
    }
  }

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
  const [created] = await db
    .insert(classes)
    .values({
      id: `cls_${crypto.randomUUID()}`,
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
    })
    .returning();

  return c.json({ class: created }, 201);
});

app.patch("/admin/classes/:id", requireRole(["admin"]), requirePermission("class.manage"), async (c) => {
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

  const [updated] = await db
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
    .where(eq(classes.id, id))
    .returning();

  return c.json({ class: updated });
});

app.delete("/admin/classes/:id", requireRole(["admin"]), requirePermission("class.manage"), async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ message: "ID kelas wajib diisi." }, 400);
  const [targetClass] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  if (!targetClass) return c.json({ message: "Kelas tidak ditemukan." }, 404);

  await db.delete(classes).where(eq(classes.id, id));
  return c.json({ ok: true });
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
  const [created] = await db
    .insert(classes)
    .values({
      id: `cls_${crypto.randomUUID()}`,
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
    })
    .returning();

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
  const [created] = await db
    .insert(materials)
    .values({
      id: `mat_${crypto.randomUUID()}`,
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
    })
    .returning();

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

  const [updated] = await db
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
    .where(eq(materials.id, id))
    .returning();

  return c.json({ material: updated });
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
  const body = (await c.req.json().catch(() => ({}))) as {
    classId?: string;
    materialId?: string;
    title?: string;
    mission?: string;
    points?: number;
    dueDate?: string;
  };

  const title = body.title?.trim();
  const mission = body.mission?.trim();
  const dueDate = body.dueDate?.trim() || "7d";
  if (!body.classId || !title || !mission) {
    return c.json({ message: "Kelas, judul IdeQuest, dan misi wajib diisi." }, 400);
  }

  const [targetClass] = await db.select().from(classes).where(eq(classes.id, body.classId));
  if (!targetClass || (user.activeRole !== "admin" && targetClass.teacherUserId !== user.id)) {
    return c.json({ message: "Kelas tidak ditemukan atau bukan milik guru aktif." }, 404);
  }

  if (body.materialId) {
    const [targetMaterial] = await db.select().from(materials).where(eq(materials.id, body.materialId));
    if (!targetMaterial || targetMaterial.classId !== body.classId) {
      return c.json({ message: "Materi tidak ditemukan di kelas yang dipilih." }, 400);
    }
  }

  const now = new Date();
  const [created] = await db
    .insert(ideQuests)
    .values({
      id: `iq_${crypto.randomUUID()}`,
      teacherUserId: user.id,
      classId: body.classId,
      materialId: body.materialId || null,
      title,
      mission,
      points: Math.max(0, Number(body.points ?? 100)),
      dueDate,
      status: "published",
      createdAt: now,
      updatedAt: now
    })
    .returning();

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

  const [updated] = await db
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
    .where(eq(ideQuests.id, id))
    .returning();

  return c.json({ quest: updated });
});

app.post("/teacher/journals", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const body = await c.req.parseBody();
  const photo = body.photo as File | undefined;
  let photoUrl = null;

  if (photo) {
    try {
      const s3 = new S3Client({
        endpoint: process.env.RUSTFS_ENDPOINT || process.env.S3_ENDPOINT || "http://global-storage:9000",
        region: process.env.RUSTFS_REGION || process.env.S3_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.RUSTFS_ACCESS_KEY || process.env.S3_ACCESS_KEY || "minioadmin",
          secretAccessKey: process.env.RUSTFS_SECRET_KEY || process.env.S3_SECRET_KEY || "minioadmin"
        },
        forcePathStyle: true,
      });
      
      const ext = photo.name.split('.').pop() || "png";
      const key = `journals/${user.id}-${Date.now()}.${ext}`;
      const buffer = await photo.arrayBuffer();

      await s3.send(new PutObjectCommand({
        Bucket: "idetech-assets",
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: photo.type,
      }));
      
      const baseUrl = process.env.RUSTFS_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL || "http://localhost:9000/idetech-assets";
      photoUrl = `${baseUrl}/${key}`;
    } catch (err) {
      console.error("Gagal upload foto ke RustFS:", err);
      return c.json({ message: "Gagal mengunggah foto jurnal." }, 500);
    }
  }

  const now = new Date();
  await db.insert(teacherJournals).values({
    id: `jrn_${nanoid(12)}`,
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

  return c.json({ ok: true, photoUrl });
});

app.get("/teacher/journals", requireRole(["teacher", "admin"]), async (c) => {
  const user = c.get("authUser");
  const journals = await db
    .select()
    .from(teacherJournals)
    .where(eq(teacherJournals.teacherUserId, user.id))
    .orderBy(desc(teacherJournals.createdAt));

  return c.json({ journals });
});

app.post("/teacher/bank-submit", requireRole(["teacher", "admin"]), async (c) => {
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

app.get("/admin/bank-queue", requireRole(["admin"]), async (c) => {
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

app.patch("/admin/bank-queue/:type/:id", requireRole(["admin"]), async (c) => {
  const type = c.req.param("type");
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { status: "approved" | "rejected" };
  if (!id || (body.status !== "approved" && body.status !== "rejected")) return c.json({ message: "Invalid payload." }, 400);

  if (type === "material") {
    await db.update(materials).set({ bankStatus: body.status, updatedAt: new Date() }).where(eq(materials.id, id));
  } else if (type === "quest") {
    await db.update(ideQuests).set({ bankStatus: body.status, updatedAt: new Date() }).where(eq(ideQuests.id, id));
  }
  return c.json({ ok: true });
});

app.get("/teacher/bank-public", requireRole(["teacher", "admin"]), async (c) => {
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

app.post("/teacher/bank-requests", requireRole(["teacher", "admin"]), async (c) => {
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
  const [request] = await db.insert(bankRequests).values({
    id: `breq_${crypto.randomUUID()}`,
    requesterUserId: user.id,
    ownerUserId,
    targetClassId: body.targetClassId,
    itemType: body.itemType,
    itemId: body.itemId,
    status: "pending",
    createdAt: now,
    updatedAt: now
  }).returning();

  return c.json({ request }, 201);
});

app.get("/teacher/bank-requests", requireRole(["teacher", "admin"]), async (c) => {
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

app.patch("/teacher/bank-requests/:id", requireRole(["teacher", "admin"]), async (c) => {
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
  const [joined] = await db
    .insert(classStudents)
    .values({
      id: `cs_${crypto.randomUUID()}`,
      classId: targetClass.id,
      studentUserId: user.id,
      createdAt: now
    })
    .returning();

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
  const [progress] = await db
    .insert(studentMaterialProgress)
    .values({
      id: `smp_${crypto.randomUUID()}`,
      studentUserId: user.id,
      materialId: id,
      progress: 100,
      completedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [studentMaterialProgress.studentUserId, studentMaterialProgress.materialId],
      set: {
        progress: 100,
        completedAt: now,
        updatedAt: now
      }
    })
    .returning();

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

  const now = new Date();
  const [progress] = await db
    .insert(studentQuestProgress)
    .values({
      id: `sqp_${crypto.randomUUID()}`,
      studentUserId: user.id,
      questId: id,
      progress: 100,
      earnedPoints: quest.points,
      completedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [studentQuestProgress.studentUserId, studentQuestProgress.questId],
      set: {
        progress: 100,
        earnedPoints: quest.points,
        completedAt: now,
        updatedAt: now
      }
    })
    .returning();

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
  const allClasses = await db.select().from(classes).orderBy(desc(classes.updatedAt));
  const studentClasses = allClasses.filter((item) => classIds.includes(item.id));
  const activeClass = studentClasses[0] ?? null;
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
  const levelValue = Math.max(1, dbQuests.length * 10 + completedUnits + Math.floor(totalPoints / 100));
  const chapterValue = activeClass ? visibleMaterials.length : 0;
  const chapterLabel = activeClass ? `Chapter ${chapterValue}` : "Belum Masuk Kelas";
  const chapterProgressLabel = totalUnits > 0 ? `${completedUnits}/${totalUnits}` : "0/0";
  const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  return c.json({
    left: [
      {
        id: "map",
        title: "Map",
        subtitle: "9h 37m",
        badge: dueSoonCount > 0 ? `+${dueSoonCount}` : undefined,
        connected: pendingCount > 0
      },
      {
        id: "quest",
        title: "Quest",
        subtitle: "2d 9h",
        badge: pendingCount > 0 ? String(pendingCount) : undefined,
        connected: pendingCount > 0
      },
      {
        id: "rank",
        title: "Piala",
        subtitle: "1d 9h",
        badge: earnedBadges > 0 ? String(earnedBadges * 10) : undefined,
        connected: earnedBadges > 0
      }
    ],
    right: [
      {
        id: "tasks",
        title: "Tugas aktif",
        subtitle: "10d 9h",
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
      studio: dueSoonCount > 0,
      rank: earnedBadges > 0,
      map: pendingCount > 0,
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

app.get("/parent/reports", requireRole(["parent"]), requirePermission("report.view"), (c) =>
  c.json({
    children: [
      { id: "child_dika", name: "Dika", progress: 82, teacherNote: "Aktif berdiskusi dan konsisten mengumpulkan tugas." },
      { id: "child_naya", name: "Naya", progress: 74, teacherNote: "Perlu latihan tambahan pada kuis numerasi." }
    ]
  })
);

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

export default app;
