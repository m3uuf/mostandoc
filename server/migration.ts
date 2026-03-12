import path from "path";
import fs from "fs";
import crypto from "crypto";
import { db } from "./db";
import { users, passwordResetTokens } from "@shared/models/auth";
import { clients, contracts, profiles } from "@shared/schema";
import { createUser, getUserByEmail } from "./customAuth";
import { eq } from "drizzle-orm";

export interface MigrationState {
  phase: "idle" | "users" | "clients" | "contracts" | "profiles" | "done" | "error";
  currentStep: string;
  processed: number;
  total: number;
  skipped: number;
  errors: string[];
  log: string[];
  startedAt?: string;
  finishedAt?: string;
  userIdMap: Record<string, string>;
  clientIdMap: Record<string, string>;
}

const state: MigrationState = {
  phase: "idle",
  currentStep: "",
  processed: 0,
  total: 0,
  skipped: 0,
  errors: [],
  log: [],
  userIdMap: {},
  clientIdMap: {},
};

export function getMigrationState(): MigrationState {
  return { ...state, userIdMap: {}, clientIdMap: {} };
}

function loadJson(filename: string): any[] {
  const filePath = path.join(process.cwd(), "attached_assets", filename);
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Array.isArray(raw) ? raw : Object.values(raw);
}

async function generateMigrationResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  return token;
}

function addLog(msg: string) {
  state.log.push(`[${new Date().toISOString()}] ${msg}`);
  console.log("[MIGRATION]", msg);
}

function statusToMustanadak(arabicStatus: string | undefined): string {
  if (!arabicStatus) return "draft";
  const s = arabicStatus.trim();
  if (s === "مقبول" || s === "signed") return "signed";
  if (s === "مرفوض" || s === "cancelled") return "cancelled";
  if (s === "قيد المراجعة" || s === "pending") return "pending";
  return "draft";
}

