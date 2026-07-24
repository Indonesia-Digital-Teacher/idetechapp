import { and, eq, gt } from "drizzle-orm";
import { getCookie, setCookie } from "hono/cookie";
import type { Context, Next } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import { oauthAccounts, permissions, rolePermissions, roles, sessions, systemSettings, userRoles, users } from "../db/schema";
import type { RoleName } from "../db/schema";
import { getGoogleRoleRule } from "./settings";

export const sessionCookieName = "idetech_session";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  fullName: string | null;
  honorific: "Pak" | "Bu" | null;
  schoolName: string | null;
  contactChannel: "wa" | "telegram" | null;
  contactValue: string | null;
  profileCompleted: boolean;
  status: "active" | "pending" | "suspended";
  hp: number;
  coins: number;
  lastCheckInDate: string | null;
  checkInStreak: number;
  welcomeBonusClaimed: boolean;
  roles: RoleName[];
  activeRole: RoleName;
  permissions: string[];
};

export type AppEnv = {
  Variables: {
    authUser: AuthUser;
  };
};

export function setSessionCookie(c: Context, token: string, expiresAt: Date) {
  setCookie(c, sessionCookieName, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production"
  });
}

export function clearSessionCookie(c: Context) {
  setCookie(c, sessionCookieName, "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production"
  });
}

export async function getSessionUser(token?: string): Promise<AuthUser | null> {
  if (!token) return null;

  // 1. Cek di tabel sessions (untuk web session normal)
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.sessionToken, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  let userId: string;
  let activeRole: RoleName;

  if (session) {
    userId = session.userId;
    activeRole = session.activeRole as RoleName;
  } else {
    // 2. Cek di tabel users (untuk telegram link token)
    const [userByToken] = await db
      .select()
      .from(users)
      .where(eq(users.sessionToken, token))
      .limit(1);

    if (!userByToken) return null;

    // Cek kadaluarsa session token (default 30 hari)
    if (userByToken.sessionTokenCreatedAt) {
      const expiry = new Date(userByToken.sessionTokenCreatedAt.getTime() + 1000 * 60 * 60 * 24 * 30);
      if (new Date() > expiry) return null;
    }

    userId = userByToken.id;
    
    // Cari role pertama user untuk menentukan activeRole default
    const roleRows = await db
      .select({ name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    const userRoleNames = roleRows.map((row) => row.name as RoleName);
    
    activeRole = userRoleNames.includes("admin")
      ? "admin"
      : userRoleNames.includes("teacher")
      ? "teacher"
      : (userRoleNames[0] ?? "student");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const roleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  const userRoleNames = roleRows.map((row) => row.name as RoleName);
  
  if (session) {
    activeRole = userRoleNames.includes(session.activeRole as RoleName)
      ? (session.activeRole as RoleName)
      : (userRoleNames[0] ?? "student");
  }

  const activeRoleRows = activeRole
    ? await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, activeRole))
        .limit(1)
    : [];

  const permissionRows = activeRoleRows.length
    ? await db
        .select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, activeRoleRows[0].id))
    : [];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    fullName: user.fullName,
    honorific: user.honorific,
    schoolName: user.schoolName,
    contactChannel: user.contactChannel,
    contactValue: user.contactValue,
    profileCompleted: user.profileCompleted,
    status: user.status,
    hp: user.hp,
    coins: user.coins,
    lastCheckInDate: user.lastCheckInDate,
    checkInStreak: user.checkInStreak,
    welcomeBonusClaimed: user.welcomeBonusClaimed,
    roles: userRoleNames,
    activeRole,
    permissions: [...new Set(permissionRows.map((row) => row.name))]
  };
}

