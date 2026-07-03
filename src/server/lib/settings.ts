import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { systemSettings } from "../db/schema";

export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  if (!row) return defaultValue;

  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}

export async function setSystemSetting(key: string, value: unknown, description?: string) {
  const now = new Date();
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);

  await db
    .insert(systemSettings)
    .values({
      key,
      value: stringValue,
      description: description ?? null,
      updatedAt: now
    })
    .onDuplicateKeyUpdate({
      set: {
        value: stringValue,
        description: description ?? undefined,
        updatedAt: now
      }
    });
}

export type GoogleRoleRule = {
  adminEmails: string[];
  teacherDomains: string[];
  defaultRole: "student";
};

export const defaultGoogleRoleRule: GoogleRoleRule = {
  adminEmails: ["the.real.ferilee@gmail.com"],
  teacherDomains: ["@guru.smk.belajar.id", "@guru.sma.belajar.id", "@guru.smp.belajar.id"],
  defaultRole: "student"
};

export async function getGoogleRoleRule(): Promise<GoogleRoleRule> {
  return getSystemSetting<GoogleRoleRule>("google.role_rule", defaultGoogleRoleRule);
}

export type ChatQuotaConfig = {
  limit: number;
  windowMs: number;
};

export const defaultChatQuotaConfig: ChatQuotaConfig = {
  limit: 5,
  windowMs: 3 * 24 * 60 * 60 * 1000
};

export async function getChatQuotaConfig(): Promise<ChatQuotaConfig> {
  return getSystemSetting<ChatQuotaConfig>("chat.quota_config", defaultChatQuotaConfig);
}
