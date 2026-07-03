import { describe, expect, test, beforeAll } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import app from "./api";
import { db } from "../db/client";
import { users, roles, permissions, rolePermissions, userRoles } from "../db/schema";
import type { RoleName } from "../db/schema";
import { nanoid } from "nanoid";
import { sessionCookieName, createSession } from "../lib/auth";
import { initializeDatabase } from "../db/init";
import { permissionCatalog, rolePermissions as catalogRolePermissions } from "../lib/catalog";

describe("Backend API Endpoints", () => {
  let testUserToken: string;
  let testUserEmail: string;

  beforeAll(async () => {
    // Inisialisasi database testing (membuat tabel jika belum ada, sangat penting untuk CI/CD)
    await initializeDatabase();

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

      // Admin endpoints
      expect((await requestWithToken("", "/admin/bank-queue")).status).toBe(401);
      expect((await requestWithToken(teacherToken, "/admin/bank-queue")).status).toBe(403);
      expect((await requestWithToken(studentToken, "/admin/bank-queue")).status).toBe(403);
    });
  });
});
