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
  studentDomains: string[];
  defaultRole: "student";
};

export const defaultGoogleRoleRule: GoogleRoleRule = {
  adminEmails: ["the.real.ferilee@gmail.com"],
  teacherDomains: ["@guru.smk.belajar.id", "@guru.sma.belajar.id", "@guru.smp.belajar.id"],
  studentDomains: ["@siswa.smk.belajar.id", "@siswa.sma.belajar.id", "@siswa.smp.belajar.id"],
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

export type GeneralSettings = {
  adminContactWa: string;
};

export const defaultGeneralSettings: GeneralSettings = {
  adminContactWa: "6281234567890"
};

export async function getGeneralSettings(): Promise<GeneralSettings> {
  return getSystemSetting<GeneralSettings>("general_settings", defaultGeneralSettings);
}

export type AiGenerationQuotaConfig = {
  defaultLimit: number;
  overrides: Record<string, number>;
};

export const defaultAiGenerationQuotaConfig: AiGenerationQuotaConfig = {
  defaultLimit: 1,
  overrides: {}
};

export async function getAiGenerationQuotaConfig(): Promise<AiGenerationQuotaConfig> {
  return getSystemSetting<AiGenerationQuotaConfig>("ai.generation_quota_config", defaultAiGenerationQuotaConfig);
}

export type WelcomeQuote = {
  id: string;
  text: string;
  author?: string;
  roles: ("teacher" | "student" | "parent")[];
  isActive: boolean;
};

export type WelcomeQuotesConfig = {
  quotes: WelcomeQuote[];
};

export const defaultWelcomeQuotesConfig: WelcomeQuotesConfig = {
  quotes: [
    // Guru
    { id: "wq_t1", text: "Seorang guru yang baik menginspirasi harapan, menyalakan imajinasi, dan menanamkan cinta belajar.", author: "Brad Henry", roles: ["teacher"], isActive: true },
    { id: "wq_t2", text: "Mendidik bukan mengisi ember, tapi menyalakan api semangat.", author: "W.B. Yeats", roles: ["teacher"], isActive: true },
    { id: "wq_t3", text: "Guru terbaik adalah yang membantu siswanya menemukan cara belajar mereka sendiri.", roles: ["teacher"], isActive: true },
    { id: "wq_t4", text: "Setiap anak yang masuk kelas membawa potensi besar. Tugas kita adalah membantu mereka menemukannya.", roles: ["teacher"], isActive: true },
    // Siswa
    { id: "wq_s1", text: "Belajar itu bukan persiapan hidup — belajar IS hidup itu sendiri.", author: "John Dewey", roles: ["student"], isActive: true },
    { id: "wq_s2", text: "Jangan menyerah. Mulai hari ini dengan semangat baru!", roles: ["student"], isActive: true },
    { id: "wq_s3", text: "Setiap langkah kecil yang kamu ambil hari ini adalah investasi besar untuk masa depanmu.", roles: ["student"], isActive: true },
    { id: "wq_s4", text: "Kamu lebih mampu dari yang kamu kira. Teruslah bergerak maju!", roles: ["student"], isActive: true },
    // Orang Tua
    { id: "wq_p1", text: "Orang tua adalah guru pertama dan paling berpengaruh dalam kehidupan seorang anak.", roles: ["parent"], isActive: true },
    { id: "wq_p2", text: "Mendukung proses belajar anak adalah salah satu hadiah terbesar yang bisa kamu berikan.", roles: ["parent"], isActive: true },
    { id: "wq_p3", text: "Anak yang merasa didukung orang tuanya akan tumbuh dengan percaya diri.", roles: ["parent"], isActive: true }
  ]
};

export async function getWelcomeQuotesConfig(): Promise<WelcomeQuotesConfig> {
  return getSystemSetting<WelcomeQuotesConfig>("welcome.quotes_config", defaultWelcomeQuotesConfig);
}
