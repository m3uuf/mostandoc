import { db } from "./db";
import { auditLogs } from "@shared/schema";
import type { Request } from "express";

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.suspend"
  | "user.activate"
  | "user.role_change"
  | "user.impersonate"
  | "user.impersonate_exit"
  | "document.delete"
  | "template.create"
  | "template.update"
  | "template.delete"
  | "notification.broadcast"
  | "notification.send"
  | "notification.banner"
  | "settings.update"
  | "coupon.create"
  | "coupon.update"
  | "coupon.delete";

export type AuditTargetType =
  | "user"
  | "document"
  | "template"
  | "notification"
  | "settings"
  | "coupon";

export async function logAudit(
  actorId: string,
  action: AuditAction,
  targetType?: AuditTargetType,
  targetId?: string,
  details?: Record<string, any>,
  ipAddress?: string,
) {
  try {
    await db.insert(auditLogs).values({
      actorId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details: details || null,
      ipAddress: ipAddress || null,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}
