import { describe, expect, test, beforeAll } from "bun:test";
import app from "./api";
import { db } from "../db/client";
import { users } from "../db/schema";
import { nanoid } from "nanoid";
import { setSessionCookie, sessionCookieName, createSession } from "../lib/auth";

describe("Backend API Endpoints", () => {
  let testUserToken: string;
  let testUserEmail: string;

  beforeAll(async () => {
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
});
