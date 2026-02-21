import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupCustomAuth, isAuthenticated, getUserId, getUserByEmail, getUserById, createUser, verifyPassword, createOrUpdateSocialUser, generatePasswordResetToken, validateResetToken, resetPassword, generateEmailVerificationToken, verifyEmailToken } from "./customAuth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/models/auth";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" as any });

const PLANS: Record<string, { name: string; priceAmount: number }> = {
  starter: { name: "المبتدئ", priceAmount: 2900 },
  pro: { name: "المحترف", priceAmount: 5900 },
  business: { name: "الأعمال", priceAmount: 9900 },
};

function getPagination(req: Request, defaultLimit = 20) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
  return { page, limit };
}

function cleanDates(obj: Record<string, any>, dateFields: string[]): Record<string, any> {
  const cleaned = { ...obj };
  for (const field of dateFields) {
    if (cleaned[field] === "" || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  }
  return cleaned;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "تم تجاوز الحد المسموح من الطلبات. حاول لاحقاً." },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "تم تجاوز الحد المسموح من محاولات الدخول. حاول لاحقاً." },
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
  app.use("/api/", generalLimiter);

  setupCustomAuth(app);
  registerObjectStorageRoutes(app);

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
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
          to: email,
          subject: "تفعيل بريدك الإلكتروني - مستندك",
          html: `
            <div dir="rtl" style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3B5FE5;">مستندك</h1>
              </div>
              <h2>تفعيل البريد الإلكتروني</h2>
              <p>مرحباً ${firstName},</p>
              <p>شكراً لتسجيلك في مستندك! اضغط على الزر أدناه لتفعيل بريدك الإلكتروني:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="background-color: #3B5FE5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">تفعيل البريد الإلكتروني</a>
              </div>
              <p style="color: #666; font-size: 14px;">هذا الرابط صالح لمدة 24 ساعة.</p>
              <p style="color: #666; font-size: 14px;">إذا لم تقم بإنشاء حساب، تجاهل هذه الرسالة.</p>
            </div>
          `,
        });
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
      res.json(safeUser);
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
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
          to: user.email!,
          subject: "إعادة تعيين كلمة المرور - مستندك",
          html: `
            <div dir="rtl" style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #3B5FE5;">مستندك</h1>
              </div>
              <h2>إعادة تعيين كلمة المرور</h2>
              <p>مرحباً ${user.firstName || ""},</p>
              <p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بك. اضغط على الزر أدناه:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #3B5FE5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">إعادة تعيين كلمة المرور</a>
              </div>
              <p style="color: #666; font-size: 14px;">هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
              <p style="color: #666; font-size: 14px;">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.</p>
            </div>
          `,
        });
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
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
        to: user.email,
        subject: "تفعيل بريدك الإلكتروني - مستندك",
        html: `
          <div dir="rtl" style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #3B5FE5;">مستندك</h1>
            </div>
            <h2>تفعيل البريد الإلكتروني</h2>
            <p>مرحباً ${user.firstName || ""},</p>
            <p>اضغط على الزر أدناه لتفعيل بريدك الإلكتروني:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #3B5FE5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">تفعيل البريد الإلكتروني</a>
            </div>
            <p style="color: #666; font-size: 14px;">هذا الرابط صالح لمدة 24 ساعة.</p>
          </div>
        `,
      });
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
      const user = req.user as any;
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
      const user = req.user as any;
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
      const user = req.user as any;
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
      const { plan } = req.body;
      if (!PLANS[plan]) return res.status(400).json({ message: "باقة غير صالحة" });

      const userId = getUserId(req);
      const userObj = await getUserById(userId);
      const userEmail = userObj?.email;

      let sub = await storage.getSubscription(userId);
      let customerId: string;

      if (sub?.stripeCustomerId) {
        customerId = sub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.upsertSubscription({ userId, stripeCustomerId: customerId });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "sar",
            product_data: { name: `مستندك - ${PLANS[plan].name}` },
            unit_amount: PLANS[plan].priceAmount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        subscription_data: {
          trial_period_days: 14,
          metadata: { userId, plan },
        },
        success_url: `${baseUrl}/dashboard/settings?subscription=success`,
        cancel_url: `${baseUrl}/dashboard/settings?subscription=cancelled`,
        metadata: { userId, plan },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "فشل في إنشاء جلسة الدفع" });
    }
  });

  app.post("/api/subscription/portal", isAuthenticated, async (req, res) => {
    try {
      const sub = await storage.getSubscription(getUserId(req));
      if (!sub?.stripeCustomerId) return res.status(400).json({ message: "لا يوجد اشتراك" });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${baseUrl}/dashboard/settings`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Portal error:", error);
      res.status(500).json({ message: "فشل في فتح بوابة الإدارة" });
    }
  });

  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    try {
      if (webhookSecret) {
        if (!sig) return res.status(400).json({ message: "Missing stripe-signature header" });
        event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
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

          await storage.updateSubscriptionByCustomerId(customerId, {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            plan,
            status: subscription.status === "active" || subscription.status === "trialing" ? "active" : subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
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

  return httpServer;
}
