import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import { initializeDatabase } from "../db/init";
import { roles, userRoles, users } from "../db/schema";
import { roleCatalog } from "./catalog";
import { upsertGoogleUser } from "./auth";
import { defaultGoogleRoleRule, setSystemSetting } from "./settings";
import { pool } from "../db/client";

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

describeIfDb("upsertGoogleUser", () => {
  beforeAll(async () => {
    await initializeDatabase();

    for (const role of roleCatalog) {
      await db.insert(roles).ignore().values(role);
    }
  });

  afterEach(async () => {
    await setSystemSetting("google.role_rule", defaultGoogleRoleRule);
  });

  async function cleanupUser(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return;
    await db.delete(userRoles).where(eq(userRoles.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }

  test("Email admin mendapat role admin dan teacher", async () => {
    const email = `admin-${nanoid(6)}@example.com`.toLowerCase();
    await cleanupUser(email);

    await setSystemSetting("google.role_rule", {
      adminEmails: [email],
      teacherDomains: ["@teacher.example.com"],
      defaultRole: "student"
    });

    const result = await upsertGoogleUser({
      googleId: `google_${nanoid(12)}`,
      name: "Admin Test",
      email,
      emailVerified: true
    });

    expect(result.roles).toContain("admin");
    expect(result.roles).toContain("teacher");
    expect(result.status).toBe("active");
  });

  test("Email dengan domain guru mendapat role teacher", async () => {
    const email = `teacher-${nanoid(6)}@teacher.example.com`.toLowerCase();
    await cleanupUser(email);

    await setSystemSetting("google.role_rule", {
      adminEmails: [],
      teacherDomains: ["@teacher.example.com"],
      defaultRole: "student"
    });

    const result = await upsertGoogleUser({
      googleId: `google_${nanoid(12)}`,
      name: "Teacher Test",
      email,
      emailVerified: true
    });

    expect(result.roles).toEqual(["teacher"]);
  });

  test("Email lain mendapat role default student", async () => {
    const email = `student-${nanoid(6)}@student.example.com`.toLowerCase();
    await cleanupUser(email);

    await setSystemSetting("google.role_rule", {
      adminEmails: [],
      teacherDomains: ["@teacher.example.com"],
      defaultRole: "student"
    });

    const result = await upsertGoogleUser({
      googleId: `google_${nanoid(12)}`,
      name: "Student Test",
      email,
      emailVerified: true
    });

    expect(result.roles).toEqual(["student"]);
  });

  test("Perubahan system_settings langsung memengaruhi mapping", async () => {
    const email = `custom-${nanoid(6)}@custom.example.com`.toLowerCase();
    await cleanupUser(email);

    await setSystemSetting("google.role_rule", {
      adminEmails: [],
      teacherDomains: ["@custom.example.com"],
      defaultRole: "student"
    });

    const first = await upsertGoogleUser({
      googleId: `google_${nanoid(12)}`,
      name: "Custom Test",
      email,
      emailVerified: true
    });
    expect(first.roles).toEqual(["teacher"]);

    await setSystemSetting("google.role_rule", {
      adminEmails: [email],
      teacherDomains: ["@custom.example.com"],
      defaultRole: "student"
    });

    const second = await upsertGoogleUser({
      googleId: `google_${nanoid(12)}`,
      name: "Custom Test Updated",
      email,
      emailVerified: true
    });
    expect(second.roles).toContain("admin");
    expect(second.roles).toContain("teacher");
  });
});
