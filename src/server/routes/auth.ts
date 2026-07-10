import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { db } from "../db/client";
import { roles, sessions, userRoles, users } from "../db/schema";
import type { RoleName } from "../db/schema";
import {
  type AppEnv,
  authRequired,
  clearSessionCookie,
  createSession,
  getSessionUser,
  sessionCookieName,
  setSessionCookie,
  upsertGoogleUser
} from "../lib/auth";

const app = new Hono<AppEnv>();

app.get("/me", async (c) => {
  const user = await getSessionUser(getCookie(c, sessionCookieName));
  const { getGeneralSettings } = await import("../lib/settings");
  const settings = await getGeneralSettings();
  return c.json({ user, settings });
});

app.get("/google", (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = googleRedirectUri(c.req);

  if (!clientId) {
    return c.redirect("/?auth=demo-required");
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.redirect("/?auth=google-failed");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return c.redirect("/?auth=missing-google-env");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(c.req),
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) return c.redirect("/?auth=google-token-failed");
  const token = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` }
  });

  if (!userInfoResponse.ok) return c.redirect("/?auth=google-profile-failed");
  const profile = (await userInfoResponse.json()) as {
    sub: string;
    name: string;
    email: string;
    picture?: string;
    email_verified?: boolean;
  };

  const result = await upsertGoogleUser({
    googleId: profile.sub,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.picture,
    emailVerified: Boolean(profile.email_verified),
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null
  });

  const activeRole = result.roles[0] ?? "student";
  const session = await createSession(result.userId, activeRole);
  setSessionCookie(c, session.token, session.expiresAt);
  return c.redirect("/");
});

app.post("/dev/google", async (c) => {
  const demoLoginEnabled =
    process.env.DEMO_LOGIN_ENABLED === "true" || process.env.NODE_ENV !== "production";

  if (!demoLoginEnabled) {
    return c.json({ message: "Demo login tidak tersedia di environment production." }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as { email?: string };
  const email = body.email ?? "admin@idetech.local";
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return c.json({ message: "User demo tidak ditemukan. Jalankan bun run db:seed." }, 404);
  }

  const roleRows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  const activeRole = (roleRows[0]?.name ?? "student") as RoleName;
  const session = await createSession(user.id, activeRole);
  setSessionCookie(c, session.token, session.expiresAt);

  return c.json({ user: await getSessionUser(session.token) });
});

app.post("/switch-role", authRequired, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => ({}))) as { role?: RoleName };

  if (!body.role || !authUser.roles.includes(body.role)) {
    return c.json({ message: "Role tidak tersedia untuk user ini." }, 400);
  }

  const token = getCookie(c, sessionCookieName);
  if (!token) return c.json({ message: "Session tidak ditemukan." }, 401);

  await db.update(sessions).set({ activeRole: body.role }).where(eq(sessions.sessionToken, token));
  return c.json({ user: await getSessionUser(token) });
});

app.post("/logout", async (c) => {
  const token = getCookie(c, sessionCookieName);
  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
  }

  clearSessionCookie(c);
  return c.json({ ok: true });
});

function googleRedirectUri(req: any) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  const url = new URL(req.url);
  const proto = req.header("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.header("x-forwarded-host") || req.header("host") || url.host;

  return `${proto}://${host}/api/auth/google/callback`;
}

export default app;