export async function createSession(userId: string, activeRole: RoleName) {
  const token = `sess_${nanoid(32)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  await db.insert(sessions).values({
    id: `ses_${nanoid(12)}`,
    userId,
    sessionToken: token,
    activeRole,
    expiresAt,
    createdAt: now
  });

  return { token, expiresAt };
}

export async function upsertGoogleUser(profile: {
  googleId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date | null;
}) {
  const now = new Date();
  const normalizedEmail = profile.email.trim().toLowerCase();
  const accountRule = await resolveGoogleUserRule(normalizedEmail);
  const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  const userId = existing?.id ?? `usr_${nanoid(12)}`;
  const isKnownUser = Boolean(existing);

  if (existing) {
    await db
      .update(users)
      .set({
        name: profile.name,
        avatarUrl: profile.avatarUrl ?? existing.avatarUrl,
        emailVerified: profile.emailVerified,
        status: accountRule.status ?? existing.status,
        updatedAt: now
      })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      id: userId,
      name: profile.name,
      email: normalizedEmail,
      avatarUrl: profile.avatarUrl ?? null,
      emailVerified: profile.emailVerified,
      status: accountRule.status ?? "active",
      createdAt: now,
      updatedAt: now
    });
  }

  await syncUserRoles(userId, accountRule.roles, now);

  await db
    .insert(oauthAccounts)
    .values({
      id: `oa_${nanoid(12)}`,
      userId,
      provider: "google",
      providerAccountId: profile.googleId,
      accessToken: profile.accessToken ?? null,
      refreshToken: profile.refreshToken ?? null,
      expiresAt: profile.expiresAt ?? null,
      createdAt: now,
      updatedAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        accessToken: profile.accessToken ?? null,
        refreshToken: profile.refreshToken ?? null,
        expiresAt: profile.expiresAt ?? null,
        updatedAt: now
      }
    });

  const roleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return {
    userId,
    isKnownUser,
    status: accountRule.status ?? existing?.status ?? "active",
    roles: roleRows.map((row) => row.name as RoleName)
  };
}

async function resolveGoogleUserRule(email: string): Promise<{ roles: RoleName[]; status?: "active" | "pending" | "suspended" }> {
  const rule = await getGoogleRoleRule();

  if (rule.adminEmails.some((adminEmail) => adminEmail.toLowerCase() === email)) {
    return { roles: ["admin", "teacher"], status: "active" };
  }

  if (rule.teacherDomains.some((domain) => email.endsWith(domain.toLowerCase()))) {
    return { roles: ["teacher"], status: "active" };
  }

  if (rule.studentDomains && rule.studentDomains.some((domain) => email.endsWith(domain.toLowerCase()))) {
    return { roles: ["student"], status: "active" };
  }

  return { roles: [rule.defaultRole], status: "active" };
}

async function syncUserRoles(userId: string, roleNames: RoleName[], now: Date) {
  await db.delete(userRoles).where(eq(userRoles.userId, userId));

  for (const roleName of roleNames) {
    const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
    if (!role) continue;

    await db.insert(userRoles).values({
      id: `ur_${nanoid(12)}`,
      userId,
      roleId: role.id,
      createdAt: now
    });
  }
}

export async function authRequired(c: Context<AppEnv>, next: Next) {
  let token = getCookie(c, sessionCookieName);

  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const t = authHeader.substring(7);
      if (t && t !== "null" && t !== "undefined") {
        token = t;
      }
    }
  }

  const user = await getSessionUser(token);
  if (!user) {
    return c.json({ message: "Belum login." }, 401);
  }

  c.set("authUser", user);
  await next();
}

export function requireRole(allowedRoles: RoleName[]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("authUser");
    if (!user || !allowedRoles.includes(user.activeRole)) {
      return c.json({ message: "Role tidak memiliki akses ke fitur ini." }, 403);
    }
    if (user.status === "pending" || user.status === "suspended") {
      return c.json({ message: "Akun Anda belum aktif atau sedang dinonaktifkan. Silakan hubungi administrator." }, 403);
    }

    await next();
  };
}

export function requirePermission(permission: string) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("authUser");
    if (!user || !user.permissions.includes(permission)) {
      return c.json({ message: "Permission tidak mencukupi." }, 403);
    }
    if (user.status === "pending" || user.status === "suspended") {
      return c.json({ message: "Akun Anda belum aktif atau sedang dinonaktifkan. Silakan hubungi administrator." }, 403);
    }

    await next();
  };
}
