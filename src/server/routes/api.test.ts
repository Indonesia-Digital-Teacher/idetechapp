import { describe, expect, test, beforeAll } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import app from "./api";
import { db } from "../db/client";
import { users, roles, permissions, rolePermissions, userRoles, parentStudents, activityLogs } from "../db/schema";
import type { RoleName } from "../db/schema";
import { nanoid } from "nanoid";
import { sessionCookieName, createSession } from "../lib/auth";
import { initializeDatabase } from "../db/init";
import { permissionCatalog, roleCatalog, rolePermissions as catalogRolePermissions } from "../lib/catalog";

function clearS3Env() {
  const original: Record<string, string | undefined> = {};
  for (const key of [
    "RUSTFS_ENDPOINT",
    "S3_ENDPOINT",
    "RUSTFS_ACCESS_KEY",
    "S3_ACCESS_KEY",
    "RUSTFS_SECRET_KEY",
    "S3_SECRET_KEY",
    "RUSTFS_PUBLIC_BASE_URL",
    "S3_PUBLIC_BASE_URL"
  ]) {
    original[key] = process.env[key];
    delete process.env[key];
  }
  return original;
}

function restoreS3Env(original: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("Backend API Endpoints", () => {
  let testUserToken: string;
  let testUserEmail: string;

  beforeAll(async () => {
    // Inisialisasi database testing (membuat tabel jika belum ada, sangat penting untuk CI/CD)
    await initializeDatabase();

    // Seed roles dan permissions dari catalog agar test self-sufficient
    const now = new Date();

    for (const role of roleCatalog) {
      await db.insert(roles).ignore().values(role);
    }

    for (const permission of permissionCatalog) {
      await db.insert(permissions).ignore().values(permission);
    }

    await db.delete(rolePermissions);

    const allRoles = await db.select().from(roles);
    const allPermissions = await db.select().from(permissions);

    for (const [roleName, permissionNames] of Object.entries(catalogRolePermissions)) {
      const role = allRoles.find((item) => item.name === roleName);
      if (!role) continue;

      for (const permissionName of permissionNames) {
        const permission = allPermissions.find((item) => item.name === permissionName);
        if (!permission) continue;

        await db.insert(rolePermissions).ignore().values({
          id: `rp_${nanoid(12)}`,
          roleId: role.id,
          permissionId: permission.id,
          createdAt: now
        });
      }
    }

    // Buat user test di dalam database in-memory / testing
    const userId = `usr_${nanoid(12)}`;
    testUserEmail = `test-${nanoid(6)}@example.com`;

    await db.insert(users).values({
      id: userId,
      name: "Test User",
      email: testUserEmail,
      status: "active",
      profileCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const { token } = await createSession(userId, "teacher");
    testUserToken = token;
  });

  describe("GET /api/health", () => {
    test("Harus merespons dengan status OK", async () => {
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("status", "ok");
    });
  });

  describe("GET /api/schools/search", () => {
    test("Harus mengembalikan array kosong jika query kurang dari 2 karakter", async () => {
      const req = new Request("http://localhost/schools/search?q=a");
      // Set cookie login untuk lolos middleware authRequired
      req.headers.set("cookie", `${sessionCookieName}=${testUserToken}`);
      
      const res = await app.request(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("schools");
      expect(json.schools).toHaveLength(0);
    });

    test("Harus mengembalikan 401 jika belum login", async () => {
      const res = await app.request("/schools/search?q=SMKN");
      expect(res.status).toBe(401);
    });
  });
  
  describe("GET /api/auth/me", () => {
    test("Harus mengembalikan data profile dari user yang sedang login", async () => {
      const req = new Request("http://localhost/auth/me");
      req.headers.set("cookie", `${sessionCookieName}=${testUserToken}`);
      
      const res = await app.request(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("user");
      expect(json.user).toHaveProperty("email", testUserEmail);
    });
  });

  describe("POST /api/auth/dev/google", () => {
    test("Harus mengembalikan 403 di environment production tanpa DEMO_LOGIN_ENABLED", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalDemoFlag = process.env.DEMO_LOGIN_ENABLED;
      try {
        process.env.NODE_ENV = "production";
        delete process.env.DEMO_LOGIN_ENABLED;
        const res = await app.request("/auth/dev/google", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "admin@idetech.local" })
        });
        expect(res.status).toBe(403);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.DEMO_LOGIN_ENABLED = originalDemoFlag;
      }
    });

    test("Harus mengizinkan demo login di environment production jika DEMO_LOGIN_ENABLED=true", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalDemoFlag = process.env.DEMO_LOGIN_ENABLED;
      try {
        process.env.NODE_ENV = "production";
        process.env.DEMO_LOGIN_ENABLED = "true";
        const res = await app.request("/auth/dev/google", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "admin@idetech.local" })
        });
        expect(res.status).toBe(200);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.DEMO_LOGIN_ENABLED = originalDemoFlag;
      }
    });
  });

  describe("Permission catalog", () => {
    test("Harus menyertakan permission journal.manage dan chat.use", () => {
      const names = permissionCatalog.map((item) => item.name);
      expect(names).toContain("journal.manage");
      expect(names).toContain("chat.use");
    });

    test("Harus memetakan journal.manage dan chat.use ke teacher dan admin", () => {
      expect(catalogRolePermissions.teacher).toContain("journal.manage");
      expect(catalogRolePermissions.teacher).toContain("chat.use");
      expect(catalogRolePermissions.admin).toContain("journal.manage");
      expect(catalogRolePermissions.admin).toContain("chat.use");
    });
  });

  describe("Endpoint permission enforcement", () => {
    async function ensureRole(roleName: RoleName) {
      const label =
        roleName === "admin"
          ? "Admin"
          : roleName === "teacher"
            ? "Guru"
            : roleName === "student"
              ? "Siswa"
              : "Orang Tua";

      await db
        .insert(roles)
        .ignore()
        .values({ id: `role_${roleName}`, name: roleName, label, description: "Test role" });

      const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
      return role;
    }

    async function ensurePermissions(names: string[]) {
      const existing = await db
        .select()
        .from(permissions)
        .where(inArray(permissions.name, names));
      const existingNames = new Set(existing.map((item) => item.name));

      for (const name of names) {
        if (existingNames.has(name)) continue;
        await db.insert(permissions).values({
          id: `perm_${name.replace(/\./g, "_")}`,
          name,
          description: "Test permission"
        });
      }

      return db.select().from(permissions).where(inArray(permissions.name, names));
    }

    async function createUserWithPermissions(roleName: RoleName, permissionNames: string[] = []) {
      const role = await ensureRole(roleName);
      const perms = await ensurePermissions(permissionNames);

      // Reset permission mapping for this role so each call is isolated.
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

      const userId = `usr_${nanoid(12)}`;
      const email = `test-${nanoid(6)}@example.com`;
      const now = new Date();

      await db.insert(users).values({
        id: userId,
        name: "Test User",
        email,
        status: "active",
        profileCompleted: true,
        createdAt: now,
        updatedAt: now
      });

      if (perms.length > 0) {
        await db.insert(rolePermissions).values(
          perms.map((perm) => ({
            id: `rp_${nanoid(12)}`,
            roleId: role.id,
            permissionId: perm.id,
            createdAt: now
          }))
        );
      }

      await db.insert(userRoles).ignore().values({
        id: `ur_${nanoid(12)}`,
        userId,
        roleId: role.id,
        createdAt: now
      });

      const { token } = await createSession(userId, roleName);
      return { token, email, userId };
    }

    async function requestWithToken(
      token: string,
      path: string,
      method = "GET",
      body?: Record<string, unknown>
    ) {
      const headers = new Headers();
      headers.set("cookie", `${sessionCookieName}=${token}`);
      if (body) headers.set("content-type", "application/json");

      const req = new Request(`http://localhost${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      return app.request(req);
    }

    test("Endpoint yang dilindungi memerlukan autentikasi dan role yang sesuai", async () => {
      // Teacher dengan permission default dari seed
      const teacherId = `usr_${nanoid(12)}`;
      const teacherEmail = `teacher-${nanoid(6)}@example.com`;
      const now = new Date();
      const [teacherRole] = await db.select().from(roles).where(eq(roles.name, "teacher")).limit(1);

      await db.insert(users).values({
        id: teacherId,
        name: "Test Teacher",
        email: teacherEmail,
        status: "active",
        profileCompleted: true,
        createdAt: now,
        updatedAt: now
      });
      await db.insert(userRoles).ignore().values({
        id: `ur_${nanoid(12)}`,
        userId: teacherId,
        roleId: teacherRole.id,
        createdAt: now
      });
      const { token: teacherToken } = await createSession(teacherId, "teacher");

      // Student
      const studentId = `usr_${nanoid(12)}`;
      const studentEmail = `student-${nanoid(6)}@example.com`;
      const [studentRole] = await db.select().from(roles).where(eq(roles.name, "student")).limit(1);

      await db.insert(users).values({
        id: studentId,
        name: "Test Student",
        email: studentEmail,
        status: "active",
        profileCompleted: true,
        createdAt: now,
        updatedAt: now
      });
      await db.insert(userRoles).ignore().values({
        id: `ur_${nanoid(12)}`,
        userId: studentId,
        roleId: studentRole.id,
        createdAt: now
      });
      const { token: studentToken } = await createSession(studentId, "student");

      // Teacher endpoints
      expect((await requestWithToken("", "/teacher/journals")).status).toBe(401);
      expect((await requestWithToken(studentToken, "/teacher/journals")).status).toBe(403);
      expect((await requestWithToken(teacherToken, "/teacher/journals")).status).toBe(200);

      // S3 config incomplete should return 500 when uploading photo
      const originalS3Env = clearS3Env();
      try {
        const formData = new FormData();
        formData.append("mood", "happy");
        formData.append(
          "photo",
          new Blob(["fake-image-content"], { type: "image/png" }),
          "photo.png"
        );

        const headers = new Headers();
        headers.set("cookie", `${sessionCookieName}=${teacherToken}`);

        const req = new Request("http://localhost/teacher/journals", {
          method: "POST",
          headers,
          body: formData
        });

        const res = await app.request(req);
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json).toHaveProperty("message", "Konfigurasi storage belum lengkap.");
      } finally {
        restoreS3Env(originalS3Env);
      }

      // Admin endpoints
      expect((await requestWithToken("", "/admin/bank-queue")).status).toBe(401);
      expect((await requestWithToken(teacherToken, "/admin/bank-queue")).status).toBe(403);
      expect((await requestWithToken(studentToken, "/admin/bank-queue")).status).toBe(403);
    });

    describe("System Settings CRUD", () => {
      test("Admin dapat membuat, membaca, mengubah, dan menghapus setting", async () => {
        const { token: adminToken } = await createUserWithPermissions("admin", ["system.setting"]);
        const testKey = `test_setting_${nanoid(6)}`;

        // Create
        const createRes = await requestWithToken(adminToken, "/admin/settings", "POST", {
          key: testKey,
          value: "initial-value",
          description: "Setting test"
        });
        expect(createRes.status).toBe(201);
        const created = await createRes.json();
        expect(created.setting).toHaveProperty("key", testKey);
        expect(created.setting).toHaveProperty("value", "initial-value");

        // Read list
        const listRes = await requestWithToken(adminToken, "/admin/settings", "GET");
        expect(listRes.status).toBe(200);
        const list = await listRes.json();
        expect(list.settings).toEqual(expect.arrayContaining([expect.objectContaining({ key: testKey })]));

        // Read one
        const getRes = await requestWithToken(adminToken, `/admin/settings/${testKey}`, "GET");
        expect(getRes.status).toBe(200);
        const got = await getRes.json();
        expect(got.setting).toHaveProperty("value", "initial-value");

        // Update
        const updateRes = await requestWithToken(adminToken, `/admin/settings/${testKey}`, "PUT", {
          value: "updated-value"
        });
        expect(updateRes.status).toBe(200);
        const updated = await updateRes.json();
        expect(updated.setting).toHaveProperty("value", "updated-value");

        // Delete
        const deleteRes = await requestWithToken(adminToken, `/admin/settings/${testKey}`, "DELETE");
        expect(deleteRes.status).toBe(200);

        const getAfterDeleteRes = await requestWithToken(adminToken, `/admin/settings/${testKey}`, "GET");
        expect(getAfterDeleteRes.status).toBe(404);
      });

      test("Non-admin dengan permission system.setting tetap ditolak", async () => {
        const { token: teacherToken } = await createUserWithPermissions("teacher", ["system.setting"]);
        const testKey = `teacher_setting_${nanoid(6)}`;

        const res = await requestWithToken(teacherToken, "/admin/settings", "POST", {
          key: testKey,
          value: "teacher-value"
        });
        expect(res.status).toBe(403);
      });

      test("Tanpa permission system.setting ditolak", async () => {
        const { token: teacherToken } = await createUserWithPermissions("teacher", []);
        const res = await requestWithToken(teacherToken, "/admin/settings", "GET");
        expect(res.status).toBe(403);
      });

      test("Key dan value wajib diisi saat membuat setting", async () => {
        const { token: adminToken } = await createUserWithPermissions("admin", ["system.setting"]);

        const missingKey = await requestWithToken(adminToken, "/admin/settings", "POST", {
          value: "value-only"
        });
        expect(missingKey.status).toBe(400);

        const missingValue = await requestWithToken(adminToken, "/admin/settings", "POST", {
          key: "key-only"
        });
        expect(missingValue.status).toBe(400);
      });

      test("Mengubah setting yang tidak ada mengembalikan 404", async () => {
        const { token: adminToken } = await createUserWithPermissions("admin", ["system.setting"]);
        const res = await requestWithToken(adminToken, "/admin/settings/nonexistent-key", "PUT", {
          value: "x"
        });
        expect(res.status).toBe(404);
      });

      test("Aksi admin menulis activity log", async () => {
        const { userId: adminId, token: adminToken } = await createUserWithPermissions("admin", ["system.setting"]);
        const testKey = `log_setting_${nanoid(6)}`;

        await requestWithToken(adminToken, "/admin/settings", "POST", {
          key: testKey,
          value: "log-value",
          description: "Setting untuk test log"
        });

        const logs = await db
          .select()
          .from(activityLogs)
          .where(eq(activityLogs.userId, adminId))
          .orderBy(activityLogs.createdAt);

        const relevant = logs.find((log) => log.resourceType === "system_setting" && log.action === "create");
        expect(relevant).toBeDefined();
        expect(relevant?.resourceId).toBe(testKey);
      });
    });

    describe("Chat quota", () => {
      test("Teacher dapat melihat kuota obrolan", async () => {
        const { token: teacherToken } = await createUserWithPermissions("teacher", ["chat.use"]);
        const res = await requestWithToken(teacherToken, "/teacher/chat-quota", "GET");
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveProperty("limit");
        expect(json).toHaveProperty("remaining");
        expect(json).toHaveProperty("resetAt");
      });

      test("Teacher dapat mengonsumsi kuota sampai limit", async () => {
        const { token: teacherToken } = await createUserWithPermissions("teacher", ["chat.use"]);

        const first = await requestWithToken(teacherToken, "/teacher/chat-consume", "POST");
        expect(first.status).toBe(200);
        const firstJson = await first.json();
        expect(firstJson.allowed).toBe(true);

        const second = await requestWithToken(teacherToken, "/teacher/chat-quota", "GET");
        const secondJson = await second.json();
        expect(secondJson.remaining).toBe(firstJson.remaining);
      });

      test("Chat quota mengikuti konfigurasi dari system_settings", async () => {
        const { token: adminToken } = await createUserWithPermissions("admin", ["system.setting", "chat.use"]);
        const { token: teacherToken } = await createUserWithPermissions("teacher", ["chat.use"]);

        await requestWithToken(adminToken, "/admin/settings/chat.quota_config", "DELETE");

        await requestWithToken(adminToken, "/admin/settings", "POST", {
          key: "chat.quota_config",
          value: JSON.stringify({ limit: 2, windowMs: 3600000 }),
          description: "Test chat quota config"
        });

        const first = await requestWithToken(teacherToken, "/teacher/chat-consume", "POST");
        expect(first.status).toBe(200);
        const firstJson = await first.json();
        expect(firstJson.remaining).toBe(1);

        const second = await requestWithToken(teacherToken, "/teacher/chat-consume", "POST");
        expect(second.status).toBe(200);
        const secondJson = await second.json();
        expect(secondJson.remaining).toBe(0);

        const third = await requestWithToken(teacherToken, "/teacher/chat-consume", "POST");
        expect(third.status).toBe(429);
      });
    });

    describe("Parent-students CRUD", () => {
      test("Orang tua dapat melihat daftar anak yang terhubung", async () => {
        const { userId: parentId, token: parentToken } = await createUserWithPermissions("parent", ["report.view"]);
        const { userId: studentId } = await createUserWithPermissions("student", []);

        await db.insert(userRoles).ignore().values({
          id: `ur_${nanoid(12)}`,
          userId: studentId,
          roleId: (await db.select().from(roles).where(eq(roles.name, "student")).limit(1))[0].id,
          createdAt: new Date()
        });

        await db.insert(parentStudents).values({
          id: `ps_${nanoid(12)}`,
          parentUserId: parentId,
          studentUserId: studentId,
          relationship: "Ibu",
          createdAt: new Date()
        });

        const res = await requestWithToken(parentToken, "/parent/children", "GET");
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.children).toHaveLength(1);
        expect(json.children[0]).toHaveProperty("relationship", "Ibu");
      });

      test("Admin dapat membuat, mengubah, dan menghapus relasi", async () => {
        const { token: adminToken } = await createUserWithPermissions("admin", ["system.setting"]);
        const { userId: parentId } = await createUserWithPermissions("parent", []);
        const { userId: studentId } = await createUserWithPermissions("student", []);

        const createRes = await requestWithToken(adminToken, "/admin/parent-students", "POST", {
          parentUserId: parentId,
          studentUserId: studentId,
          relationship: "Ayah"
        });
        expect(createRes.status).toBe(201);
        const created = await createRes.json();
        const linkId = created.link.id;

        const listRes = await requestWithToken(adminToken, "/admin/parent-students", "GET");
        expect(listRes.status).toBe(200);
        const list = await listRes.json();
        expect(list.links).toEqual(expect.arrayContaining([expect.objectContaining({ id: linkId })]));

        const updateRes = await requestWithToken(adminToken, `/admin/parent-students/${linkId}`, "PUT", {
          relationship: "Wali"
        });
        expect(updateRes.status).toBe(200);
        const updated = await updateRes.json();
        expect(updated.link).toHaveProperty("relationship", "Wali");

        const deleteRes = await requestWithToken(adminToken, `/admin/parent-students/${linkId}`, "DELETE");
        expect(deleteRes.status).toBe(200);

        const listAfterDeleteRes = await requestWithToken(adminToken, "/admin/parent-students", "GET");
        const listAfterDelete = await listAfterDeleteRes.json();
        expect(listAfterDelete.links).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: linkId })]));
      });

      test("Membuat relasi duplikat ditolak", async () => {
        const { token: adminToken } = await createUserWithPermissions("admin", ["system.setting"]);
        const { userId: parentId } = await createUserWithPermissions("parent", []);
        const { userId: studentId } = await createUserWithPermissions("student", []);

        const first = await requestWithToken(adminToken, "/admin/parent-students", "POST", {
          parentUserId: parentId,
          studentUserId: studentId,
          relationship: "Ayah"
        });
        expect(first.status).toBe(201);

        const second = await requestWithToken(adminToken, "/admin/parent-students", "POST", {
          parentUserId: parentId,
          studentUserId: studentId,
          relationship: "Ibu"
        });
        expect(second.status).toBe(409);
      });

      test("Validasi input wajib diisi", async () => {
        const { token: adminToken } = await createUserWithPermissions("admin", ["system.setting"]);

        const res = await requestWithToken(adminToken, "/admin/parent-students", "POST", {
          relationship: "Ayah"
        });
        expect(res.status).toBe(400);
      });

      test("User yang tidak ada ditolak", async () => {
        const { token: adminToken } = await createUserWithPermissions("admin", ["system.setting"]);
        const { userId: studentId } = await createUserWithPermissions("student", []);

        const res = await requestWithToken(adminToken, "/admin/parent-students", "POST", {
          parentUserId: "usr_nonexistent",
          studentUserId: studentId,
          relationship: "Ayah"
        });
        expect(res.status).toBe(404);
      });

      describe("Admin classes CRUD", () => {
        test("Admin dapat membuat, membaca, mengubah, dan menghapus kelas", async () => {
          const { token: adminToken } = await createUserWithPermissions("admin", ["class.manage"]);
          const { userId: teacherId } = await createUserWithPermissions("teacher", ["class.manage"]);

          const createRes = await requestWithToken(adminToken, "/admin/classes", "POST", {
            teacherUserId: teacherId,
            name: "Kelas Test",
            subject: "Matematika",
            grade: "8",
            students: 30
          });
          expect(createRes.status).toBe(201);
          const created = await createRes.json();
          const classId = created.class.id;
          expect(created.class).toHaveProperty("name", "Kelas Test");

          const listRes = await requestWithToken(adminToken, "/admin/classes", "GET");
          expect(listRes.status).toBe(200);
          const list = await listRes.json();
          expect(list.classes).toEqual(expect.arrayContaining([expect.objectContaining({ id: classId })]));

          const updateRes = await requestWithToken(adminToken, `/admin/classes/${classId}`, "PATCH", {
            name: "Kelas Test Updated",
            students: 32
          });
          expect(updateRes.status).toBe(200);
          const updated = await updateRes.json();
          expect(updated.class).toHaveProperty("name", "Kelas Test Updated");
          expect(updated.class).toHaveProperty("students", 32);

          const deleteRes = await requestWithToken(adminToken, `/admin/classes/${classId}`, "DELETE");
          expect(deleteRes.status).toBe(200);

          const listAfterDeleteRes = await requestWithToken(adminToken, "/admin/classes", "GET");
          const listAfterDelete = await listAfterDeleteRes.json();
          expect(listAfterDelete.classes).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ id: classId })])
          );
        });

        test("Teacher tanpa class.manage ditolak", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", ["material.create"]);
          const res = await requestWithToken(teacherToken, "/admin/classes", "GET");
          expect(res.status).toBe(403);
        });

        test("Input wajib kelas ditolak", async () => {
          const { token: adminToken } = await createUserWithPermissions("admin", ["class.manage"]);
          const res = await requestWithToken(adminToken, "/admin/classes", "POST", {
            name: "Kelas Tanpa Mapel"
          });
          expect(res.status).toBe(400);
        });
      });

      describe("Teacher materials CRUD", () => {
        test("Teacher dapat membuat, membaca, mengubah, dan menghapus materi", async () => {
          const { token: teacherToken, userId: teacherId } = await createUserWithPermissions("teacher", [
            "class.manage",
            "material.create"
          ]);

          const classRes = await requestWithToken(teacherToken, "/teacher/classes", "POST", {
            name: "Kelas Material",
            subject: "Sains",
            grade: "7"
          });
          expect(classRes.status).toBe(201);
          const classJson = await classRes.json();
          const classId = classJson.class.id;

          const createRes = await requestWithToken(teacherToken, "/teacher/materials", "POST", {
            classId,
            title: "Materi Test",
            type: "lesson",
            description: "Deskripsi materi test"
          });
          expect(createRes.status).toBe(201);
          const created = await createRes.json();
          const materialId = created.material.id;

          const listRes = await requestWithToken(teacherToken, "/teacher/materials", "GET");
          expect(listRes.status).toBe(200);
          const list = await listRes.json();
          expect(list.materials).toEqual(expect.arrayContaining([expect.objectContaining({ id: materialId })]));

          const updateRes = await requestWithToken(teacherToken, `/teacher/materials/${materialId}`, "PATCH", {
            title: "Materi Test Updated",
            status: "draft"
          });
          expect(updateRes.status).toBe(200);
          const updated = await updateRes.json();
          expect(updated.material).toHaveProperty("title", "Materi Test Updated");
          expect(updated.material).toHaveProperty("status", "draft");

          const deleteRes = await requestWithToken(teacherToken, `/teacher/materials/${materialId}`, "DELETE");
          expect(deleteRes.status).toBe(200);
        });

        test("Teacher lain tidak bisa mengubah materi milik guru lain", async () => {
          const { token: teacher1Token } = await createUserWithPermissions("teacher", ["class.manage", "material.create"]);

          const classRes = await requestWithToken(teacher1Token, "/teacher/classes", "POST", {
            name: "Kelas Private",
            subject: "IPA",
            grade: "9"
          });
          const classId = (await classRes.json()).class.id;

          const materialRes = await requestWithToken(teacher1Token, "/teacher/materials", "POST", {
            classId,
            title: "Materi Private",
            type: "lesson",
            description: "Deskripsi"
          });
          const materialId = (await materialRes.json()).material.id;

          // Buat teacher kedua setelah resource milik teacher1 sudah ada.
          const { token: teacher2Token } = await createUserWithPermissions("teacher", ["material.create"]);

          const res = await requestWithToken(teacher2Token, `/teacher/materials/${materialId}`, "PATCH", {
            title: "Hacked"
          });
          expect(res.status).toBe(404);
        });
      });

      describe("Teacher idequests CRUD", () => {
        test("Teacher dapat membuat, membaca, mengubah, dan menghapus quest", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", [
            "class.manage",
            "quest.manage"
          ]);

          const classRes = await requestWithToken(teacherToken, "/teacher/classes", "POST", {
            name: "Kelas Quest",
            subject: "Matematika",
            grade: "8"
          });
          const classId = (await classRes.json()).class.id;

          const createRes = await requestWithToken(teacherToken, "/teacher/idequests", "POST", {
            classId,
            title: "Quest Test",
            mission: "Selesaikan misi ini",
            points: 100,
            dueDate: "3d",
            status: "published"
          });
          expect(createRes.status).toBe(201);
          const created = await createRes.json();
          const questId = created.quest.id;

          const listRes = await requestWithToken(teacherToken, "/teacher/idequests", "GET");
          expect(listRes.status).toBe(200);
          const list = await listRes.json();
          expect(list.quests).toEqual(expect.arrayContaining([expect.objectContaining({ id: questId })]));

          const updateRes = await requestWithToken(teacherToken, `/teacher/idequests/${questId}`, "PATCH", {
            title: "Quest Test Updated",
            points: 150
          });
          expect(updateRes.status).toBe(200);
          const updated = await updateRes.json();
          expect(updated.quest).toHaveProperty("title", "Quest Test Updated");
          expect(updated.quest).toHaveProperty("points", 150);

          const deleteRes = await requestWithToken(teacherToken, `/teacher/idequests/${questId}`, "DELETE");
          expect(deleteRes.status).toBe(200);
        });

        test("Tanpa permission quest.manage ditolak", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", ["class.manage"]);
          const res = await requestWithToken(teacherToken, "/teacher/idequests", "GET");
          expect(res.status).toBe(403);
        });
      });

      describe("Student join class & complete flow", () => {
        test("Student dapat bergabung kelas, menyelesaikan materi, dan mengumpulkan quest", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", [
            "class.manage",
            "material.create",
            "quest.manage"
          ]);

          const classRes = await requestWithToken(teacherToken, "/teacher/classes", "POST", {
            name: "Kelas Siswa",
            subject: "Sains",
            grade: "7"
          });
          const classJson = await classRes.json();
          const classId = classJson.class.id;
          const classCode = classJson.class.classCode;

          const materialRes = await requestWithToken(teacherToken, "/teacher/materials", "POST", {
            classId,
            title: "Materi Siswa",
            type: "lesson",
            description: "Deskripsi"
          });
          const materialId = (await materialRes.json()).material.id;

          const questRes = await requestWithToken(teacherToken, "/teacher/idequests", "POST", {
            classId,
            materialId,
            title: "Quest Siswa",
            mission: "Selesaikan",
            points: 100,
            dueDate: "3d",
            status: "published"
          });
          const questId = (await questRes.json()).quest.id;

          const { token: studentToken } = await createUserWithPermissions("student", ["quest.play"]);

          const joinRes = await requestWithToken(studentToken, "/student/classes/join", "POST", {
            classCode
          });
          expect(joinRes.status).toBe(201);
          const joinJson = await joinRes.json();
          expect(joinJson.class).toHaveProperty("id", classId);

          const classesRes = await requestWithToken(studentToken, "/student/classes", "GET");
          expect(classesRes.status).toBe(200);
          const classesJson = await classesRes.json();
          expect(classesJson.classes).toEqual(expect.arrayContaining([expect.objectContaining({ id: classId })]));

          const materialsRes = await requestWithToken(studentToken, "/student/materials", "GET");
          expect(materialsRes.status).toBe(200);
          const materialsJson = await materialsRes.json();
          expect(materialsJson.materials).toEqual(expect.arrayContaining([expect.objectContaining({ id: materialId, progress: 0 })]));

          const completeMatRes = await requestWithToken(studentToken, `/student/materials/${materialId}/complete`, "POST");
          expect(completeMatRes.status).toBe(200);
          const completeMatJson = await completeMatRes.json();
          expect(completeMatJson.progress).toHaveProperty("progress", 100);

          const questsRes = await requestWithToken(studentToken, "/student/quests", "GET");
          expect(questsRes.status).toBe(200);
          const questsJson = await questsRes.json();
          expect(questsJson.quests).toEqual(expect.arrayContaining([expect.objectContaining({ id: questId, progress: 0 })]));

          const completeQuestRes = await requestWithToken(studentToken, `/student/quests/${questId}/complete`, "POST");
          expect(completeQuestRes.status).toBe(200);
          const completeQuestJson = await completeQuestRes.json();
          expect(completeQuestJson.progress).toHaveProperty("progress", 100);
          expect(completeQuestJson.progress).toHaveProperty("earnedPoints", 100);

          const achievementsRes = await requestWithToken(studentToken, "/student/achievements", "GET");
          expect(achievementsRes.status).toBe(200);
          const achievementsJson = await achievementsRes.json();
          expect(achievementsJson.meta.completedMaterials).toBe(1);
          expect(achievementsJson.meta.completedQuests).toBe(1);
          expect(achievementsJson.meta.totalPoints).toBe(100);
        });

        test("Student tidak bisa menyelesaikan quest sebelum materi terkait", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", [
            "class.manage",
            "material.create",
            "quest.manage"
          ]);

          const classRes = await requestWithToken(teacherToken, "/teacher/classes", "POST", {
            name: "Kelas Prasyarat",
            subject: "Matematika",
            grade: "8"
          });
          const classJson = await classRes.json();
          const classId = classJson.class.id;
          const classCode = classJson.class.classCode;

          const materialRes = await requestWithToken(teacherToken, "/teacher/materials", "POST", {
            classId,
            title: "Materi Prasyarat",
            type: "lesson",
            description: "Deskripsi"
          });
          const materialId = (await materialRes.json()).material.id;

          const questRes = await requestWithToken(teacherToken, "/teacher/idequests", "POST", {
            classId,
            materialId,
            title: "Quest Prasyarat",
            mission: "Selesaikan materi dulu",
            points: 50,
            dueDate: "3d",
            status: "published"
          });
          const questId = (await questRes.json()).quest.id;

          const { token: studentToken } = await createUserWithPermissions("student", ["quest.play"]);
          await requestWithToken(studentToken, "/student/classes/join", "POST", { classCode });

          const res = await requestWithToken(studentToken, `/student/quests/${questId}/complete`, "POST");
          expect(res.status).toBe(400);
        });

        test("Student tidak bisa menyelesaikan materi dari kelas yang belum diikuti", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", [
            "class.manage",
            "material.create"
          ]);

          const classRes = await requestWithToken(teacherToken, "/teacher/classes", "POST", {
            name: "Kelas Asing",
            subject: "IPS",
            grade: "7"
          });
          const classId = (await classRes.json()).class.id;

          const materialRes = await requestWithToken(teacherToken, "/teacher/materials", "POST", {
            classId,
            title: "Materi Asing",
            type: "lesson",
            description: "Deskripsi"
          });
          const materialId = (await materialRes.json()).material.id;

          const { token: studentToken } = await createUserWithPermissions("student", []);

          const res = await requestWithToken(studentToken, `/student/materials/${materialId}/complete`, "POST");
          expect(res.status).toBe(404);
        });

        test("Join kelas dua kali ditolak", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", ["class.manage"]);
          const classRes = await requestWithToken(teacherToken, "/teacher/classes", "POST", {
            name: "Kelas Double Join",
            subject: "BIO",
            grade: "9"
          });
          const classCode = (await classRes.json()).class.classCode;

          const { token: studentToken } = await createUserWithPermissions("student", []);
          const firstJoin = await requestWithToken(studentToken, "/student/classes/join", "POST", { classCode });
          expect(firstJoin.status).toBe(201);

          const secondJoin = await requestWithToken(studentToken, "/student/classes/join", "POST", { classCode });
          expect(secondJoin.status).toBe(409);
        });

        test("ClassCode wajib diisi saat join", async () => {
          const { token: studentToken } = await createUserWithPermissions("student", []);
          const res = await requestWithToken(studentToken, "/student/classes/join", "POST", {});
          expect(res.status).toBe(400);
        });

        test("Join kelas yang tidak aktif atau tidak ada ditolak", async () => {
          const { token: studentToken } = await createUserWithPermissions("student", []);
          const res = await requestWithToken(studentToken, "/student/classes/join", "POST", {
            classCode: "NONEXISTENT"
          });
          expect(res.status).toBe(404);
        });

        test("Non-student tidak bisa join kelas", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", ["class.manage"]);
          const res = await requestWithToken(teacherToken, "/student/classes/join", "POST", {
            classCode: "SOMECLASS"
          });
          expect(res.status).toBe(403);
        });

        test("Student tanpa quest.play ditolak mengakses quest", async () => {
          const { token: studentToken } = await createUserWithPermissions("student", []);
          const res = await requestWithToken(studentToken, "/student/quests", "GET");
          expect(res.status).toBe(403);
        });
      });
    });
  });
});
