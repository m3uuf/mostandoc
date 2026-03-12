import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Express, RequestHandler, Request } from "express";
import { db } from "./db";
import { users, passwordResetTokens, emailVerificationTokens } from "@shared/models/auth";
import { eq, and, gt } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function setupCustomAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
        sameSite: "lax",
      },
    })
  );
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "غير مصرح" });
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "غير مصرح" });
  }
  const user = await getUserById(req.session.userId);
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return res.status(403).json({ message: "صلاحيات غير كافية" });
  }
  return next();
};

export function getUserId(req: Request): string {
  return req.session.userId!;
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  return user;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByProviderId(provider: "google" | "facebook" | "apple", providerId: string) {
  const field = provider === "google" ? users.googleId : provider === "facebook" ? users.facebookId : users.appleId;
  const [user] = await db.select().from(users).where(eq(field, providerId));
  return user;
}

export async function createUser(data: { email: string; password: string; firstName: string; lastName?: string; phone?: string }) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase().trim(),
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName?.trim() || null,
      phone: data.phone?.trim() || null,
      authProvider: "email",
    })
    .returning();
  return user;
}

export async function createOrUpdateSocialUser(data: {
  provider: "google" | "facebook" | "apple";
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}) {
  const existing = await getUserByProviderId(data.provider, data.providerId);
  if (existing) {
    const [updated] = await db.update(users).set({
      firstName: data.firstName || existing.firstName,
      lastName: data.lastName || existing.lastName,
      profileImageUrl: data.profileImageUrl || existing.profileImageUrl,
      updatedAt: new Date(),
    }).where(eq(users.id, existing.id)).returning();
    return updated;
  }

  if (data.email) {
    const emailUser = await getUserByEmail(data.email);
    if (emailUser) {
      const providerField = data.provider === "google" ? { googleId: data.providerId }
        : data.provider === "facebook" ? { facebookId: data.providerId }
        : { appleId: data.providerId };
      const [updated] = await db.update(users).set({
        ...providerField,
        profileImageUrl: data.profileImageUrl || emailUser.profileImageUrl,
        updatedAt: new Date(),
      }).where(eq(users.id, emailUser.id)).returning();
      return updated;
    }
  }

  const providerField = data.provider === "google" ? { googleId: data.providerId }
    : data.provider === "facebook" ? { facebookId: data.providerId }
    : { appleId: data.providerId };

  const [user] = await db.insert(users).values({
    email: data.email?.toLowerCase().trim() || null,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    profileImageUrl: data.profileImageUrl || null,
    authProvider: data.provider,
    emailVerified: true,
    ...providerField,
  }).returning();
  return user;
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

export async function generatePasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });
  return token;
}

export async function validateResetToken(token: string) {
  const [record] = await db.select().from(passwordResetTokens).where(
    and(
      eq(passwordResetTokens.token, token),
      eq(passwordResetTokens.used, false),
      gt(passwordResetTokens.expiresAt, new Date())
    )
  );
  return record;
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await validateResetToken(token);
  if (!record) return null;

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId));
  await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, record.id));
  return true;
}

export async function generateEmailVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  });
  return token;
}

export async function verifyEmailToken(token: string) {
  const [record] = await db.select().from(emailVerificationTokens).where(
    and(
      eq(emailVerificationTokens.token, token),
      eq(emailVerificationTokens.used, false),
      gt(emailVerificationTokens.expiresAt, new Date())
    )
  );
  if (!record) return null;

  await db.update(users).set({ emailVerified: true, updatedAt: new Date() }).where(eq(users.id, record.userId));
  await db.update(emailVerificationTokens).set({ used: true }).where(eq(emailVerificationTokens.id, record.id));
  return record;
}
