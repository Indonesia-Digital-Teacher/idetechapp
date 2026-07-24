import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach, spyOn } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import app from "./api";
import { db } from "../db/client";
import { users, roles, permissions, rolePermissions, userRoles, parentStudents, activityLogs, systemSettings, classes, classStudents, materials, studentMaterialProgress, aiGenerationQuotas } from "../db/schema";
import type { RoleName } from "../db/schema";
import { nanoid } from "nanoid";
import { sessionCookieName, createSession } from "../lib/auth";
import { initializeDatabase } from "../db/init";
import { permissionCatalog, roleCatalog, rolePermissions as catalogRolePermissions } from "../lib/catalog";
import { pool } from "../db/client";

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

async function hasDatabaseConnection(timeoutMs = 1500) {
  const timeout = new Promise<false>((resolve) => {
    setTimeout(() => resolve(false), timeoutMs);
  });

  const probe = pool.getConnection()
    .then((connection) => {
      connection.release();
      return true;
    })
    .catch(() => false);

  return Promise.race([probe, timeout]);
}

const describeIfDb = (await hasDatabaseConnection()) ? describe : describe.skip;

describeIfDb("Backend API Endpoints", () => {
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

  afterAll(async () => {
    // Kembalikan permission catalog bawaan setelah pengujian selesai agar database tidak 403 Forbidden di dev environment
    await db.delete(rolePermissions);
    const allRoles = await db.select().from(roles);
    const allPermissions = await db.select().from(permissions);
    const now = new Date();

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

  describe("Google OAuth flow", () => {
    let originalFetch: typeof globalThis.fetch;
    let originalClientId: string | undefined;
    let originalClientSecret: string | undefined;

    function mockGoogleOAuth(payloads: {
      token?: Record<string, unknown>;
      tokenStatus?: number;
      userInfo?: Record<string, unknown>;
      userInfoStatus?: number;
    } = {}) {
      originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url === "https://oauth2.googleapis.com/token") {
          if (payloads.tokenStatus && payloads.tokenStatus >= 400) {
            return new Response(JSON.stringify({ error: "invalid_grant" }), {
              status: payloads.tokenStatus,
              headers: { "content-type": "application/json" }
            });
          }
          return new Response(JSON.stringify(payloads.token ?? { access_token: "mock_access_token", expires_in: 3600 }), {
            headers: { "content-type": "application/json" }
          });
        }

        if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
          if (payloads.userInfoStatus && payloads.userInfoStatus >= 400) {
            return new Response(JSON.stringify({ error: "invalid_token" }), {
              status: payloads.userInfoStatus,
              headers: { "content-type": "application/json" }
            });
          }
          return new Response(JSON.stringify(payloads.userInfo ?? {
            sub: "google_123",
            name: "Test Google",
            email: "google-test@example.com",
            picture: "https://example.com/photo.jpg",
            email_verified: true
          }), {
            headers: { "content-type": "application/json" }
          });
        }

        return originalFetch(input, init);
      }) as typeof fetch;
    }

    beforeEach(() => {
      originalClientId = process.env.GOOGLE_CLIENT_ID;
      originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    });

    afterEach(() => {
      if (originalFetch) globalThis.fetch = originalFetch;
      if (originalClientId === undefined) {
        delete process.env.GOOGLE_CLIENT_ID;
      } else {
        process.env.GOOGLE_CLIENT_ID = originalClientId;
      }
      if (originalClientSecret === undefined) {
        delete process.env.GOOGLE_CLIENT_SECRET;
      } else {
        process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
      }
    });

    test("GET /auth/google mengarahkan ke Google jika GOOGLE_CLIENT_ID tersedia", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-client-id";
      const res = await app.request("/auth/google");
      expect(res.status).toBe(302);
      const location = res.headers.get("location") ?? "";
      expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(location).toContain("client_id=mock-client-id");
      expect(location).toContain("redirect_uri=");
      expect(location).toContain("scope=openid+email+profile");
    });

    test("GET /auth/google mengarahkan ke demo-required jika GOOGLE_CLIENT_ID tidak tersedia", async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      const res = await app.request("/auth/google");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/?auth=demo-required");
    });

    test("GET /auth/google/callback berhasil membuat user, session, dan redirect ke /", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret";

      const email = `google-success-${nanoid(6)}@example.com`;
      mockGoogleOAuth({
        userInfo: {
          sub: `google_${nanoid(8)}`,
          name: "Test Google Success",
          email,
          picture: "https://example.com/photo.jpg",
          email_verified: true
        }
      });

      const res = await app.request(`/auth/google/callback?code=mock_code&state=mock_state`);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");

      const setCookieHeader = res.headers.get("set-cookie") ?? "";
      expect(setCookieHeader).toContain(sessionCookieName);

      const [dbUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      expect(dbUser).toBeDefined();
      expect(dbUser.name).toBe("Test Google Success");
      expect(dbUser.status).toBe("active");

      const roleRows = await db
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, dbUser.id));
      const roleNames = roleRows.map((row) => row.name);
      expect(roleNames).toContain("student");
    });

    test("GET /auth/google/callback tanpa code redirect ke google-failed", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret";

      const res = await app.request("/auth/google/callback");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/?auth=google-failed");
    });

    test("GET /auth/google/callback tanpa env Google redirect ke missing-google-env", async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const res = await app.request("/auth/google/callback?code=mock_code");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/?auth=missing-google-env");
    });

    test("GET /auth/google/callback gagal token redirect ke google-token-failed", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret";

      mockGoogleOAuth({ tokenStatus: 400 });

      const res = await app.request("/auth/google/callback?code=invalid_code");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/?auth=google-token-failed");
    });

    test("GET /auth/google/callback gagal userinfo redirect ke google-profile-failed", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret";

      mockGoogleOAuth({ userInfoStatus: 401 });

      const res = await app.request("/auth/google/callback?code=mock_code");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/?auth=google-profile-failed");
    });

    test("GET /auth/google/callback memetakan email admin ke role admin", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret";

      const adminEmail = `google-admin-${nanoid(6)}@idetech.local`;
      const existingRule = await db.select().from(systemSettings).where(eq(systemSettings.key, "google.role_rule")).limit(1);
      if (existingRule.length > 0) {
        await db
          .update(systemSettings)
          .set({ value: JSON.stringify({ adminEmails: [adminEmail], teacherDomains: ["sekolahku.id"], defaultRole: "student" }), updatedAt: new Date() })
          .where(eq(systemSettings.key, "google.role_rule"));
      } else {
        await db.insert(systemSettings).values({
          key: "google.role_rule",
          value: JSON.stringify({ adminEmails: [adminEmail], teacherDomains: ["sekolahku.id"], defaultRole: "student" }),
          updatedAt: new Date()
        });
      }

      mockGoogleOAuth({
        userInfo: {
          sub: `google_${nanoid(8)}`,
          name: "Test Google Admin",
          email: adminEmail,
          picture: null,
          email_verified: true
        }
      });

      const res = await app.request(`/auth/google/callback?code=mock_code`);
      expect(res.status).toBe(302);

      const [dbUser] = await db.select().from(users).where(eq(users.email, adminEmail.toLowerCase())).limit(1);
      expect(dbUser).toBeDefined();

      const roleRows = await db
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, dbUser.id));
      const roleNames = roleRows.map((row) => row.name);
      expect(roleNames).toContain("admin");
      expect(roleNames).toContain("teacher");
      expect(dbUser.status).toBe("active");
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

      test("Orang tua dapat melihat progres dan laporan anak (parent reports)", async () => {
        const { userId: parentId, token: parentToken } = await createUserWithPermissions("parent", ["report.view"]);
        const { userId: studentId, email: studentEmail } = await createUserWithPermissions("student", []);

        await db.insert(parentStudents).values({
          id: `ps_${nanoid(12)}`,
          parentUserId: parentId,
          studentUserId: studentId,
          relationship: "Bapak",
          createdAt: new Date()
        });

        const classId = `cls_${nanoid(12)}`;
        await db.insert(classes).values({
          id: classId,
          teacherUserId: parentId,
          name: "Test Class",
          subject: "Test Subject",
          grade: "10",
          nextSession: "",
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        const materialId = `mat_${nanoid(12)}`;
        await db.insert(materials).values({
          id: materialId,
          teacherUserId: parentId,
          classId: classId,
          title: "Test Material",
          description: "Desc",
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await db.insert(studentMaterialProgress).values({
          id: `smp_${nanoid(12)}`,
          studentUserId: studentId,
          materialId: materialId,
          progress: 100,
          completedAt: new Date(),
          updatedAt: new Date()
        });

        const res = await requestWithToken(parentToken, "/parent/reports", "GET");
        expect(res.status).toBe(200);
        const json = await res.json();
        
        expect(json).toHaveProperty("children");
        expect(json.children).toHaveLength(1);
        expect(json.children[0]).toHaveProperty("name", "Test User");
        expect(json.children[0]).toHaveProperty("progress", 100);
        expect(json.children[0]).toHaveProperty("teacherNotes");
        expect(Array.isArray(json.children[0].teacherNotes)).toBe(true);
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
    });

    describe("Teacher journals CRUD", () => {
      test("Berhasil upload foto jurnal ke S3 jika konfigurasi lengkap", async () => {
        const { token: teacherToken } = await createUserWithPermissions("teacher", ["journal.manage"]);

        const originalS3Env = clearS3Env();
        process.env.S3_ENDPOINT = "https://s3.example.com";
        process.env.S3_ACCESS_KEY = "test_key";
        process.env.S3_SECRET_KEY = "test_secret";
        process.env.S3_PUBLIC_BASE_URL = "https://public.example.com";

        const mockSend = spyOn(S3Client.prototype, "send").mockImplementation(async () => {
          return {};
        });

        try {
          const formData = new FormData();
          formData.append("mood", "happy");
          formData.append("success", "Mengajar matematika");
          formData.append("photo", new Blob(["fake-image-content"], { type: "image/png" }), "photo.png");

          const headers = new Headers();
          headers.set("cookie", `${sessionCookieName}=${teacherToken}`);

          const req = new Request("http://localhost/teacher/journals", {
            method: "POST",
            headers,
            body: formData
          });

          const res = await app.request(req);
          expect(res.status).toBe(200);
          const json = await res.json();
          expect(json).toHaveProperty("ok", true);
          expect(json.photoUrl).toContain("https://public.example.com/journals/");
          
          expect(mockSend).toHaveBeenCalled();
        } finally {
          mockSend.mockRestore();
          restoreS3Env(originalS3Env);
        }
      });
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

      describe("Teacher student name management", () => {
        test("Teacher dapat mengubah nama siswa di kelasnya", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", ["class.manage", "report.view"]);
          const classRes = await requestWithToken(teacherToken, "/teacher/classes", "POST", {
            name: "Kelas Nama Siswa",
            subject: "Bahasa Indonesia",
            grade: "8"
          });
          const classId = (await classRes.json()).class.id;
          const { userId: studentId } = await createUserWithPermissions("student", []);

          await db.insert(classStudents).values({
            id: `clsstd_${nanoid(12)}`,
            classId,
            studentUserId: studentId,
            createdAt: new Date()
          });

          const listRes = await requestWithToken(teacherToken, `/teacher/classes/${classId}/students`, "GET");
          expect(listRes.status).toBe(200);
          expect((await listRes.json()).students).toEqual(expect.arrayContaining([expect.objectContaining({ id: studentId })]));

          const updateRes = await requestWithToken(teacherToken, `/teacher/students/${studentId}/name`, "PATCH", { name: "Siswa Bernama Baru" });
          expect(updateRes.status).toBe(200);
          expect((await updateRes.json()).student.name).toBe("Siswa Bernama Baru");

          const [updatedStudent] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
          expect(updatedStudent.name).toBe("Siswa Bernama Baru");
          expect(updatedStudent.fullName).toBe("Siswa Bernama Baru");
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

      describe("Bank submit → approve → clone flow", () => {
        test("Teacher dapat submit materi ke bank, admin approve, dan guru lain clone ke kelasnya", async () => {
          // Buat teacher2 (pemilik kelas target) terlebih dahulu agar teacher1
          // yang dibuat terakhir menentukan permission akhir role teacher.
          const { token: teacher2Token } = await createUserWithPermissions("teacher", ["class.manage"]);

          const targetClassRes = await requestWithToken(teacher2Token, "/teacher/classes", "POST", {
            name: "Kelas Target",
            subject: "Fisika",
            grade: "10"
          });
          const targetClassId = (await targetClassRes.json()).class.id;

          const { token: teacher1Token } = await createUserWithPermissions("teacher", [
            "class.manage",
            "material.create",
            "quest.manage",
            "bank.manage"
          ]);

          const classRes = await requestWithToken(teacher1Token, "/teacher/classes", "POST", {
            name: "Kelas Bank",
            subject: "Fisika",
            grade: "10"
          });
          const classJson = await classRes.json();
          const classId = classJson.class.id;

          const materialRes = await requestWithToken(teacher1Token, "/teacher/materials", "POST", {
            classId,
            title: "Materi Bank",
            type: "lesson",
            description: "Deskripsi bank"
          });
          const materialId = (await materialRes.json()).material.id;

          const questRes = await requestWithToken(teacher1Token, "/teacher/idequests", "POST", {
            classId,
            title: "Quest Bank",
            mission: "Misi bank",
            points: 75,
            dueDate: "3d",
            status: "published"
          });
          const questId = (await questRes.json()).quest.id;

          // Teacher1 submits material and quest to bank
          const submitMatRes = await requestWithToken(teacher1Token, "/teacher/bank-submit", "POST", {
            type: "material",
            id: materialId
          });
          expect(submitMatRes.status).toBe(200);

          const submitQuestRes = await requestWithToken(teacher1Token, "/teacher/bank-submit", "POST", {
            type: "quest",
            id: questId
          });
          expect(submitQuestRes.status).toBe(200);

          // Material/quest should not be in public bank yet
          const publicBeforeRes = await requestWithToken(teacher1Token, "/teacher/bank-public", "GET");
          expect(publicBeforeRes.status).toBe(200);
          const publicBefore = await publicBeforeRes.json();
          expect(publicBefore.materials).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ id: materialId })])
          );
          expect(publicBefore.quests).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ id: questId })])
          );

          // Admin approves submissions
          const { token: adminToken } = await createUserWithPermissions("admin", ["bank.manage"]);

          const queueRes = await requestWithToken(adminToken, "/admin/bank-queue", "GET");
          expect(queueRes.status).toBe(200);
          const queue = await queueRes.json();
          expect(queue.materials).toEqual(expect.arrayContaining([expect.objectContaining({ id: materialId })]));
          expect(queue.quests).toEqual(expect.arrayContaining([expect.objectContaining({ id: questId })]));

          const approveMatRes = await requestWithToken(adminToken, `/admin/bank-queue/material/${materialId}`, "PATCH", {
            status: "approved"
          });
          expect(approveMatRes.status).toBe(200);

          const approveQuestRes = await requestWithToken(adminToken, `/admin/bank-queue/quest/${questId}`, "PATCH", {
            status: "approved"
          });
          expect(approveQuestRes.status).toBe(200);

          // Public bank now contains approved items
          const publicAfterRes = await requestWithToken(teacher1Token, "/teacher/bank-public", "GET");
          expect(publicAfterRes.status).toBe(200);
          const publicAfter = await publicAfterRes.json();
          expect(publicAfter.materials).toEqual(expect.arrayContaining([expect.objectContaining({ id: materialId })]));
          expect(publicAfter.quests).toEqual(expect.arrayContaining([expect.objectContaining({ id: questId })]));

          // Teacher2 requests clone ke kelas target
          const requestMatRes = await requestWithToken(teacher2Token, "/teacher/bank-requests", "POST", {
            itemType: "material",
            itemId: materialId,
            targetClassId
          });
          expect(requestMatRes.status).toBe(201);
          const materialRequestId = (await requestMatRes.json()).request.id;

          const requestQuestRes = await requestWithToken(teacher2Token, "/teacher/bank-requests", "POST", {
            itemType: "quest",
            itemId: questId,
            targetClassId
          });
          expect(requestQuestRes.status).toBe(201);
          const questRequestId = (await requestQuestRes.json()).request.id;

          // Teacher1 approves clone requests
          const approveCloneMatRes = await requestWithToken(teacher1Token, `/teacher/bank-requests/${materialRequestId}`, "PATCH", {
            status: "approved"
          });
          expect(approveCloneMatRes.status).toBe(200);

          const approveCloneQuestRes = await requestWithToken(teacher1Token, `/teacher/bank-requests/${questRequestId}`, "PATCH", {
            status: "approved"
          });
          expect(approveCloneQuestRes.status).toBe(200);

          // Verify cloned items exist in teacher2's class
          const teacher2MaterialsRes = await requestWithToken(teacher2Token, "/teacher/materials", "GET");
          expect(teacher2MaterialsRes.status).toBe(200);
          const teacher2Materials = await teacher2MaterialsRes.json();
          expect(teacher2Materials.materials).toEqual(
            expect.arrayContaining([expect.objectContaining({ title: "Materi Bank (Clone)", classId: targetClassId })])
          );

          const teacher2QuestsRes = await requestWithToken(teacher2Token, "/teacher/idequests", "GET");
          expect(teacher2QuestsRes.status).toBe(200);
          const teacher2Quests = await teacher2QuestsRes.json();
          expect(teacher2Quests.quests).toEqual(
            expect.arrayContaining([expect.objectContaining({ title: "Quest Bank (Clone)", classId: targetClassId })])
          );
        });

        test("Guru dapat langsung mengadopsi paket terkurasi beserta IdeQuest terkait ke kelasnya", async () => {
          const { token: contributorToken } = await createUserWithPermissions("teacher", [
            "class.manage", "material.create", "quest.manage", "bank.manage"
          ]);
          const sourceClassRes = await requestWithToken(contributorToken, "/teacher/classes", "POST", {
            name: "Kelas Kontributor", subject: "Matematika", grade: "11"
          });
          const sourceClassId = (await sourceClassRes.json()).class.id;
          const materialRes = await requestWithToken(contributorToken, "/teacher/materials", "POST", {
            classId: sourceClassId, title: "Barisan dan Deret", type: "lesson", description: "Materi paket"
          });
          const materialId = (await materialRes.json()).material.id;
          const questRes = await requestWithToken(contributorToken, "/teacher/idequests", "POST", {
            classId: sourceClassId, materialId, title: "Misi Barisan", mission: "Selesaikan latihan.", points: 100, dueDate: "7d", status: "published"
          });
          const questId = (await questRes.json()).quest.id;
          await requestWithToken(contributorToken, "/teacher/bank-submit", "POST", { type: "material", id: materialId });
          await requestWithToken(contributorToken, "/teacher/bank-submit", "POST", { type: "quest", id: questId });

          const { token: adminToken } = await createUserWithPermissions("admin", ["bank.manage"]);
          await requestWithToken(adminToken, `/admin/bank-queue/material/${materialId}`, "PATCH", { status: "approved" });
          await requestWithToken(adminToken, `/admin/bank-queue/quest/${questId}`, "PATCH", { status: "approved" });

          const { token: adopterToken } = await createUserWithPermissions("teacher", ["class.manage", "bank.manage"]);
          const targetClassRes = await requestWithToken(adopterToken, "/teacher/classes", "POST", {
            name: "Kelas Adopter", subject: "Matematika", grade: "11"
          });
          const targetClassId = (await targetClassRes.json()).class.id;

          const libraryRes = await requestWithToken(adopterToken, "/teacher/library", "GET");
          expect(libraryRes.status).toBe(200);
          const library = await libraryRes.json();
          expect(library.packages).toEqual(expect.arrayContaining([
            expect.objectContaining({ material: expect.objectContaining({ id: materialId }), quests: [expect.objectContaining({ id: questId })] })
          ]));

          const adoptRes = await requestWithToken(adopterToken, `/teacher/library/packages/${materialId}/adopt`, "POST", { targetClassId });
          expect(adoptRes.status).toBe(201);
          const adopted = await adoptRes.json();
          expect(adopted.material.classId).toBe(targetClassId);
          expect(adopted.quests).toHaveLength(1);
          expect(adopted.quests[0].materialId).toBe(adopted.material.id);
          expect(adopted.quests[0].classId).toBe(targetClassId);
        });

        test("Teacher tidak bisa request clone item milik sendiri", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", [
            "class.manage",
            "material.create",
            "bank.manage"
          ]);

          const classRes = await requestWithToken(teacherToken, "/teacher/classes", "POST", {
            name: "Kelas Sendiri",
            subject: "Kimia",
            grade: "11"
          });
          const classId = (await classRes.json()).class.id;

          const materialRes = await requestWithToken(teacherToken, "/teacher/materials", "POST", {
            classId,
            title: "Materi Sendiri",
            type: "lesson",
            description: "Deskripsi"
          });
          const materialId = (await materialRes.json()).material.id;

          await requestWithToken(teacherToken, "/teacher/bank-submit", "POST", { type: "material", id: materialId });

          const { token: adminToken } = await createUserWithPermissions("admin", ["bank.manage"]);
          await requestWithToken(adminToken, `/admin/bank-queue/material/${materialId}`, "PATCH", { status: "approved" });

          const res = await requestWithToken(teacherToken, "/teacher/bank-requests", "POST", {
            itemType: "material",
            itemId: materialId,
            targetClassId: classId
          });
          expect(res.status).toBe(400);
        });

        test("Non-owner tidak bisa menyetujui permintaan clone", async () => {
          const { token: teacher1Token } = await createUserWithPermissions("teacher", [
            "class.manage",
            "material.create",
            "bank.manage"
          ]);

          const classRes = await requestWithToken(teacher1Token, "/teacher/classes", "POST", {
            name: "Kelas Owner",
            subject: "Biologi",
            grade: "9"
          });
          const classId = (await classRes.json()).class.id;

          const materialRes = await requestWithToken(teacher1Token, "/teacher/materials", "POST", {
            classId,
            title: "Materi Owner",
            type: "lesson",
            description: "Deskripsi"
          });
          const materialId = (await materialRes.json()).material.id;

          await requestWithToken(teacher1Token, "/teacher/bank-submit", "POST", { type: "material", id: materialId });

          const { token: adminToken } = await createUserWithPermissions("admin", ["bank.manage"]);
          await requestWithToken(adminToken, `/admin/bank-queue/material/${materialId}`, "PATCH", { status: "approved" });

          const { token: teacher2Token } = await createUserWithPermissions("teacher", [
            "class.manage",
            "bank.manage"
          ]);
          const targetClassRes = await requestWithToken(teacher2Token, "/teacher/classes", "POST", {
            name: "Kelas Requester",
            subject: "Biologi",
            grade: "9"
          });
          const targetClassId = (await targetClassRes.json()).class.id;

          const requestRes = await requestWithToken(teacher2Token, "/teacher/bank-requests", "POST", {
            itemType: "material",
            itemId: materialId,
            targetClassId
          });
          const requestId = (await requestRes.json()).request.id;

          const { token: teacher3Token } = await createUserWithPermissions("teacher", ["bank.manage"]);
          const res = await requestWithToken(teacher3Token, `/teacher/bank-requests/${requestId}`, "PATCH", {
            status: "approved"
          });
          expect(res.status).toBe(403);
        });

        test("Teacher tanpa bank.manage ditolak submit ke bank", async () => {
          const { token: teacherToken } = await createUserWithPermissions("teacher", [
            "class.manage",
            "material.create"
          ]);
          const res = await requestWithToken(teacherToken, "/teacher/bank-submit", "POST", {
            type: "material",
            id: "mat_test"
          });
          expect(res.status).toBe(403);
        });
      });

      describe("PATCH /api/profile", () => {
        test("Harus berhasil memperbarui profil jika data valid", async () => {
          const { token } = await createUserWithPermissions("student", []);
          const res = await requestWithToken(token, "/profile", "PATCH", {
            fullName: "Budi Santoso",
            schoolName: "SMP Negeri 1 Jakarta",
            contactChannel: "wa",
            contactValue: "081234567890"
          });
          expect(res.status).toBe(200);
          const json = await res.json();
          expect(json).toHaveProperty("ok", true);
        });

        test("Harus mengembalikan 400 jika nama lengkap kurang dari 3 karakter", async () => {
          const { token } = await createUserWithPermissions("student", []);
          const res = await requestWithToken(token, "/profile", "PATCH", {
            fullName: "Bu",
            schoolName: "SMP Negeri 1 Jakarta",
            contactChannel: "wa",
            contactValue: "081234567890"
          });
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.message).toContain("minimal 3 karakter");
        });

        test("Harus mengembalikan 400 jika nama lengkap lebih dari 100 karakter", async () => {
          const { token } = await createUserWithPermissions("student", []);
          const longName = "Budi".repeat(30); // 120 chars
          const res = await requestWithToken(token, "/profile", "PATCH", {
            fullName: longName,
            schoolName: "SMP Negeri 1 Jakarta",
            contactChannel: "wa",
            contactValue: "081234567890"
          });
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.message).toContain("maksimal 100 karakter");
        });

        test("Harus mengembalikan 400 jika nama lengkap mengandung karakter non-alphabet", async () => {
          const { token } = await createUserWithPermissions("student", []);
          const res = await requestWithToken(token, "/profile", "PATCH", {
            fullName: "Budi 123",
            schoolName: "SMP Negeri 1 Jakarta",
            contactChannel: "wa",
            contactValue: "081234567890"
          });
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.message).toContain("hanya boleh mengandung huruf");
        });

        test("Harus mengembalikan 400 jika nama sekolah kurang dari 3 karakter", async () => {
          const { token } = await createUserWithPermissions("student", []);
          const res = await requestWithToken(token, "/profile", "PATCH", {
            fullName: "Budi Santoso",
            schoolName: "SD",
            contactChannel: "wa",
            contactValue: "081234567890"
          });
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.message).toContain("wajib dipilih");
        });

        test("Harus mengembalikan 400 jika nama sekolah lebih dari 150 karakter", async () => {
          const { token } = await createUserWithPermissions("student", []);
          const longSchoolName = "SMP Negeri 1 Jakarta".repeat(10); // 200 chars
          const res = await requestWithToken(token, "/profile", "PATCH", {
            fullName: "Budi Santoso",
            schoolName: longSchoolName,
            contactChannel: "wa",
            contactValue: "081234567890"
          });
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.message).toContain("maksimal 150 karakter");
        });

        test("Harus mengembalikan 400 jika nomor WA tidak valid", async () => {
          const { token } = await createUserWithPermissions("student", []);
          const res = await requestWithToken(token, "/profile", "PATCH", {
            fullName: "Budi Santoso",
            schoolName: "SMP Negeri 1 Jakarta",
            contactChannel: "wa",
            contactValue: "abc12345"
          });
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.message).toContain("Nomor WA tidak valid");
        });
    });

    describe("Teacher Todos suggest", () => {
      let originalFetch: typeof globalThis.fetch;

      beforeAll(() => {
        originalFetch = globalThis.fetch;
      });

      afterAll(() => {
        globalThis.fetch = originalFetch;
      });

      test("Harus mengembalikan saran tugas untuk guru dengan mock sukses", async () => {
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify({
            reply: JSON.stringify([
              {
                title: "Mock AI Task",
                description: "Mock AI Description",
                priority: "high",
                category: "teaching",
                classId: null
              }
            ])
          }), { headers: { "content-type": "application/json" } });
        }) as any;

        const { token, userId } = await createUserWithPermissions("teacher", []);

        await db.insert(classes).values({
          id: `cls_${nanoid(12)}`,
          teacherUserId: userId,
          name: "Test Class",
          subject: "Test Subject",
          grade: "10",
          nextSession: "",
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const res = await requestWithToken(token, "/teacher/todos/suggest", "POST");
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.suggestions).toBeDefined();
        expect(json.suggestions[0].title).toBe("Mock AI Task");
      });

      test("Harus mengembalikan saran fallback jika fetch melempar error", async () => {
        globalThis.fetch = (async () => {
          throw new Error("Network error simulation");
        }) as any;

        const { token } = await createUserWithPermissions("teacher", []);
        const res = await requestWithToken(token, "/teacher/todos/suggest", "POST");
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.suggestions).toBeDefined();
      });
    });

    describe("Teacher Todos semester-plan", () => {
      let originalFetch: typeof globalThis.fetch;

      beforeAll(() => {
        originalFetch = globalThis.fetch;
      });

      afterAll(() => {
        globalThis.fetch = originalFetch;
      });

      test("Harus mengembalikan 400 jika Capaian Pembelajaran kosong", async () => {
        const { token } = await createUserWithPermissions("teacher", []);
        const res = await requestWithToken(token, "/teacher/todos/semester-plan", "POST", {
          capaianPembelajaran: "",
          teachingDays: [2],
          startDate: "2026-07-14",
          endDate: "2026-12-11"
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.message).toContain("Capaian Pembelajaran wajib diisi");
      });

      test("Harus mengembalikan 400 jika hari mengajar kosong", async () => {
        const { token } = await createUserWithPermissions("teacher", []);
        const res = await requestWithToken(token, "/teacher/todos/semester-plan", "POST", {
          capaianPembelajaran: "Siswa mengerti aljabar",
          teachingDays: [],
          startDate: "2026-07-14",
          endDate: "2026-12-11"
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.message).toContain("Pilih minimal satu hari mengajar");
      });

      test("Harus berhasil mengembalikan rencana pertemuan dengan tanggal terhitung (mock sukses)", async () => {
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify({
            reply: JSON.stringify([
              {
                title: "Pertemuan 1: Dasar Aljabar",
                description: "Pengenalan variabel",
                priority: "high",
                category: "teaching"
              },
              {
                title: "Pertemuan 2: Persamaan Linear",
                description: "Penyelesaian persamaan linear satu variabel",
                priority: "medium",
                category: "teaching"
              }
            ])
          }), { headers: { "content-type": "application/json" } });
        }) as any;

        const { token } = await createUserWithPermissions("teacher", []);
        // Start date: 2026-07-14 (Tuesday), End date: 2026-07-23 (Thursday). Teaching days: 2 (Tuesday), 4 (Thursday)
        // Expected dates: 2026-07-14 (Tue), 2026-07-16 (Thu), 2026-07-21 (Tue), 2026-07-23 (Thu) -> 4 dates
        const res = await requestWithToken(token, "/teacher/todos/semester-plan", "POST", {
          capaianPembelajaran: "Menguasai dasar aljabar",
          teachingDays: [2, 4],
          startDate: "2026-07-14",
          endDate: "2026-07-23",
          maxMeetings: 2 // cap at 2 meetings
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.meetings).toBeDefined();
        expect(json.meetings).toHaveLength(2);
        expect(json.meetings[0].title).toBe("Pertemuan 1: Dasar Aljabar");
        expect(json.meetings[0].dueDate).toBe("2026-07-14");
        expect(json.meetings[1].title).toBe("Pertemuan 2: Persamaan Linear");
        expect(json.meetings[1].dueDate).toBe("2026-07-16");
      });

      test("Harus menggunakan fallback jika fetch melempar error", async () => {
        globalThis.fetch = (async () => {
          throw new Error("Network failure simulation");
        }) as any;

        const { token } = await createUserWithPermissions("teacher", []);
        const res = await requestWithToken(token, "/teacher/todos/semester-plan", "POST", {
          capaianPembelajaran: "Menguasai dasar aljabar",
          teachingDays: [2],
          startDate: "2026-07-14",
          endDate: "2026-07-25" // July 14 (Tue), July 21 (Tue) -> 2 dates
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.meetings).toBeDefined();
        expect(json.meetings).toHaveLength(2);
        expect(json.meetings[0].title).toContain("Pertemuan 1");
        expect(json.meetings[0].dueDate).toBe("2026-07-14");
        expect(json.meetings[1].dueDate).toBe("2026-07-21");
      });
    });

    describe("Teacher RPP & AI Generator", () => {
      let originalFetch: typeof globalThis.fetch;

      beforeAll(() => {
        originalFetch = globalThis.fetch;
      });

      afterAll(() => {
        globalThis.fetch = originalFetch;
      });

      test("Harus mengembalikan 401 jika belum login", async () => {
        const res = await app.request(new Request("http://localhost/teacher/generate-ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: "Buat RPP" })
        }));
        expect(res.status).toBe(401);
      });

      test("Harus mengembalikan 403 jika user tidak memiliki permission chat.use", async () => {
        const { token } = await createUserWithPermissions("student", []); // Student doesn't have chat.use
        const res = await requestWithToken(token, "/teacher/generate-ai", "POST", {
          prompt: "Buat RPP"
        });
        expect(res.status).toBe(403);
      });

      test("Harus mengembalikan 400 jika prompt kosong", async () => {
        const { token } = await createUserWithPermissions("teacher", ["chat.use"]);
        const res = await requestWithToken(token, "/teacher/generate-ai", "POST", {
          prompt: ""
        });
        expect(res.status).toBe(400);
      });

      test("Harus berhasil menggenerasikan RPP dengan AI jika request valid", async () => {
        globalThis.fetch = (async (input: any, init: any) => {
          const body = JSON.parse(init.body);
          expect(body.message).toContain("Buatkan Rencana Pelaksanaan Pembelajaran");
          return new Response(JSON.stringify({
            reply: "Ini adalah draft RPP lengkap buatan AI."
          }), { headers: { "content-type": "application/json" } });
        }) as any;

        const { token } = await createUserWithPermissions("teacher", ["chat.use"]);
        const res = await requestWithToken(token, "/teacher/generate-ai", "POST", {
          prompt: "Buatkan Rencana Pelaksanaan Pembelajaran Matematika Kelas 10"
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.reply).toBe("Ini adalah draft RPP lengkap buatan AI.");
      });

      test("Harus mengembalikan 429 jika kuota AI habis", async () => {
        const { token, userId } = await createUserWithPermissions("teacher", ["chat.use"]);
        
        // Simulasikan kuota terpakai habis dengan memasukkan entri kuota yang melebihi limit ke DB
        const now = new Date();
        await db.delete(aiGenerationQuotas).where(eq(aiGenerationQuotas.userId, userId));
        await db.insert(aiGenerationQuotas).values({
          id: `aig_${nanoid(12)}`,
          userId: userId,
          generationsCount: 100, // Very high
          lastResetAt: now,
          updatedAt: now
        });

        const res = await requestWithToken(token, "/teacher/generate-ai", "POST", {
          prompt: "Buatkan Rencana Pelaksanaan Pembelajaran"
        });

        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json.message).toContain("Kuota untuk Generate AI");
      });

      test("Harus menginjeksi materi BSKAP/ATP jika parameter materi resmi diberikan", async () => {
        let sentMessage = "";
        globalThis.fetch = (async (input: any, init: any) => {
          const body = JSON.parse(init.body);
          sentMessage = body.message;
          return new Response(JSON.stringify({
            reply: "Ini adalah RPP dengan materi resmi."
          }), { headers: { "content-type": "application/json" } });
        }) as any;

        const { token } = await createUserWithPermissions("teacher", ["chat.use"]);
        const res = await requestWithToken(token, "/teacher/generate-ai", "POST", {
          prompt: "Buatkan Rencana Pelaksanaan Pembelajaran",
          mapel: "bindo",
          fase: "E",
          semester: "ganjil",
          pertemuanKe: 2
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.reply).toBe("Ini adalah RPP dengan materi resmi.");
        expect(sentMessage).toContain("KONTEN MATERI RESMI UNTUK RPP INI:");
        expect(sentMessage).toContain("Bahasa Indonesia");
        expect(sentMessage).toContain("Unit 1: Laporan Hasil Observasi (LHO)");
      });

      test("Harus mengembalikan RPP lokal fallback jika AI Cybra error/timeout", async () => {
        globalThis.fetch = (async () => {
          throw new Error("Timeout/connection refused to AI");
        }) as any;

        const { token } = await createUserWithPermissions("teacher", ["chat.use"]);
        const res = await requestWithToken(token, "/teacher/generate-ai", "POST", {
          prompt: "Buatkan Rencana Pelaksanaan Pembelajaran",
          mapel: "bindo",
          fase: "E",
          semester: "ganjil",
          pertemuanKe: 2
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.reply).toContain("# Rencana Pelaksanaan Pembelajaran (RPP) / Modul Ajar");
        expect(json.reply).toContain("Laporan Hasil Observasi");
        expect(json.fallback).toBe(true);
        expect(json.message).toContain("Layanan AI CYBRA sedang tidak tersedia");
      });

      test("Harus mengembalikan RPP lokal fallback jika AI Cybra mengembalikan status non-2xx", async () => {
        globalThis.fetch = (async () => {
          return {
            ok: false,
            status: 502,
            text: async () => "Bad Gateway"
          };
        }) as any;

        const { token } = await createUserWithPermissions("teacher", ["chat.use"]);
        const res = await requestWithToken(token, "/teacher/generate-ai", "POST", {
          prompt: "Buatkan Rencana Pelaksanaan Pembelajaran",
          mapel: "bindo",
          fase: "E",
          semester: "ganjil",
          pertemuanKe: 2
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.reply).toContain("# Rencana Pelaksanaan Pembelajaran (RPP) / Modul Ajar");
        expect(json.reply).toContain("Laporan Hasil Observasi");
        expect(json.fallback).toBe(true);
        expect(json.message).toContain("Status 502");
      });
    });
  });
});
