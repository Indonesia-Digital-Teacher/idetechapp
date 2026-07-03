import { and, eq, gt } from "drizzle-orm";
import { getCookie, setCookie } from "hono/cookie";
import type { Context, Next } from "hono";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import { oauthAccounts, permissions, rolePermissions, roles, sessions, userRoles, users } from "../db/schema";
import type { RoleName } from "../db/schema";

export const sessionCookieName = "idetech_session";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  fullName: string | null;
  schoolName: string | null;
  contactChannel: "wa" | "telegram" | null;
  contactValue: string | null;
  profileCompleted: boolean;
  status: "active" | "pending" | "suspended";
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

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.sessionToken, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!session) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return null;

  const roleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  const userRoleNames = roleRows.map((row) => row.name as RoleName);
  const activeRole = userRoleNames.includes(session.activeRole as RoleName)
    ? (session.activeRole as RoleName)
    : userRoleNames[0];

  const activeRoleRows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, activeRole))
    .limit(1);

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
    schoolName: user.schoolName,
    contactChannel: user.contactChannel,
    contactValue: user.contactValue,
    profileCompleted: user.profileCompleted,
    status: user.status,
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
  const accountRule = resolveGoogleUserRule(normalizedEmail);
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
      status: accountRule.status ?? "pending",
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
    status: accountRule.status ?? existing?.status ?? "pending",
    roles: roleRows.map((row) => row.name as RoleName)
  };
}

function resolveGoogleUserRule(email: string): { roles: RoleName[]; status?: "active" | "pending" | "suspended" } {
  if (email === "the.real.ferilee@gmail.com") {
    return { roles: ["admin", "teacher"], status: "active" };
  }

  const teacherDomains = ["@guru.smk.belajar.id", "@guru.sma.belajar.id", "@guru.smp.belajar.id"];
  if (teacherDomains.some((domain) => email.endsWith(domain))) {
    return { roles: ["teacher"] };
  }

  return { roles: ["student"] };
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
  const user = await getSessionUser(getCookie(c, sessionCookieName));
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

    await next();
  };
}

export function requirePermission(permission: string) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("authUser");
    if (!user || !user.permissions.includes(permission)) {
      return c.json({ message: "Permission tidak mencukupi." }, 403);
    }

    await next();
  };
}