async function sendPasswordResetEmail(email: string, token: string, firstName: string) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const resetUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost:5000"}/reset-password?token=${token}`;
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
      to: email,
      subject: "مرحباً في مستندك — تفعيل حسابك",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #3B5FE5;">مرحباً ${firstName} في مستندك! 👋</h2>
          <p>تم نقل حسابك من المنصة القديمة إلى <strong>مستندك</strong> — منصة إدارة أعمالك الجديدة.</p>
          <p>للوصول إلى حسابك، يرجى تعيين كلمة مرور جديدة عبر الرابط التالي:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #3B5FE5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              تعيين كلمة المرور
            </a>
          </div>
          <p style="color: #888; font-size: 14px;">هذا الرابط صالح لمدة 24 ساعة. إذا لم تطلب هذا، يمكنك تجاهل هذه الرسالة.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #888; font-size: 12px;">فريق مستندك | mustanadak.com</p>
        </div>
      `,
    });
  } catch (err: any) {
    addLog(`⚠️ فشل إرسال إيميل إلى ${email}: ${err?.message}`);
  }
}

export async function migrateUsers(): Promise<void> {
  if (state.phase !== "idle" && state.phase !== "done" && state.phase !== "error") {
    throw new Error("Migration already running");
  }
  state.phase = "users";
  state.currentStep = "نقل المستخدمين";
  state.processed = 0;
  state.skipped = 0;
  state.errors = [];
  state.log = [];
  state.userIdMap = {};
  state.clientIdMap = {};
  state.startedAt = new Date().toISOString();
  state.finishedAt = undefined;

  const bubbleUsers = loadJson("user_1773327104530.json");
  state.total = bubbleUsers.length;
  addLog(`بدأ نقل ${bubbleUsers.length} مستخدم...`);

  for (const bu of bubbleUsers) {
    try {
      const auth = bu.authentication || {};
      const email = auth.email?.email || auth.Google?.email || auth.Apple?.email;
      if (!email) {
        state.skipped++;
        addLog(`تخطي: لا يوجد إيميل للمستخدم ${bu._id}`);
        continue;
      }

      const firstName = (bu["First_name"] || "مستخدم").trim();
      const lastName = (bu["last_name "] || bu["last_name"] || "").trim();
      const phone = (bu["Phone"] || bu["phone"] || "").toString().trim();

      const existing = await getUserByEmail(email);
      if (existing) {
        state.userIdMap[bu._id] = existing.id;
        state.skipped++;
        addLog(`تخطي (موجود): ${email}`);
        continue;
      }

      const randomPassword = crypto.randomBytes(16).toString("hex");
      const newUser = await createUser({
        email,
        password: randomPassword,
        firstName,
        lastName: lastName || undefined,
        phone: phone || undefined,
      });

      await db.update(users).set({ emailVerified: true }).where(eq(users.id, newUser.id));

      state.userIdMap[bu._id] = newUser.id;

      // emails will be sent separately after migration

      state.processed++;
      if (state.processed % 10 === 0) {
        addLog(`✅ تم نقل ${state.processed}/${state.total} مستخدم`);
      }
    } catch (err: any) {
      state.errors.push(`خطأ مع المستخدم ${bu._id}: ${err?.message}`);
      addLog(`❌ خطأ: ${err?.message}`);
    }
  }

  addLog(`✅ اكتمل نقل المستخدمين: ${state.processed} جديد، ${state.skipped} موجود، ${state.errors.length} خطأ`);
  state.phase = "done";
  state.finishedAt = new Date().toISOString();
}

export async function migrateClients(): Promise<void> {
  if (state.phase !== "idle" && state.phase !== "done" && state.phase !== "error") {
    if (state.phase !== "users") throw new Error("Run user migration first");
  }

  state.phase = "clients";
  state.currentStep = "نقل العملاء";
  state.processed = 0;
  state.skipped = 0;
  state.errors = [];
  state.startedAt = new Date().toISOString();
  state.finishedAt = undefined;

  const bubbleClients = loadJson("client_1773327130798.json");
  state.total = bubbleClients.length;
  addLog(`بدأ نقل ${bubbleClients.length} عميل...`);

  for (const bc of bubbleClients) {
    try {
      const bubbleOwnerId = (bc["client to "] || bc["client to"] || "").trim();
      const userId = state.userIdMap[bubbleOwnerId];

      if (!userId) {
        state.skipped++;
        addLog(`تخطي عميل: مستخدم غير موجود ${bubbleOwnerId}`);
        continue;
      }

      const name = (bc["client_name"] || bc["client name"] || "عميل").trim();
      const email = (bc["email"] || "").trim() || null;

      const [newClient] = await db.insert(clients).values({
        userId,
        name,
        email,
        status: "active",
      }).returning();

      state.clientIdMap[bc._id] = newClient.id;
      state.processed++;
    } catch (err: any) {
      state.errors.push(`خطأ مع العميل ${bc._id}: ${err?.message}`);
      addLog(`❌ خطأ: ${err?.message}`);
    }
  }

  addLog(`✅ اكتمل نقل العملاء: ${state.processed} جديد، ${state.skipped} تخطي، ${state.errors.length} خطأ`);
  state.phase = "done";
  state.finishedAt = new Date().toISOString();
}

export async function migrateContracts(): Promise<void> {
  state.phase = "contracts";
  state.currentStep = "نقل العقود والمستندات";
  state.processed = 0;
  state.skipped = 0;
  state.errors = [];
  state.startedAt = new Date().toISOString();
  state.finishedAt = undefined;

  const userDocs = loadJson("user_docs_1773327104530.json");
  const clientDocs = loadJson("client_docs_1773327130797.json");
  state.total = userDocs.length + clientDocs.length;

  addLog(`بدأ نقل ${userDocs.length} مستند مستخدم + ${clientDocs.length} مستند عميل...`);

  for (const doc of userDocs) {
    try {
      const bubbleOwnerId = (doc["owner"] || doc["Created By"] || "").trim();
      const userId = state.userIdMap[bubbleOwnerId];

      if (!userId) {
        state.skipped++;
        continue;
      }

      const title = (doc["Template Name"] || "مستند بدون عنوان").trim();
      const content = doc["Rech Text"] || doc["Description"] || "";
      const arabicStatus = doc["حالة الملف"] || "";
      const status = statusToMustanadak(arabicStatus);

      await db.insert(contracts).values({
        userId,
        title,
        content,
        status,
        description: doc["Description"] || null,
        createdAt: doc["Created Date"] ? new Date(doc["Created Date"]) : new Date(),
      } as any);

      state.processed++;
    } catch (err: any) {
      state.errors.push(`خطأ مع المستند ${doc._id}: ${err?.message}`);
    }
  }

  addLog(`✅ تم نقل ${state.processed} مستند مستخدم`);

  let clientDocCount = 0;
  for (const doc of clientDocs) {
    try {
      const bubbleOwnerId = (doc["owner"] || "").trim();
      const userId = state.userIdMap[bubbleOwnerId];

      if (!userId) {
        state.skipped++;
        continue;
      }

      const bubbleClientId = (doc["client"] || "").trim();
      const clientId = state.clientIdMap[bubbleClientId] || null;

      const title = (doc["Template Name"] || "مستند عميل").trim();
      const content = doc["Rech Text"] || doc["Description"] || "";
      const status = statusToMustanadak(doc["status"]);

      let endDate: string | null = null;
      if (doc["expDate"]) {
        try {
          endDate = new Date(doc["expDate"]).toISOString().split("T")[0];
        } catch {}
      }

      await db.insert(contracts).values({
        userId,
        clientId,
        title,
        content,
        status,
        description: doc["Description"] || null,
        endDate,
        createdAt: doc["Created Date"] ? new Date(doc["Created Date"]) : new Date(),
      } as any);

      clientDocCount++;
      state.processed++;
    } catch (err: any) {
      state.errors.push(`خطأ مع مستند عميل ${doc._id}: ${err?.message}`);
    }
  }

  addLog(`✅ تم نقل ${clientDocCount} مستند عميل`);
  addLog(`✅ اكتمل نقل العقود: ${state.processed} جديد، ${state.skipped} تخطي، ${state.errors.length} خطأ`);
  state.phase = "done";
  state.finishedAt = new Date().toISOString();
}

export async function migrateProfiles(): Promise<void> {
  state.phase = "profiles";
  state.currentStep = "نقل ملفات الشركات";
  state.processed = 0;
  state.skipped = 0;
  state.errors = [];
  state.startedAt = new Date().toISOString();
  state.finishedAt = undefined;

  const companyProfiles = loadJson("company_profile_1773327130798.json");
  state.total = companyProfiles.length;

  addLog(`بدأ نقل ${companyProfiles.length} ملف شركة...`);

  for (const cp of companyProfiles) {
    try {
      const bubbleOwnerId = (cp["Created By"] || "").trim();
      const userId = state.userIdMap[bubbleOwnerId];

      if (!userId) {
        state.skipped++;
        continue;
      }

      const companyName = (cp["business name "] || cp["business name"] || "").trim();
      const website = (cp["company website "] || cp["company website"] || "").trim();
      const phone = cp["phone number"] ? String(cp["phone number"]).trim() : null;
      const logoUrl = cp["business logo"]
        ? (cp["business logo"].startsWith("//") ? "https:" + cp["business logo"] : cp["business logo"])
        : null;

      const existingRows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
      const existing = existingRows[0];

      if (existing) {
        state.skipped++;
        continue;
      }

      const username = `user_${userId.replace(/-/g, "").substring(0, 12)}`;

      await db.insert(profiles).values({
        userId,
        username,
        companyName: companyName || null,
        website: website || null,
        phonePublic: phone,
        logoUrl,
        onboardingCompleted: true,
      } as any);

      state.processed++;
    } catch (err: any) {
      state.errors.push(`خطأ مع الملف ${cp._id}: ${err?.message}`);
      addLog(`❌ خطأ: ${err?.message}`);
    }
  }

  addLog(`✅ اكتمل نقل الملفات: ${state.processed} جديد، ${state.skipped} تخطي، ${state.errors.length} خطأ`);
  state.phase = "done";
  state.finishedAt = new Date().toISOString();
}

export function getDataPreview() {
  const users = loadJson("user_1773327104530.json");
  const clients = loadJson("client_1773327130798.json");
  const userDocs = loadJson("user_docs_1773327104530.json");
  const clientDocs = loadJson("client_docs_1773327130797.json");
  const companyProfiles = loadJson("company_profile_1773327130798.json");
  const templates = loadJson("templates_1773327104529.json");

  let emailCount = 0, googleCount = 0;
  for (const u of users) {
    const auth = u.authentication || {};
    if (auth.email?.email) emailCount++;
    else if (auth.Google?.email) googleCount++;
  }

  return {
    users: { total: users.length, email: emailCount, google: googleCount },
    clients: { total: clients.length },
    userDocs: { total: userDocs.length },
    clientDocs: { total: clientDocs.length },
    companyProfiles: { total: companyProfiles.length },
    templates: { total: templates.length },
  };
}

export function resetMigrationState() {
  state.phase = "idle";
  state.currentStep = "";
  state.processed = 0;
  state.total = 0;
  state.skipped = 0;
  state.errors = [];
  state.log = [];
  state.userIdMap = {};
  state.clientIdMap = {};
  state.startedAt = undefined;
  state.finishedAt = undefined;
}
