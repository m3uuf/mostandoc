import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import rateLimit, { type Options } from "express-rate-limit";
import Stripe from "stripe";
import Anthropic from "@anthropic-ai/sdk";
import { sql, eq } from "drizzle-orm";
import { db, dbQuery } from "./db";
import { users } from "@shared/models/auth";
import { storage } from "./storage";
import { cache, CACHE_TTL } from "./cache";
import { pool } from "./db";
import { setupCustomAuth, isAuthenticated, isAdmin, isSuperAdmin, getUserId, getUserByEmail, getUserById, createUser, verifyPassword, createOrUpdateSocialUser, generatePasswordResetToken, validateResetToken, resetPassword, generateEmailVerificationToken, verifyEmailToken } from "./customAuth";
import { logAudit, getClientIp } from "./audit";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/models/auth";
import multer from "multer";
import fs from "fs";
import os from "os";
import { z } from "zod";
import { PLANS as PLAN_CONFIG, getPlanLimits, getProPrice, type PlanId } from "@shared/plans";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import express from "express";
import path from "path";
import xss from "xss";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendSigningRequestEmail, sendSignatureConfirmationEmail } from "./email";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" as any })
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;


function getPagination(req: Request, defaultLimit = 20) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
  return { page, limit };
}

function cleanDates(obj: Record<string, unknown>, dateFields: string[]): Record<string, unknown> {
  const cleaned = { ...obj };
  for (const field of dateFields) {
    if (cleaned[field] === "" || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  }
  return cleaned;
}

async function checkPlanLimit(userId: string, resource: "clients" | "invoices" | "contracts" | "projects" | "documents"): Promise<{ allowed: boolean; current: number; limit: number; plan: string }> {
  const sub = await storage.getSubscription(userId);
  const plan = (sub?.plan || "free") as PlanId;
  const limits = getPlanLimits(plan, sub?.clientLimit || undefined);

  let current = 0;
  switch(resource) {
    case "clients": current = await storage.getClientCount(userId); break;
    case "invoices": current = await storage.getInvoiceCount(userId); break;
    case "contracts": current = await storage.getContractCount(userId); break;
    case "projects": current = await storage.getProjectCount(userId); break;
    case "documents": current = await storage.getDocumentCount(userId); break;
  }

  const limit = limits[resource];
  return { allowed: current < limit, current, limit, plan };
}

async function checkFeatureAccess(userId: string, feature: "signatures" | "ai" | "publicProfile"): Promise<{ allowed: boolean; plan: string }> {
  const sub = await storage.getSubscription(userId);
  const plan = (sub?.plan || "free") as PlanId;
  const limits = getPlanLimits(plan, sub?.clientLimit || undefined);
  return { allowed: limits[feature], plan };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Health check endpoint ───────────────────────────────────────
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const dbStart = Date.now();
      await pool.query("SELECT 1");
      const dbLatency = Date.now() - dbStart;
      res.json({
        status: "ok",
        uptime: process.uptime(),
        memory: process.memoryUsage().rss,
        dbLatency,
        poolTotal: pool.totalCount,
        poolIdle: pool.idleCount,
        poolWaiting: pool.waitingCount,
        cacheStats: cache.stats(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({ status: "unhealthy", error: "database unreachable" });
    }
  });

  // Serve uploaded signed documents
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // ─── Smart rate limiting (per-user for authenticated, per-IP for public) ───
  const smartKeyGenerator: Options["keyGenerator"] = (req) => {
    return req.session?.userId || req.ip || "unknown";
  };

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: smartKeyGenerator,
    validate: false,
    message: { message: "تم تجاوز الحد المسموح من الطلبات. حاول لاحقاً." },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "تم تجاوز الحد المسموح من محاولات الدخول. حاول لاحقاً." },
  });

  const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: smartKeyGenerator,
    validate: false,
    message: { message: "تم تجاوز حد البحث. حاول بعد دقيقة." },
  });

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "تم تجاوز الحد المسموح من الرسائل. حاول لاحقاً." },
  });

  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/verify-email", authLimiter);
  app.use("/api/auth/resend-verification", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
  app.use("/api/", generalLimiter);

  setupCustomAuth(app);

  // ─── File Upload (memory → base64, stored in DB) ───
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (_req, file, cb) => {
      const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
      cb(null, allowed.includes(file.mimetype));
    },
  });

  // Combined file upload + document creation (single multipart request)
  app.post("/api/documents/upload", isAuthenticated, upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ message: "لم يتم رفع ملف أو نوع الملف غير مدعوم" });
      const limitCheck = await checkPlanLimit(getUserId(req), "documents");
      if (!limitCheck.allowed) {
        return res.status(403).json({
          message: "وصلت للحد الأقصى من المستندات في باقتك الحالية",
          limit: limitCheck.limit, current: limitCheck.current, upgrade: true
        });
      }
      const title = req.body.title || "مستند بدون عنوان";
      const base64 = req.file.buffer.toString("base64");
      const fileDataStr = `data:${req.file.mimetype};base64,${base64}`;
      const fileType = req.file.mimetype.includes("pdf") ? "pdf" : "image";
      const crypto = await import("crypto");
      const shareToken = crypto.randomBytes(16).toString("hex");
      const doc = await storage.createDocument({
        userId: getUserId(req),
        title,
        fileUrl: null,
        fileType,
        docType: "file",
        content: null,
        status: "draft",
        shareToken,
      });
      // Store file data in separate table
      const { documentFiles } = await import("@shared/schema");
      await db.insert(documentFiles).values({
        documentId: doc.id,
        fileData: fileDataStr,
        mimeType: req.file.mimetype,
      });
      // Set fileUrl to the API endpoint
      await storage.updateDocument(doc.id, getUserId(req), { fileUrl: `/api/documents/${doc.id}/file` });
      doc.fileUrl = `/api/documents/${doc.id}/file`;
      res.json(doc);
    } catch (error) {
      console.error("Upload document error:", error);
      res.status(500).json({ message: "فشل في رفع المستند" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { email, password, firstName, lastName, phone } = parsed.data;
      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "البريد الإلكتروني مسجل بالفعل" });
      }
      const user = await createUser({ email, password, firstName, lastName, phone });
      req.session.userId = user.id;

      try {
        const verifyToken = await generateEmailVerificationToken(user.id);
        const verifyUrl = `${req.protocol}://${req.get("host")}/auth/verify-email?token=${verifyToken}`;
        await sendVerificationEmail(email, firstName, verifyUrl);
        await sendWelcomeEmail(email, firstName);
      } catch (emailError) {
        console.error("Verification email error:", emailError);
      }

      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "فشل في إنشاء الحساب" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { email, password } = parsed.data;
      const user = await getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }
      req.session.userId = user.id;
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "فشل في تسجيل الدخول" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "فشل في تسجيل الخروج" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await getUserById(getUserId(req));
      if (!user) return res.status(401).json({ message: "المستخدم غير موجود" });
      const { passwordHash, ...safeUser } = user;
      res.json({ ...safeUser, hasPassword: !!passwordHash });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "فشل في تحميل بيانات المستخدم" });
    }
  });

  app.patch("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { firstName, lastName, email } = req.body;
      const { db: dbInstance } = await import("./db");
      const { users } = await import("@shared/models/auth");
      const { eq } = await import("drizzle-orm");
      const [user] = await dbInstance.update(users).set({
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        updatedAt: new Date(),
      }).where(eq(users.id, userId)).returning();
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "فشل في تحديث بيانات الحساب" });
    }
  });

  app.post("/api/auth/forgot-password", authLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const user = await getUserByEmail(parsed.data.email);
      if (!user) {
        return res.json({ success: true, message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة التعيين" });
      }
      const token = await generatePasswordResetToken(user.id);
      const resetUrl = `${req.protocol}://${req.get("host")}/auth/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(user.email!, user.firstName || "", resetUrl);
      } catch (emailError) {
        console.error("Email send error:", emailError);
      }
      res.json({ success: true, message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة التعيين" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "فشل في معالجة الطلب" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const result = await resetPassword(parsed.data.token, parsed.data.password);
      if (!result) {
        return res.status(400).json({ message: "الرابط غير صالح أو منتهي الصلاحية" });
      }
      res.json({ success: true, message: "تم إعادة تعيين كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "فشل في إعادة تعيين كلمة المرور" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "كلمة المرور الحالية والجديدة مطلوبة" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
      }
      const userId = getUserId(req);
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: "لا يمكن تغيير كلمة المرور لحسابات التسجيل الاجتماعي" });
      }
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "فشل في تغيير كلمة المرور" });
    }
  });

  app.get("/api/auth/reset-password/validate", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(400).json({ valid: false });
      const record = await validateResetToken(token);
      res.json({ valid: !!record });
    } catch (error) {
      res.json({ valid: false });
    }
  });

  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(400).json({ message: "رمز التفعيل مطلوب" });
      const record = await verifyEmailToken(token);
      if (!record) {
        return res.status(400).json({ message: "رابط التفعيل غير صالح أو منتهي الصلاحية" });
      }
      res.json({ success: true, message: "تم تفعيل البريد الإلكتروني بنجاح" });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ message: "فشل في تفعيل البريد الإلكتروني" });
    }
  });

  app.post("/api/auth/resend-verification", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await getUserById(userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "لم يتم العثور على المستخدم" });
      }
      if (user.emailVerified) {
        return res.json({ success: true, message: "البريد الإلكتروني مفعل بالفعل" });
      }
      const verifyToken = await generateEmailVerificationToken(user.id);
      const verifyUrl = `${req.protocol}://${req.get("host")}/auth/verify-email?token=${verifyToken}`;
      await sendVerificationEmail(user.email, user.firstName || "", verifyUrl);
      res.json({ success: true, message: "تم إرسال رابط التفعيل" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "فشل في إرسال رابط التفعيل" });
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    }, async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await createOrUpdateSocialUser({
          provider: "google",
          providerId: profile.id,
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }));

    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
    app.get("/api/auth/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/auth?error=google" }), (req, res) => {
      const user = req.user as { id: string };
      req.session.userId = user.id;
      res.redirect("/dashboard");
    });
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ["id", "emails", "name", "picture.type(large)"],
    }, async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
      try {
        const user = await createOrUpdateSocialUser({
          provider: "facebook",
          providerId: profile.id,
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }));

    app.get("/api/auth/facebook", passport.authenticate("facebook", { scope: ["email"], session: false }));
    app.get("/api/auth/facebook/callback", passport.authenticate("facebook", { session: false, failureRedirect: "/auth?error=facebook" }), (req, res) => {
      const user = req.user as { id: string };
      req.session.userId = user.id;
      res.redirect("/dashboard");
    });
  }

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    const AppleStrategy = require("passport-apple");
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      callbackURL: "/api/auth/apple/callback",
      scope: ["name", "email"],
    }, async (_accessToken: string, _refreshToken: string, idToken: any, profile: any, done: any) => {
      try {
        const email = idToken?.email || profile?.email;
        const firstName = profile?.name?.firstName;
        const lastName = profile?.name?.lastName;
        const user = await createOrUpdateSocialUser({
          provider: "apple",
          providerId: idToken?.sub || profile?.id,
          email,
          firstName,
          lastName,
        });
        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }));

    app.get("/api/auth/apple", passport.authenticate("apple", { session: false }));
    app.post("/api/auth/apple/callback", passport.authenticate("apple", { session: false, failureRedirect: "/auth?error=apple" }), (req, res) => {
      const user = req.user as { id: string };
      req.session.userId = user.id;
      res.redirect("/dashboard");
    });
  }

  app.get("/api/auth/providers", (_req: Request, res: Response) => {
    res.json({
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      apple: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
    });
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats(getUserId(req));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الإحصائيات" });
    }
  });

  app.get("/api/dashboard/overdue-invoices", isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getOverdueInvoices(getUserId(req));
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الفواتير المتأخرة" });
    }
  });

  app.get("/api/dashboard/expiring-contracts", isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.getExpiringContracts(getUserId(req), 30);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العقود" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      res.json(profile || null);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل البروفايل" });
    }
  });

  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.upsertProfile({ ...req.body, userId: getUserId(req) });
      res.json(profile);
    } catch (error: any) {
      if (error.constraint === "profiles_username_unique") {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      res.status(500).json({ message: "فشل في حفظ البروفايل" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.updateProfile(getUserId(req), req.body);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث البروفايل" });
    }
  });

  // ─── Global Search (بحث موحد) ────────────────────────────────────
  app.get("/api/search", searchLimiter, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (!q || q.length < 2) {
        return res.json({ clients: [], contracts: [], invoices: [], documents: [], projects: [] });
      }
      const limit = Math.min(10, parseInt(req.query.limit as string) || 5);
      const results = await storage.globalSearch(getUserId(req), q, limit);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "فشل في البحث" });
    }
  });

  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const { search, status } = req.query;
      const pagination = getPagination(req);
      const result = await storage.getClients(getUserId(req), pagination, search as string, status as string);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العملاء" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id, getUserId(req));
      if (!client) return res.status(404).json({ message: "العميل غير موجود" });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العميل" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const limitCheck = await checkPlanLimit(getUserId(req), "clients");
      if (!limitCheck.allowed) {
        return res.status(403).json({
          message: "وصلت للحد الأقصى من العملاء في باقتك الحالية",
          limit: limitCheck.limit, current: limitCheck.current, upgrade: true
        });
      }
      const client = await storage.createClient({ ...req.body, userId: getUserId(req) });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "فشل في إضافة العميل" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, getUserId(req), req.body);
      if (!client) return res.status(404).json({ message: "العميل غير موجود" });
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث العميل" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id as string, getUserId(req));
      res.json({ success: true });
    } catch (error: any) {
      if (error.message?.startsWith("CLIENT_HAS_RELATIONS")) {
        const [, contracts, invoices, projects] = error.message.split(":");
        return res.status(400).json({
          message: `لا يمكن حذف العميل لأنه مرتبط بـ ${contracts} عقد و ${invoices} فاتورة و ${projects} مشروع. يرجى حذف أو نقل البيانات المرتبطة أولاً.`
        });
      }
      res.status(500).json({ message: "فشل في حذف العميل" });
    }
  });

  app.get("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const { status, search } = req.query;
      const pagination = getPagination(req);
      const result = await storage.getContracts(getUserId(req), pagination, status as string, search as string);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العقود" });
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id, getUserId(req));
      if (!contract) return res.status(404).json({ message: "العقد غير موجود" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل العقد" });
    }
  });

  app.post("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const limitCheck = await checkPlanLimit(getUserId(req), "contracts");
      if (!limitCheck.allowed) {
        return res.status(403).json({
          message: "وصلت للحد الأقصى من العقود في باقتك الحالية",
          limit: limitCheck.limit, current: limitCheck.current, upgrade: true
        });
      }
      const cleanedData = cleanDates(req.body, ["startDate", "endDate"]);
      const contract = await storage.createContract({ ...cleanedData, userId: getUserId(req) });
      res.json(contract);
    } catch (error) {
      console.error("Contract creation error:", error);
      res.status(500).json({ message: "فشل في إنشاء العقد" });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const cleanedData = cleanDates(req.body, ["startDate", "endDate"]);
      const contract = await storage.updateContract(req.params.id, getUserId(req), cleanedData);
      if (!contract) return res.status(404).json({ message: "العقد غير موجود" });
      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث العقد" });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteContract(req.params.id, getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف العقد" });
    }
  });

  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const pagination = getPagination(req);
      const result = await storage.getInvoices(getUserId(req), pagination, status as string);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الفواتير" });
    }
  });

  app.get("/api/invoices/next-number", isAuthenticated, async (req, res) => {
    try {
      const number = await storage.getNextInvoiceNumber(getUserId(req));
      res.json({ number });
    } catch (error) {
      res.status(500).json({ message: "فشل في توليد رقم الفاتورة" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id, getUserId(req));
      if (!invoice) return res.status(404).json({ message: "الفاتورة غير موجودة" });
      const items = await storage.getInvoiceItems(req.params.id);
      res.json({ ...invoice, items });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الفاتورة" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const limitCheck = await checkPlanLimit(getUserId(req), "invoices");
      if (!limitCheck.allowed) {
        return res.status(403).json({
          message: "وصلت للحد الأقصى من الفواتير في باقتك الحالية",
          limit: limitCheck.limit, current: limitCheck.current, upgrade: true
        });
      }
      const { items, ...invoiceData } = req.body;
      const cleanedData = cleanDates(invoiceData, ["dueDate", "issueDate", "paidAt"]);
      const invoice = await storage.createInvoice({ ...cleanedData, userId: getUserId(req) });
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createInvoiceItem({ ...item, invoiceId: invoice.id });
        }
      }
      const createdItems = await storage.getInvoiceItems(invoice.id);
      res.json({ ...invoice, items: createdItems });
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({ message: "فشل في إنشاء الفاتورة" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { items, ...invoiceData } = req.body;
      const cleanedInvoice = cleanDates(invoiceData, ["dueDate", "issueDate", "paidAt"]);
      const invoice = await storage.updateInvoice(req.params.id, getUserId(req), cleanedInvoice);
      if (!invoice) return res.status(404).json({ message: "الفاتورة غير موجودة" });
      if (items) {
        await storage.deleteInvoiceItemsByInvoiceId(req.params.id);
        for (const item of items) {
          await storage.createInvoiceItem({ ...item, invoiceId: req.params.id });
        }
      }
      const updatedItems = await storage.getInvoiceItems(req.params.id);
      res.json({ ...invoice, items: updatedItems });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الفاتورة" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id, getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف الفاتورة" });
    }
  });

  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const pagination = getPagination(req);
      const result = await storage.getProjects(getUserId(req), pagination, status as string);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل المشاريع" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id, getUserId(req));
      if (!project) return res.status(404).json({ message: "المشروع غير موجود" });
      const tasks = await storage.getProjectTasks(req.params.id);
      res.json({ ...project, tasks });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل المشروع" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const limitCheck = await checkPlanLimit(getUserId(req), "projects");
      if (!limitCheck.allowed) {
        return res.status(403).json({
          message: "وصلت للحد الأقصى من المشاريع في باقتك الحالية",
          limit: limitCheck.limit, current: limitCheck.current, upgrade: true
        });
      }
      const cleanedData = cleanDates(req.body, ["startDate", "deadline"]);
      const project = await storage.createProject({ ...cleanedData, userId: getUserId(req) });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء المشروع" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, getUserId(req), req.body);
      if (!project) return res.status(404).json({ message: "المشروع غير موجود" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث المشروع" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProject(req.params.id, getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف المشروع" });
    }
  });

  app.get("/api/projects/:id/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getProjectTasks(req.params.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل المهام" });
    }
  });

  app.post("/api/projects/:id/tasks", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id, getUserId(req));
      if (!project) return res.status(403).json({ message: "غير مصرح" });
      const task = await storage.createProjectTask({ ...req.body, projectId: req.params.id });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "فشل في إضافة المهمة" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const existingTask = await storage.getProjectTaskById(req.params.id);
      if (!existingTask) return res.status(404).json({ message: "المهمة غير موجودة" });
      const project = await storage.getProject(existingTask.projectId, getUserId(req));
      if (!project) return res.status(403).json({ message: "غير مصرح" });
      const task = await storage.updateProjectTask(req.params.id, req.body);
      if (!task) return res.status(404).json({ message: "المهمة غير موجودة" });
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث المهمة" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const existingTask = await storage.getProjectTaskById(req.params.id);
      if (!existingTask) return res.status(404).json({ message: "المهمة غير موجودة" });
      const project = await storage.getProject(existingTask.projectId, getUserId(req));
      if (!project) return res.status(403).json({ message: "غير مصرح" });
      await storage.deleteProjectTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف المهمة" });
    }
  });

  app.get("/api/services", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.json([]);
      const servicesList = await storage.getServices(profile.id);
      res.json(servicesList);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الخدمات" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req, res) => {
    try {
      let profile = await storage.getProfile(getUserId(req));
      if (!profile) {
        profile = await storage.upsertProfile({ userId: getUserId(req), username: `user-${getUserId(req).slice(0, 8)}`, isPublic: true });
      }
      const service = await storage.createService({ ...req.body, profileId: profile.id });
      res.json(service);
    } catch (error) {
      console.error("Service creation error:", error);
      res.status(500).json({ message: "فشل في إضافة الخدمة" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.status(403).json({ message: "غير مصرح" });
      const existing = await storage.getServiceById(req.params.id);
      if (!existing || existing.profileId !== profile.id) return res.status(403).json({ message: "غير مصرح" });
      const service = await storage.updateService(req.params.id, req.body);
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الخدمة" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.status(403).json({ message: "غير مصرح" });
      const existing = await storage.getServiceById(req.params.id);
      if (!existing || existing.profileId !== profile.id) return res.status(403).json({ message: "غير مصرح" });
      await storage.deleteService(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف الخدمة" });
    }
  });

  app.get("/api/portfolio", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.json([]);
      const items = await storage.getPortfolioItems(profile.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل معرض الأعمال" });
    }
  });

  app.post("/api/portfolio", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.status(400).json({ message: "يرجى إعداد البروفايل أولاً" });
      const item = await storage.createPortfolioItem({ ...req.body, profileId: profile.id });
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "فشل في إضافة العمل" });
    }
  });

  app.patch("/api/portfolio/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.status(403).json({ message: "غير مصرح" });
      const existing = await storage.getPortfolioItemById(req.params.id);
      if (!existing || existing.profileId !== profile.id) return res.status(403).json({ message: "غير مصرح" });
      const item = await storage.updatePortfolioItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث العمل" });
    }
  });

  app.delete("/api/portfolio/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.status(403).json({ message: "غير مصرح" });
      const existing = await storage.getPortfolioItemById(req.params.id);
      if (!existing || existing.profileId !== profile.id) return res.status(403).json({ message: "غير مصرح" });
      await storage.deletePortfolioItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف العمل" });
    }
  });

  app.get("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.json({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      const pagination = getPagination(req);
      const result = await storage.getContactMessages(profile.id, pagination);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الرسائل" });
    }
  });

  app.patch("/api/messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfile(getUserId(req));
      if (!profile) return res.status(403).json({ message: "غير مصرح" });
      const msg = await storage.getContactMessageById(req.params.id);
      if (!msg || msg.profileId !== profile.id) return res.status(403).json({ message: "غير مصرح" });
      await storage.markMessageAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في تعليم الرسالة كمقروءة" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const pagination = getPagination(req, 30);
      const result = await storage.getNotifications(getUserId(req), pagination);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الإشعارات" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(getUserId(req));
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل عدد الإشعارات" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notification = await storage.getNotificationById(req.params.id);
      if (!notification || notification.userId !== getUserId(req)) return res.status(403).json({ message: "غير مصرح" });
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في تعليم الإشعار كمقروء" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(getUserId(req));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في تعليم الإشعارات كمقروءة" });
    }
  });

  app.get("/api/public/:username", async (req, res) => {
    try {
      const profile = await storage.getProfileByUsername(req.params.username);
      if (!profile || !profile.isPublic) return res.status(404).json({ message: "الصفحة غير موجودة" });
      const servicesList = await storage.getServices(profile.id);
      const portfolio = await storage.getPortfolioItems(profile.id);
      res.json({ profile, services: servicesList, portfolio });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الصفحة" });
    }
  });

  app.post("/api/public/:username/contact", contactLimiter, async (req, res) => {
    try {
      const profile = await storage.getProfileByUsername(req.params.username);
      if (!profile) return res.status(404).json({ message: "الصفحة غير موجودة" });
      const message = await storage.createContactMessage({ ...req.body, profileId: profile.id });
      await storage.createNotification({
        userId: profile.userId,
        type: "new_message",
        title: "رسالة جديدة",
        message: `رسالة جديدة من ${req.body.senderName} عبر صفحتك العامة`,
        link: "/dashboard/my-page",
      });
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "فشل في إرسال الرسالة" });
    }
  });

  app.get("/api/subscription", isAuthenticated, async (req, res) => {
    try {
      const sub = await storage.getSubscription(getUserId(req));
      res.json(sub || { plan: "free", status: "inactive" });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل بيانات الاشتراك" });
    }
  });

  app.post("/api/subscription/checkout", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "خدمة المدفوعات غير مفعّلة" });
      const { plan, clientLimit } = req.body;
      if (plan !== "starter" && plan !== "pro") {
        return res.status(400).json({ message: "باقة غير صالحة" });
      }

      const planConfig = PLAN_CONFIG[plan as PlanId];
      let priceAmount: number;
      let metadata: Record<string, string>;

      if (plan === "pro") {
        const cl = parseInt(clientLimit) || 50;
        priceAmount = getProPrice(cl);
        metadata = { userId: getUserId(req), plan, clientLimit: String(cl) };
      } else {
        priceAmount = planConfig.priceHalalah!;
        metadata = { userId: getUserId(req), plan };
      }

      const userId = getUserId(req);
      const userObj = await getUserById(userId);
      const userEmail = userObj?.email;

      let sub = await storage.getSubscription(userId);
      let customerId: string;

      if (sub?.stripeCustomerId) {
        customerId = sub.stripeCustomerId;
      } else {
        const customer = await stripe!.customers.create({
          email: userEmail || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.upsertSubscription({ userId, stripeCustomerId: customerId });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const session = await stripe!.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "sar",
            product_data: { name: `مستندك - ${planConfig.nameAr}` },
            unit_amount: priceAmount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        subscription_data: {
          trial_period_days: 14,
          metadata,
        },
        success_url: `${baseUrl}/dashboard/settings?subscription=success`,
        cancel_url: `${baseUrl}/dashboard/settings?subscription=cancelled`,
        metadata,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.post("/api/subscription/portal", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "خدمة المدفوعات غير مفعّلة" });
      const sub = await storage.getSubscription(getUserId(req));
      if (!sub?.stripeCustomerId) return res.status(400).json({ message: "لا يوجد اشتراك" });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe!.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${baseUrl}/dashboard/settings`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Portal error:", error);
      res.status(500).json({ message: "فشل في فتح بوابة الإدارة" });
    }
  });

  app.get("/api/subscription/limits", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const sub = await storage.getSubscription(userId);
    const plan = (sub?.plan || "free") as PlanId;
    const limits = getPlanLimits(plan, sub?.clientLimit || undefined);

    const [clients, invoices, contracts, projects, documents] = await Promise.all([
      storage.getClientCount(userId),
      storage.getInvoiceCount(userId),
      storage.getContractCount(userId),
      storage.getProjectCount(userId),
      storage.getDocumentCount(userId),
    ]);

    res.json({
      plan,
      limits: {
        clients: limits.clients,
        invoices: limits.invoices,
        contracts: limits.contracts,
        projects: limits.projects,
        documents: limits.documents,
      },
      usage: { clients, invoices, contracts, projects, documents },
      features: {
        signatures: limits.signatures,
        ai: limits.ai,
        publicProfile: limits.publicProfile,
      },
      clientLimit: sub?.clientLimit || null,
    });
  });

  app.post("/api/webhooks/stripe", async (req, res) => {
    if (!stripe) return res.status(503).json({ message: "Stripe not configured" });
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    try {
      if (webhookSecret) {
        if (!sig) return res.status(400).json({ message: "Missing stripe-signature header" });
        event = stripe!.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
      } else if (process.env.NODE_ENV === "production") {
        console.error("STRIPE_WEBHOOK_SECRET is not set in production");
        return res.status(500).json({ message: "Webhook not configured" });
      } else {
        event = req.body as Stripe.Event;
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ message: "Webhook error" });
    }

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const plan = (subscription.metadata?.plan) || "starter";
          const priceId = subscription.items.data[0]?.price?.id || null;
          const clientLimitMeta = subscription.metadata?.clientLimit ? parseInt(subscription.metadata.clientLimit) : null;

          await storage.updateSubscriptionByCustomerId(customerId, {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            plan,
            status: subscription.status === "active" || subscription.status === "trialing" ? "active" : subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            ...(clientLimitMeta ? { clientLimit: clientLimitMeta } : {}),
          });
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          await storage.updateSubscriptionByCustomerId(customerId, {
            status: "cancelled",
            plan: "free",
            stripeSubscriptionId: null,
            stripePriceId: null,
          });
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          await storage.updateSubscriptionByCustomerId(customerId, {
            status: "past_due",
          });
          break;
        }
      }
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  app.get("/api/config/stripe", (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  });

  app.get("/api/pdf-preview", async (req, res) => {
    try {
      const fileUrl = req.query.url as string;
      if (!fileUrl) return res.status(400).json({ message: "Missing url parameter" });

      let pdfBuffer: Buffer;

      // Try reading from local filesystem first
      if (fileUrl.startsWith("/uploads/")) {
        const localPath = path.join(process.cwd(), fileUrl);
        if (!fs.existsSync(localPath)) {
          return res.status(404).json({ message: "PDF not found" });
        }
        pdfBuffer = fs.readFileSync(localPath);
      } else if (fileUrl.startsWith("http")) {
        const { default: nodeFetch } = await import("node-fetch");
        const pdfRes = await nodeFetch(fileUrl);
        if (!pdfRes.ok) return res.status(404).json({ message: "PDF not found" });
        pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      } else {
        return res.status(400).json({ message: "Invalid URL" });
      }

      const { execSync } = await import("child_process");
      const tmpDir = os.tmpdir();
      const tmpPdf = path.join(tmpDir, `pdf-${Date.now()}.pdf`);
      fs.writeFileSync(tmpPdf, pdfBuffer);

      const outPrefix = path.join(tmpDir, `pdf-img-${Date.now()}`);
      try {
        execSync(`pdftoppm -png -f 1 -l 1 -r 150 "${tmpPdf}" "${outPrefix}"`, { timeout: 10000 });
      } catch {
        // pdftoppm not available — try using pdf.js or return error
        fs.unlinkSync(tmpPdf);
        return res.status(500).json({ message: "PDF conversion tool (pdftoppm) not available on server" });
      }

      // pdftoppm outputs -1.png or -01.png depending on version
      const outFile = fs.existsSync(`${outPrefix}-1.png`) ? `${outPrefix}-1.png` : `${outPrefix}-01.png`;
      if (!fs.existsSync(outFile)) {
        fs.unlinkSync(tmpPdf);
        return res.status(500).json({ message: "PDF conversion failed" });
      }

      const imgData = fs.readFileSync(outFile);
      fs.unlinkSync(tmpPdf);
      fs.unlinkSync(outFile);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(imgData);
    } catch (error) {
      console.error("PDF preview error:", error);
      res.status(500).json({ message: "Failed to generate PDF preview" });
    }
  });

  // Document routes
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const docs = await storage.getDocuments(getUserId(req));
      res.json(docs);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ message: "فشل في تحميل المستندات" });
    }
  });

  app.get("/api/clients/:clientId/documents", isAuthenticated, async (req, res) => {
    try {
      const docs = await storage.getDocumentsByClient(req.params.clientId, getUserId(req));
      res.json(docs);
    } catch (error) {
      console.error("Get client documents error:", error);
      res.status(500).json({ message: "فشل في تحميل مستندات العميل" });
    }
  });

  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id, getUserId(req));
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });
      const fields = await storage.getDocumentFields(doc.id);
      const signatures = await storage.getDocumentSignatures(doc.id);
      res.json({ ...doc, fields, signatures });
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({ message: "فشل في تحميل المستند" });
    }
  });

  // Serve document file from database (base64 → binary)
  // Serve document file from document_files table
  app.get("/api/documents/:id/file", async (req, res) => {
    try {
      const { documentFiles } = await import("@shared/schema");
      const [fileRecord] = await db.select().from(documentFiles).where(eq(documentFiles.documentId, req.params.id));
      if (!fileRecord) {
        return res.status(404).json({ message: "الملف غير موجود" });
      }
      // Parse data URL: data:mime;base64,DATA
      const match = fileRecord.fileData.match(/^data:([^;]+);base64,(.+)$/s);
      if (!match) return res.status(500).json({ message: "تنسيق الملف غير صالح" });
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.send(buffer);
    } catch (error) {
      console.error("Serve document file error:", error);
      res.status(500).json({ message: "فشل في تحميل الملف" });
    }
  });

  app.post("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const limitCheck = await checkPlanLimit(getUserId(req), "documents");
      if (!limitCheck.allowed) {
        return res.status(403).json({
          message: "وصلت للحد الأقصى من المستندات في باقتك الحالية",
          limit: limitCheck.limit, current: limitCheck.current, upgrade: true
        });
      }
      const { title, fileType, docType, content } = req.body;
      if (!title) return res.status(400).json({ message: "العنوان مطلوب" });
      const crypto = await import("crypto");
      const shareToken = crypto.randomBytes(16).toString("hex");
      const doc = await storage.createDocument({
        userId: getUserId(req),
        title,
        fileUrl: null,
        fileType: fileType || null,
        docType: docType || "file",
        content: content || null,
        status: "draft",
        shareToken,
      });
      res.json(doc);
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({ message: "فشل في إنشاء المستند" });
    }
  });

  app.patch("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      if (req.body.status === "sent") {
        const sigAccess = await checkFeatureAccess(getUserId(req), "signatures");
        if (!sigAccess.allowed) {
          return res.status(403).json({ message: "هذه الميزة غير متوفرة في باقتك الحالية", upgrade: true });
        }
      }
      const doc = await storage.updateDocument(req.params.id, getUserId(req), req.body);
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });

      if (req.body.status === "sent" && doc.recipientEmail && doc.shareToken) {
        try {
          const profile = await storage.getProfile(getUserId(req));
          const senderName = profile?.businessName || profile?.name || "مستخدم مستندك";
          const signUrl = `${req.protocol}://${req.get("host")}/sign/${doc.shareToken}`;

          await sendSigningRequestEmail(
            doc.recipientEmail,
            doc.recipientName || "",
            senderName,
            doc.title,
            signUrl
          );
          console.log(`Document signing email sent to ${doc.recipientEmail} for document ${doc.id}`);
        } catch (emailError) {
          console.error("Failed to send signing email:", emailError);
        }
      }

      res.json(doc);
    } catch (error) {
      console.error("Update document error:", error);
      res.status(500).json({ message: "فشل في تحديث المستند" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.deleteDocument(req.params.id, getUserId(req));
      if (!result) return res.status(404).json({ message: "المستند غير موجود" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ message: "فشل في حذف المستند" });
    }
  });

  // Document fields
  const fieldBodySchema = z.object({
    type: z.enum(["text", "date", "signature"]),
    label: z.string().max(200).optional(),
    value: z.string().max(500000).optional(),
    x: z.string(),
    y: z.string(),
    width: z.string(),
    height: z.string(),
    page: z.number().int().min(0).optional(),
    required: z.boolean().optional(),
  });

  app.post("/api/documents/:id/fields", isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id, getUserId(req));
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });
      const parsed = fieldBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "بيانات الحقل غير صالحة" });
      const field = await storage.createDocumentField({
        documentId: doc.id,
        ...parsed.data,
      });
      res.json(field);
    } catch (error) {
      console.error("Create field error:", error);
      res.status(500).json({ message: "فشل في إنشاء الحقل" });
    }
  });

  app.patch("/api/documents/:docId/fields/:fieldId", isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.docId, getUserId(req));
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });
      const existingFields = await storage.getDocumentFields(doc.id);
      const fieldBelongs = existingFields.some((f) => f.id === req.params.fieldId);
      if (!fieldBelongs) return res.status(403).json({ message: "هذا الحقل لا ينتمي للمستند" });
      const updateParsed = fieldBodySchema.partial().safeParse(req.body);
      if (!updateParsed.success) return res.status(400).json({ message: "بيانات الحقل غير صالحة" });
      const field = await storage.updateDocumentField(req.params.fieldId, updateParsed.data);
      if (!field) return res.status(404).json({ message: "الحقل غير موجود" });
      res.json(field);
    } catch (error) {
      console.error("Update field error:", error);
      res.status(500).json({ message: "فشل في تحديث الحقل" });
    }
  });

  app.delete("/api/documents/:docId/fields/:fieldId", isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.docId, getUserId(req));
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });
      const existingFields = await storage.getDocumentFields(doc.id);
      const fieldBelongs = existingFields.some((f) => f.id === req.params.fieldId);
      if (!fieldBelongs) return res.status(403).json({ message: "هذا الحقل لا ينتمي للمستند" });
      await storage.deleteDocumentField(req.params.fieldId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete field error:", error);
      res.status(500).json({ message: "فشل في حذف الحقل" });
    }
  });

  app.put("/api/documents/:id/fields", isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id, getUserId(req));
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });
      await storage.deleteDocumentFieldsByDocumentId(doc.id);
      const fieldsArr = z.array(fieldBodySchema).safeParse(req.body.fields || []);
      if (!fieldsArr.success) return res.status(400).json({ message: "بيانات الحقول غير صالحة" });
      const created = [];
      for (const f of fieldsArr.data) {
        const field = await storage.createDocumentField({ documentId: doc.id, ...f });
        created.push(field);
      }
      res.json(created);
    } catch (error) {
      console.error("Save fields error:", error);
      res.status(500).json({ message: "فشل في حفظ الحقول" });
    }
  });

  // ─── Content Library ──────────────────────────────────────────
  app.get("/api/content-library", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const items = await storage.getContentLibrary(userId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب المكتبة" });
    }
  });

  app.post("/api/content-library", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { name, description, content, category } = req.body;
      if (!name || !content) {
        return res.status(400).json({ message: "الاسم والمحتوى مطلوبان" });
      }
      const block = await storage.createContentBlock({ userId, name, description, content, category });
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: "فشل في حفظ المحتوى" });
    }
  });

  app.patch("/api/content-library/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const block = await storage.updateContentBlock(req.params.id, userId, req.body);
      if (!block) return res.status(404).json({ message: "العنصر غير موجود" });
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث المحتوى" });
    }
  });

  app.delete("/api/content-library/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const deleted = await storage.deleteContentBlock(req.params.id, userId);
      if (!deleted) return res.status(404).json({ message: "العنصر غير موجود" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف المحتوى" });
    }
  });

  // Public document signing
  app.get("/api/documents/sign/:shareToken", async (req, res) => {
    try {
      const doc = await storage.getDocumentByShareToken(req.params.shareToken);
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });
      if (doc.status !== "sent" && doc.status !== "draft") {
        return res.status(400).json({ message: "المستند غير متاح للتوقيع" });
      }
      const fields = await storage.getDocumentFields(doc.id);
      const signatures = await storage.getDocumentSignatures(doc.id);
      res.json({ ...doc, fields, signatures });
    } catch (error) {
      console.error("Get shared document error:", error);
      res.status(500).json({ message: "فشل في تحميل المستند" });
    }
  });

  const signBodySchema = z.object({
    signerName: z.string().min(1).max(200),
    signerEmail: z.string().email().max(254).optional().or(z.literal("")),
    signatureData: z.string().min(1).max(2000000),
    fieldValues: z.record(z.string()).optional(),
    fillableFieldValues: z.record(z.string()).optional(),
    fillableSignatures: z.record(z.string()).optional(),
  });

  app.post("/api/documents/sign/:shareToken", async (req, res) => {
    try {
      const doc = await storage.getDocumentByShareToken(req.params.shareToken);
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });
      if (doc.status === "signed") {
        return res.status(400).json({ message: "المستند موقّع بالفعل" });
      }
      const parsed = signBodySchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("Sign validation error:", JSON.stringify(parsed.error.issues));
        return res.status(400).json({ message: "الاسم والتوقيع مطلوبان" });
      }
      const { signerName, signerEmail, signatureData, fieldValues, fillableFieldValues, fillableSignatures } = parsed.data;
      const ip = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "";
      if (fieldValues) {
        const docFields = await storage.getDocumentFields(doc.id);
        for (const field of docFields) {
          if (fieldValues[field.id]) {
            await storage.updateDocumentField(field.id, { value: fieldValues[field.id] });
          }
        }
      }
      await storage.createDocumentSignature({
        documentId: doc.id,
        signerName,
        signerEmail: signerEmail || null,
        signatureData,
        ipAddress: ip,
      });

      // Auto-link document to client by matching signer email
      if (signerEmail && !doc.clientId) {
        try {
          const client = await storage.getClientByEmail(signerEmail, doc.userId);
          if (client) {
            await storage.updateDocument(doc.id, doc.userId, { clientId: client.id } as any);
          }
        } catch (e) {
          console.error("Auto-link client error:", e);
        }
      }

      // Generate signed PDF for text documents
      let signedPdfUrl: string | null = null;
      if (doc.docType === "text" && doc.content) {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const uploadsDir = path.join(process.cwd(), "uploads", "signed");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const dateStr = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

          // Replace fillable field placeholders in content with filled values
          let processedContent = doc.content as string;
          if (fillableFieldValues || fillableSignatures) {
            // Use regex to find and replace fillable field divs
            let fieldIndex = 0;
            processedContent = processedContent.replace(
              /(<div[^>]*data-type="fillableField"[^>]*data-field-type="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>)([\s\S]*?)(<\/div>)/g,
              (_match, _openTag, fieldType, label, _innerContent, _closeTag) => {
                const idx = fieldIndex++;
                const value = xss(fillableFieldValues?.[String(idx)] || "");
                const sigData = fillableSignatures?.[String(idx)] || "";

                if (fieldType === "signature" && sigData) {
                  return `<div style="margin:8px 0;padding:8px 0;"><div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">${label}:</div><img src="${sigData}" style="max-width:250px;max-height:100px;" /></div>`;
                } else if (fieldType === "date") {
                  return `<div style="margin:8px 0;padding:8px 0;"><span style="font-size:12px;color:#6b7280;">${label}:</span> <span style="font-weight:500;margin-right:8px;">${value || new Date().toLocaleDateString("ar-SA")}</span></div>`;
                } else {
                  return `<div style="margin:8px 0;padding:8px 0;"><span style="font-size:12px;color:#6b7280;">${label}:</span> <span style="font-weight:500;margin-right:8px;border-bottom:1px solid #374151;padding-bottom:2px;">${value}</span></div>`;
                }
              }
            );
          }

          const signedHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><style>
  body { font-family: 'IBM Plex Sans Arabic', Tahoma, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.8; }
  h1 { text-align: center; font-size: 22px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; }
  th { background: #f3f4f6; font-weight: 600; }
  .signature-section { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; }
  .signature-img { max-width: 300px; max-height: 120px; }
  .meta { color: #6b7280; font-size: 12px; margin-top: 8px; }
</style></head>
<body>
  <h1>${doc.title}</h1>
  ${processedContent}
  <div class="signature-section">
    <p><strong>التوقيع:</strong></p>
    <img class="signature-img" src="${signatureData}" />
    <p class="meta">الموقّع: ${xss(signerName)}${signerEmail ? ` (${xss(signerEmail)})` : ""}</p>
    <p class="meta">تاريخ التوقيع: ${dateStr}</p>
    <p class="meta">عنوان IP: ${ip}</p>
  </div>
</body>
</html>`;
          const filename = `signed-${doc.id}.html`;
          const filepath = path.join(uploadsDir, filename);
          fs.writeFileSync(filepath, signedHtml, "utf-8");
          signedPdfUrl = `/uploads/signed/${filename}`;
        } catch (pdfErr) {
          console.error("Generate signed document error:", pdfErr);
        }
      }

      const signedAt = new Date();
      const updateData: any = { status: "signed", signedAt };
      if (signedPdfUrl) updateData.fileUrl = signedPdfUrl;
      await storage.updateDocument(doc.id, doc.userId, updateData);

      // Send signature confirmation emails
      try {
        const signedDate = signedAt.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
        const owner = await getUserById(doc.userId);
        const ownerName = owner?.firstName || "صاحب المستند";

        // Notify document owner
        if (owner?.email) {
          await sendSignatureConfirmationEmail(owner.email, ownerName, doc.title, signerName, signedDate);
        }
        // Notify signer
        if (signerEmail) {
          await sendSignatureConfirmationEmail(signerEmail, signerName, doc.title, signerName, signedDate);
        }
      } catch (emailError) {
        console.error("Signature confirmation email error:", emailError);
      }

      res.json({ success: true, message: "تم التوقيع بنجاح" });
    } catch (error) {
      console.error("Sign document error:", error);
      res.status(500).json({ message: "فشل في توقيع المستند" });
    }
  });

  // ─── Super Admin Routes ───────────────────────────────────────────────────
  app.get("/api/admin/stats", isAdmin, async (req: Request, res: Response) => {
    try {
      const [usersCount] = await dbQuery(`SELECT COUNT(*) as c FROM users WHERE role != 'superadmin'`);
      const [activeUsers] = await dbQuery(`SELECT COUNT(*) as c FROM users WHERE is_suspended = false AND role != 'superadmin'`);
      const [suspendedUsers] = await dbQuery(`SELECT COUNT(*) as c FROM users WHERE is_suspended = true`);
      const [clientsCount] = await dbQuery(`SELECT COUNT(*) as c FROM clients`);
      const [contractsCount] = await dbQuery(`SELECT COUNT(*) as c FROM contracts`);
      const [invoicesCount] = await dbQuery(`SELECT COUNT(*) as c FROM invoices`);
      const [projectsCount] = await dbQuery(`SELECT COUNT(*) as c FROM projects`);
      const [profilesCount] = await dbQuery(`SELECT COUNT(*) as c FROM profiles`);
      const [newUsersToday] = await dbQuery(`SELECT COUNT(*) as c FROM users WHERE created_at >= CURRENT_DATE`);
      const [newUsersWeek] = await dbQuery(`SELECT COUNT(*) as c FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`);
      const enhanced = await storage.getAdminEnhancedStats();
      res.json({
        users: Number(usersCount.c),
        activeUsers: Number(activeUsers.c),
        suspendedUsers: Number(suspendedUsers.c),
        clients: Number(clientsCount.c),
        contracts: Number(contractsCount.c),
        invoices: Number(invoicesCount.c),
        projects: Number(projectsCount.c),
        profiles: Number(profilesCount.c),
        newUsersToday: Number(newUsersToday.c),
        newUsersWeek: Number(newUsersWeek.c),
        ...enhanced,
      });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.get("/api/admin/stats/growth", isAdmin, async (req: Request, res: Response) => {
    try {
      const growth = await storage.getAdminGrowthStats();
      res.json(growth);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
      const search = (req.query.search as string || "").trim();
      const offset = (page - 1) * limit;

      const rows = await dbQuery(
        search
          ? `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.is_suspended,
               u.auth_provider, u.email_verified, u.created_at,
               COUNT(DISTINCT c.id) as clients_count,
               COUNT(DISTINCT co.id) as contracts_count,
               s.plan as sub_plan, s.status as sub_status, s.current_period_end as sub_end
             FROM users u
             LEFT JOIN clients c ON c.user_id = u.id
             LEFT JOIN contracts co ON co.user_id = u.id
             LEFT JOIN subscriptions s ON s.user_id = u.id
             WHERE (u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1) AND u.role != 'superadmin'
             GROUP BY u.id, s.plan, s.status, s.current_period_end
             ORDER BY u.created_at DESC
             LIMIT $2 OFFSET $3`
          : `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.is_suspended,
               u.auth_provider, u.email_verified, u.created_at,
               COUNT(DISTINCT c.id) as clients_count,
               COUNT(DISTINCT co.id) as contracts_count,
               s.plan as sub_plan, s.status as sub_status, s.current_period_end as sub_end
             FROM users u
             LEFT JOIN clients c ON c.user_id = u.id
             LEFT JOIN contracts co ON co.user_id = u.id
             LEFT JOIN subscriptions s ON s.user_id = u.id
             WHERE u.role != 'superadmin'
             GROUP BY u.id, s.plan, s.status, s.current_period_end
             ORDER BY u.created_at DESC
             LIMIT $1 OFFSET $2`,
        search ? [`%${search}%`, limit, offset] : [limit, offset]
      );

      const [totalRow] = await dbQuery(
        search
          ? `SELECT COUNT(*) as total FROM users u WHERE (u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1) AND u.role != 'superadmin'`
          : `SELECT COUNT(*) as total FROM users u WHERE u.role != 'superadmin'`,
        search ? [`%${search}%`] : []
      );

      res.json({
        data: rows,
        total: Number(totalRow.total),
        page,
        limit,
        totalPages: Math.ceil(Number(totalRow.total) / limit),
      });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.patch("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role, isSuspended, subscription } = req.body;

      // Update user fields
      if (role !== undefined || isSuspended !== undefined) {
        const fields: Record<string, any> = { updatedAt: new Date() };
        if (role !== undefined) fields.role = role;
        if (isSuspended !== undefined) fields.isSuspended = isSuspended;
        const [updated] = await db.update(users).set(fields).where(eq(users.id, id)).returning();
        if (!updated) return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      // Log audit
      await logAudit(getUserId(req), "user.update", "user", id, { role, isSuspended, subscription }, getClientIp(req));

      // Update or create subscription
      if (subscription !== undefined) {
        const existing = await dbQuery(`SELECT id FROM subscriptions WHERE user_id = $1`, [id]);
        const now = new Date();
        const periodEnd = subscription.plan && subscription.plan !== "free"
          ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
          : null;
        if (existing.length > 0) {
          await dbQuery(
            `UPDATE subscriptions SET plan=$1, status=$2, current_period_start=$3, current_period_end=$4, updated_at=NOW() WHERE user_id=$5`,
            [subscription.plan || "free", subscription.status || "active", now, periodEnd, id]
          );
        } else {
          await dbQuery(
            `INSERT INTO subscriptions (user_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
            [id, subscription.plan || "free", subscription.status || "active", now, periodEnd]
          );
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = getUserId(req);
      if (id === adminId) return res.status(400).json({ message: "لا يمكن حذف حسابك الخاص" });
      const target = await getUserById(id);
      if (target?.role === "superadmin") return res.status(403).json({ message: "لا يمكن حذف السوبر أدمن" });
      await db.delete(users).where(eq(users.id, id));
      await logAudit(adminId, "user.delete", "user", id, { email: target?.email }, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: User Activity ──────────────────────────────────────────────
  app.get("/api/admin/users/:id/activity", isAdmin, async (req: Request, res: Response) => {
    try {
      const activity = await storage.getUserActivity(req.params.id);
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Impersonation ──────────────────────────────────────────────
  app.post("/api/admin/impersonate/:id", isSuperAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = getUserId(req);
      const targetId = req.params.id;
      const target = await getUserById(targetId);
      if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
      if (target.role === "superadmin") return res.status(403).json({ message: "لا يمكن انتحال هوية سوبر أدمن" });

      req.session.originalAdminId = adminId;
      req.session.userId = targetId;
      await logAudit(adminId, "user.impersonate", "user", targetId, { targetEmail: target.email }, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/impersonate/exit", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const originalAdminId = req.session.originalAdminId;
      if (!originalAdminId) return res.status(400).json({ message: "لست في وضع الانتحال" });

      await logAudit(originalAdminId, "user.impersonate_exit", "user", req.session.userId, {}, getClientIp(req));
      req.session.userId = originalAdminId;
      delete req.session.originalAdminId;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.get("/api/auth/session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await getUserById(req.session.userId!);
      const isImpersonating = !!req.session.originalAdminId;
      res.json({
        userId: req.session.userId,
        isImpersonating,
        impersonatedName: isImpersonating ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim() : null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Audit Logs ──────────────────────────────────────────────
  app.get("/api/admin/audit-logs", isAdmin, async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 30);
      const action = req.query.action as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const result = await storage.getAuditLogs({ page, limit, action, dateFrom, dateTo });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Documents ──────────────────────────────────────────────
  app.get("/api/admin/documents", isAdmin, async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const type = req.query.type as string | undefined;
      const result = await storage.getAdminDocuments({ page, limit, search, status, type });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.get("/api/admin/documents/stats", isAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminDocumentStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.delete("/api/admin/documents/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteDocumentAdmin(req.params.id);
      if (!deleted) return res.status(404).json({ message: "المستند غير موجود" });
      await logAudit(getUserId(req), "document.delete", "document", req.params.id, {}, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Platform Templates ──────────────────────────────────────
  app.get("/api/admin/templates", isAdmin, async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const templates = await storage.getPlatformTemplates(category);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/templates", isAdmin, async (req: Request, res: Response) => {
    try {
      const template = await storage.createPlatformTemplate({ ...req.body, createdBy: getUserId(req) });
      await logAudit(getUserId(req), "template.create", "template", template.id, { name: template.name }, getClientIp(req));
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.patch("/api/admin/templates/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const template = await storage.updatePlatformTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ message: "القالب غير موجود" });
      await logAudit(getUserId(req), "template.update", "template", req.params.id, req.body, getClientIp(req));
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.delete("/api/admin/templates/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deletePlatformTemplate(req.params.id);
      if (!deleted) return res.status(404).json({ message: "القالب غير موجود" });
      await logAudit(getUserId(req), "template.delete", "template", req.params.id, {}, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Subscriptions ──────────────────────────────────────────
  app.get("/api/admin/subscriptions", isAdmin, async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
      const plan = req.query.plan as string | undefined;
      const result = await storage.getAdminSubscriptions({ page, limit, plan });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.get("/api/admin/revenue", isAdmin, async (req: Request, res: Response) => {
    try {
      const revenue = await storage.getAdminRevenue();
      res.json(revenue);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Coupons ──────────────────────────────────────────────
  app.get("/api/admin/coupons", isAdmin, async (req: Request, res: Response) => {
    try {
      const coupons = await storage.getCoupons();
      res.json(coupons);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/coupons", isAdmin, async (req: Request, res: Response) => {
    try {
      const coupon = await storage.createCoupon({ ...req.body, createdBy: getUserId(req) });
      await logAudit(getUserId(req), "coupon.create", "coupon", coupon.id, { code: coupon.code }, getClientIp(req));
      res.json(coupon);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.patch("/api/admin/coupons/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const coupon = await storage.updateCoupon(req.params.id, req.body);
      if (!coupon) return res.status(404).json({ message: "الكوبون غير موجود" });
      await logAudit(getUserId(req), "coupon.update", "coupon", req.params.id, req.body, getClientIp(req));
      res.json(coupon);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.delete("/api/admin/coupons/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCoupon(req.params.id);
      if (!deleted) return res.status(404).json({ message: "الكوبون غير موجود" });
      await logAudit(getUserId(req), "coupon.delete", "coupon", req.params.id, {}, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Notifications ──────────────────────────────────────────
  app.get("/api/admin/notifications", isAdmin, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getAdminNotifications();
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/notifications/broadcast", isAdmin, async (req: Request, res: Response) => {
    try {
      const { title, message } = req.body;
      if (!title || !message) return res.status(400).json({ message: "العنوان والرسالة مطلوبان" });
      const adminId = getUserId(req);

      // Create admin notification record
      await storage.createAdminNotification({ type: "broadcast", title, message, sentBy: adminId });

      // Send to all users via notifications table
      const allUsers = await dbQuery(`SELECT id FROM users WHERE role != 'superadmin' AND is_suspended = false`);
      for (const u of allUsers) {
        await storage.createNotification({ userId: u.id, title, message, type: "admin" });
      }

      await logAudit(adminId, "notification.broadcast", "notification", undefined, { title, usersCount: allUsers.length }, getClientIp(req));
      res.json({ success: true, sentTo: allUsers.length });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/notifications/send", isAdmin, async (req: Request, res: Response) => {
    try {
      const { title, message, targetUserId } = req.body;
      if (!title || !message || !targetUserId) return res.status(400).json({ message: "البيانات غير مكتملة" });
      const adminId = getUserId(req);

      await storage.createAdminNotification({ type: "targeted", title, message, sentBy: adminId, targetUserId });
      await storage.createNotification({ userId: targetUserId, title, message, type: "admin" });
      await logAudit(adminId, "notification.send", "notification", undefined, { title, targetUserId }, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/notifications/banner", isAdmin, async (req: Request, res: Response) => {
    try {
      const { title, message, expiresAt, deactivate } = req.body;
      const adminId = getUserId(req);

      if (deactivate) {
        await storage.deactivateBanners();
        return res.json({ success: true });
      }

      if (!title || !message) return res.status(400).json({ message: "العنوان والرسالة مطلوبان" });

      // Deactivate old banners
      await storage.deactivateBanners();

      // Create new banner
      await storage.createAdminNotification({
        type: "banner", title, message, sentBy: adminId,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      await logAudit(adminId, "notification.banner", "notification", undefined, { title }, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.get("/api/platform/banner", async (req: Request, res: Response) => {
    try {
      const banner = await storage.getActiveBanner();
      if (!banner) return res.json({ isActive: false });
      // Check expiry
      if (banner.expiresAt && new Date(banner.expiresAt) < new Date()) {
        await storage.deactivateBanners();
        return res.json({ isActive: false });
      }
      res.json({ isActive: true, title: banner.title, message: banner.message });
    } catch (error: any) {
      res.json({ isActive: false });
    }
  });

  // ─── Admin: Platform Settings ──────────────────────────────────────
  app.get("/api/admin/settings", isAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.patch("/api/admin/settings", isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = getUserId(req);
      // Store each top-level key as a separate setting
      const data = req.body;
      const settingsToSave: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        settingsToSave[key] = value;
      }
      await storage.updatePlatformSettings(settingsToSave, adminId);
      await logAudit(adminId, "settings.update", "settings", undefined, { keys: Object.keys(data) }, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Tracking Scripts (أكواد التتبع) ────────────────────────────
  app.get("/api/admin/tracking-scripts", isAdmin, async (req: Request, res: Response) => {
    try {
      const scripts = await storage.getTrackingScripts();
      res.json(scripts);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/tracking-scripts", isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = getUserId(req);
      const script = await storage.createTrackingScript({ ...req.body, createdBy: adminId });
      cache.invalidate("tracking-scripts:*");
      await logAudit(adminId, "settings.update", "settings", script.id, { action: "tracking_script.create", platform: req.body.platform }, getClientIp(req));
      res.json(script);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.patch("/api/admin/tracking-scripts/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = getUserId(req);
      const script = await storage.updateTrackingScript(req.params.id, req.body);
      if (!script) return res.status(404).json({ message: "لم يتم العثور على السكربت" });
      cache.invalidate("tracking-scripts:*");
      await logAudit(adminId, "settings.update", "settings", req.params.id, { action: "tracking_script.update", platform: script.platform }, getClientIp(req));
      res.json(script);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.delete("/api/admin/tracking-scripts/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const adminId = getUserId(req);
      const deleted = await storage.deleteTrackingScript(req.params.id);
      if (!deleted) return res.status(404).json({ message: "لم يتم العثور على السكربت" });
      cache.invalidate("tracking-scripts:*");
      await logAudit(adminId, "settings.update", "settings", req.params.id, { action: "tracking_script.delete" }, getClientIp(req));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // Public endpoint — returns active scripts for injection (no auth needed)
  // Cached for 30 minutes — rarely changes
  app.get("/api/tracking-scripts/active", async (req: Request, res: Response) => {
    try {
      const placement = req.query.placement as string || "all";
      const scripts = await cache.getOrSet(
        `tracking-scripts:${placement}`,
        CACHE_TTL.LONG,
        () => storage.getActiveTrackingScripts(placement)
      );
      res.json(scripts);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── Admin: Email Sending ─────────────────────────────────────────────────
  app.post("/api/admin/email/send", isAdmin, async (req: Request, res: Response) => {
    try {
      const { to, subject, message, sendToAll } = req.body;
      const adminId = getUserId(req);

      if (!subject || !message) {
        return res.status(400).json({ message: "الموضوع والرسالة مطلوبان" });
      }

      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = `مستندك <${process.env.RESEND_FROM_EMAIL || "noreply@resend.dev"}>`;

      // Build branded HTML
      const htmlBody = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Tajawal',Tahoma,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#E8752A,#F5943E);padding:40px 40px 30px;text-align:center;">
  <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0;font-family:'Tajawal',sans-serif;">${subject}</h1>
</td></tr>
<tr><td style="padding:36px 40px;">
  <div style="font-size:15px;color:#1F2937;line-height:1.8;white-space:pre-wrap;">${message}</div>
</td></tr>
<tr><td style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #E5E7EB;">
  <p style="font-size:13px;color:#9CA3AF;margin:0 0 4px;">مستندك — سجّل مرة واحدة وأدِر كل أعمالك</p>
  <p style="font-size:12px;color:#9CA3AF;margin:0;">© ${new Date().getFullYear()} مستندك. جميع الحقوق محفوظة.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      let sentCount = 0;
      let failedCount = 0;

      if (sendToAll) {
        const allUsers = await dbQuery(`SELECT email, first_name FROM users WHERE email IS NOT NULL AND is_suspended = false AND role != 'superadmin'`);
        for (const u of allUsers) {
          try {
            await resend.emails.send({ from, to: u.email, subject, html: htmlBody });
            sentCount++;
          } catch {
            failedCount++;
          }
        }
        await logAudit(adminId, "email.broadcast", "email", undefined, { subject, sentCount, failedCount }, getClientIp(req));
      } else {
        if (!to) return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
        const emails = Array.isArray(to) ? to : [to];
        for (const email of emails) {
          try {
            await resend.emails.send({ from, to: email, subject, html: htmlBody });
            sentCount++;
          } catch {
            failedCount++;
          }
        }
        await logAudit(adminId, "email.send", "email", undefined, { subject, to: emails, sentCount, failedCount }, getClientIp(req));
      }

      res.json({ success: true, sentCount, failedCount });
    } catch (error: any) {
      console.error("Admin email error:", error);
      res.status(500).json({ message: error?.message || "فشل في إرسال البريد" });
    }
  });

  // ─── Admin: Analytics ───────────────────────────────────────────────────────
  app.get("/api/admin/analytics", isAdmin, async (req: Request, res: Response) => {
    try {
      const analytics = await dbQuery(`
        SELECT
          -- Users
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
          (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
          (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as new_users_today,
          (SELECT COUNT(*) FROM users WHERE is_suspended = true) as suspended_users,
          (SELECT COUNT(*) FROM users WHERE email_verified = true) as verified_users,

          -- Documents
          (SELECT COUNT(*) FROM documents) as total_documents,
          (SELECT COUNT(*) FROM documents WHERE status = 'signed') as signed_documents,
          (SELECT COUNT(*) FROM documents WHERE status = 'sent') as sent_documents,
          (SELECT COUNT(*) FROM documents WHERE status = 'draft') as draft_documents,
          (SELECT COUNT(*) FROM documents WHERE created_at >= NOW() - INTERVAL '30 days') as new_documents_30d,

          -- Signatures
          (SELECT COUNT(*) FROM document_signatures) as total_signatures,
          (SELECT COUNT(*) FROM document_signatures WHERE signed_at >= NOW() - INTERVAL '30 days') as signatures_30d,
          (SELECT COUNT(*) FROM document_signatures WHERE signed_at >= NOW() - INTERVAL '7 days') as signatures_7d,

          -- Clients
          (SELECT COUNT(*) FROM clients) as total_clients,
          (SELECT COUNT(*) FROM clients WHERE created_at >= NOW() - INTERVAL '30 days') as new_clients_30d,

          -- Invoices
          (SELECT COUNT(*) FROM invoices) as total_invoices,
          (SELECT COUNT(*) FROM invoices WHERE status = 'paid') as paid_invoices,
          (SELECT COUNT(*) FROM invoices WHERE status = 'pending') as pending_invoices,
          (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_invoices,

          -- Projects
          (SELECT COUNT(*) FROM projects) as total_projects,
          (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,

          -- Profiles
          (SELECT COUNT(*) FROM profiles) as total_profiles,

          -- Subscriptions
          (SELECT COUNT(*) FROM subscriptions WHERE plan IS NOT NULL AND plan != 'free' AND status = 'active') as paid_subscriptions
      `);

      // Daily signups for last 30 days
      const dailySignups = await dbQuery(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);

      // Daily documents for last 30 days
      const dailyDocuments = await dbQuery(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM documents
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);

      // Daily signatures for last 30 days
      const dailySignatures = await dbQuery(`
        SELECT DATE(signed_at) as date, COUNT(*) as count
        FROM document_signatures
        WHERE signed_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(signed_at)
        ORDER BY date ASC
      `);

      // Top users by documents
      const topUsers = await dbQuery(`
        SELECT u.first_name, u.last_name, u.email, COUNT(d.id) as doc_count
        FROM users u
        LEFT JOIN documents d ON d.user_id = u.id
        GROUP BY u.id, u.first_name, u.last_name, u.email
        ORDER BY doc_count DESC
        LIMIT 10
      `);

      // Document types distribution
      const docTypes = await dbQuery(`
        SELECT doc_type, COUNT(*) as count
        FROM documents
        GROUP BY doc_type
      `);

      res.json({
        summary: analytics[0],
        dailySignups,
        dailyDocuments,
        dailySignatures,
        topUsers,
        docTypes,
      });
    } catch (error: any) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: error?.message || "فشل في جلب التحليلات" });
    }
  });

  // ─── Migration Admin Routes ───────────────────────────────────────────────
  app.get("/api/admin/migrate/preview", isAdmin, async (req: Request, res: Response) => {
    try {
      const { getDataPreview } = await import("./migration");
      const preview = getDataPreview();
      res.json(preview);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "فشل في جلب المعاينة" });
    }
  });

  app.get("/api/admin/migrate/state", isAdmin, async (req: Request, res: Response) => {
    try {
      const { getMigrationState } = await import("./migration");
      res.json(getMigrationState());
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/migrate/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const { migrateUsers } = await import("./migration");
      res.json({ message: "بدأ نقل المستخدمين..." });
      migrateUsers().catch(console.error);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/migrate/clients", isAdmin, async (req: Request, res: Response) => {
    try {
      const { migrateClients } = await import("./migration");
      res.json({ message: "بدأ نقل العملاء..." });
      migrateClients().catch(console.error);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/migrate/contracts", isAdmin, async (req: Request, res: Response) => {
    try {
      const { migrateContracts } = await import("./migration");
      res.json({ message: "بدأ نقل العقود..." });
      migrateContracts().catch(console.error);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/migrate/profiles", isAdmin, async (req: Request, res: Response) => {
    try {
      const { migrateProfiles } = await import("./migration");
      res.json({ message: "بدأ نقل الملفات..." });
      migrateProfiles().catch(console.error);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/admin/migrate/reset", isAdmin, async (req: Request, res: Response) => {
    try {
      const { resetMigrationState } = await import("./migration");
      resetMigrationState();
      res.json({ message: "تم إعادة التعيين" });
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  // ─── AI Routes ─────────────────────────────────────────────────────
  const aiLimiter = rateLimit({ windowMs: 60_000, max: 20, message: { message: "تجاوزت الحد المسموح، حاول بعد دقيقة" } });

  const AI_SYSTEM_PROMPT = `أنت مساعد كتابة محترف باللغة العربية. تساعد المستخدمين في كتابة وتحسين المستندات والعقود والفواتير والمحتوى التجاري.

قواعد مهمة:
- دائماً أرجع النتيجة بصيغة HTML نظيف (p, h1, h2, h3, ul, ol, li, strong, em, blockquote, table, tr, td, th فقط)
- لا تستخدم markdown - استخدم HTML فقط
- حافظ على الاتجاه RTL للنصوص العربية
- كن دقيقاً ومختصراً في إجاباتك
- إذا كان النص عربي أرجع عربي، إذا إنجليزي أرجع إنجليزي`;

  const AI_ACTION_PROMPTS: Record<string, (content: string, extra?: string) => string> = {
    improve: (content) => `حسّن النص التالي من ناحية الأسلوب والوضوح والقواعد مع الحفاظ على المعنى الأصلي. أرجع HTML فقط:\n\n${content}`,
    generate: (_content, extra) => `اكتب محتوى احترافي عن الموضوع التالي. أرجع HTML فقط:\n\n${extra || "محتوى عام"}`,
    translate: (content) => `ترجم النص التالي. إذا كان عربي ترجمه إنجليزي، وإذا كان إنجليزي ترجمه عربي. أرجع HTML فقط:\n\n${content}`,
    summarize: (content) => `لخّص النص التالي بشكل مختصر ومفيد. أرجع HTML فقط:\n\n${content}`,
    fix_grammar: (content) => `صحّح الأخطاء الإملائية والنحوية في النص التالي بدون تغيير المعنى. أرجع HTML فقط:\n\n${content}`,
    expand: (content) => `وسّع النص التالي بإضافة تفاصيل وأمثلة مع الحفاظ على الأسلوب. أرجع HTML فقط:\n\n${content}`,
    shorten: (content) => `اختصر النص التالي مع الحفاظ على النقاط المهمة. أرجع HTML فقط:\n\n${content}`,
    formal: (content) => `أعد صياغة النص التالي بنبرة رسمية واحترافية. أرجع HTML فقط:\n\n${content}`,
    friendly: (content) => `أعد صياغة النص التالي بنبرة ودية وسهلة. أرجع HTML فقط:\n\n${content}`,
    marketing: (content) => `أعد صياغة النص التالي بأسلوب تسويقي جذاب ومقنع. أرجع HTML فقط:\n\n${content}`,
    complete: (content) => `أكمل النص التالي بشكل طبيعي ومنطقي (فقرة أو فقرتين). أرجع HTML فقط:\n\n${content}`,
    custom: (content, extra) => `${extra || "حسّن هذا النص"}\n\nالنص:\n${content}\n\nأرجع HTML فقط.`,
  };

  app.post("/api/ai/generate", isAuthenticated, aiLimiter, async (req: Request, res: Response) => {
    try {
      const aiAccess = await checkFeatureAccess(getUserId(req), "ai");
      if (!aiAccess.allowed) {
        return res.status(403).json({ message: "هذه الميزة غير متوفرة في باقتك الحالية", upgrade: true });
      }
      if (!anthropic) return res.status(503).json({ message: "خدمة AI غير مفعّلة. أضف ANTHROPIC_API_KEY في المتغيرات البيئية." });

      const { action, content, extra } = req.body;
      if (!action || !AI_ACTION_PROMPTS[action]) {
        return res.status(400).json({ message: "أمر غير صالح" });
      }

      const promptFn = AI_ACTION_PROMPTS[action];
      const userMessage = promptFn(content || "", extra);

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: AI_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      const result = textBlock?.type === "text" ? textBlock.text : "";

      // Strip markdown code fences if any
      const cleaned = result.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

      res.json({ result: cleaned });
    } catch (error: any) {
      console.error("AI generation error:", error);
      if (error?.status === 429) {
        return res.status(429).json({ message: "تجاوزت حد استخدام AI، حاول لاحقاً" });
      }
      res.status(500).json({ message: "فشل في توليد المحتوى" });
    }
  });

  // Streaming endpoint for longer responses
  app.post("/api/ai/stream", isAuthenticated, aiLimiter, async (req: Request, res: Response) => {
    try {
      const aiAccess = await checkFeatureAccess(getUserId(req), "ai");
      if (!aiAccess.allowed) {
        return res.status(403).json({ message: "هذه الميزة غير متوفرة في باقتك الحالية", upgrade: true });
      }
      if (!anthropic) return res.status(503).json({ message: "خدمة AI غير مفعّلة" });

      const { action, content, extra } = req.body;
      if (!action || !AI_ACTION_PROMPTS[action]) {
        return res.status(400).json({ message: "أمر غير صالح" });
      }

      const promptFn = AI_ACTION_PROMPTS[action];
      const userMessage = promptFn(content || "", extra);

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: AI_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("AI stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "فشل في توليد المحتوى" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "فشل في التوليد" })}\n\n`);
        res.end();
      }
    }
  });

  return httpServer;
}
