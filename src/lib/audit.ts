import { prisma } from "./db";

export async function audit(action: string, actorId?: string | null, target?: string, meta?: any) {
  try {
    await prisma.auditLog.create({
      data: { action, actorId: actorId ?? null, target, meta },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}
