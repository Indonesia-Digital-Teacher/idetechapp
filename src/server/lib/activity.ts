import { nanoid } from "nanoid";
import { db } from "../db/client";
import { activityLogs } from "../db/schema";

export async function writeActivityLog(input: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}) {
  const now = new Date();
  await db.insert(activityLogs).values({
    id: `al_${nanoid(12)}`,
    userId: input.userId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    details: input.details ? JSON.stringify(input.details) : null,
    createdAt: now
  });
}
