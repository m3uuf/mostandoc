import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import * as schema from "../shared/schema.js";
import { users, sessions } from "../shared/models/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "attached_assets");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

function loadJson(filename: string): any[] {
  const files = fs.readdirSync(assetsDir);
  const match = files.find((f) => f.startsWith(filename.replace(".json", "")));
  if (!match) {
    console.log(`  [SKIP] File not found: ${filename}`);
    return [];
  }
  const raw = fs.readFileSync(path.join(assetsDir, match), "utf-8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [data];
}

function fixUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function toStr(val: any): string | null {
  if (val === null || val === undefined) return null;
  return String(val);
}

function toDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ID maps: Bubble ID -> new UUID
const userIdMap = new Map<string, string>();
const clientIdMap = new Map<string, string>();

async function seedUsers() {
  console.log("\n=== Seeding Users ===");
  const data = loadJson("user_");
  console.log(`  Found ${data.length} users`);

  const defaultHash = await bcrypt.hash("Mustanadak2026!", 12);
  let count = 0;

  for (const u of data) {
    const bubbleId = u._id;
    if (!bubbleId) continue;

    const email =
      u.authentication?.email?.email || u["google email"] || null;
    if (!email) continue;

    const newId = randomUUID();
    userIdMap.set(bubbleId, newId);

    const googleId = u.authentication?.Google?.id || null;
    const hasGoogle = !!googleId;
    const role =
      u["User level"] === "admin Membership" ? "superadmin" : "user";

    try {
      await db.insert(users).values({
        id: newId,
        email: email.toLowerCase().trim(),
        passwordHash: defaultHash,
        firstName: u.First_name || null,
        lastName: u["last_name "] || u.last_name || null,
        phone: toStr(u.phone),
        profileImageUrl: fixUrl(u.image),
        googleId: googleId,
        facebookId: null,
        appleId: null,
        authProvider: hasGoogle ? "google" : "email",
        emailVerified: u["email confirm ?"] === true || u.authentication?.email?.email_confirmed === true,
        role: role,
        isSuspended: false,
      });
      count++;
    } catch (e: any) {
      if (e.message?.includes("duplicate")) {
        console.log(`  [SKIP] Duplicate email: ${email}`);
      } else {
        console.log(`  [ERROR] User ${email}: ${e.message}`);
      }
    }
  }
  console.log(`  Inserted ${count} users`);
}

async function seedClients() {
  console.log("\n=== Seeding Clients ===");
  const data = loadJson("client_1773327130798");
  console.log(`  Found ${data.length} clients`);

  let count = 0;
  for (const c of data) {
    const bubbleId = c._id;
    const ownerBubbleId = c["client to "] || c["client to"] || c["Created By"];
    const userId = userIdMap.get(ownerBubbleId);

    if (!userId) continue;

    const newId = randomUUID();
    clientIdMap.set(bubbleId, newId);

    try {
      await db.insert(schema.clients).values({
        id: newId,
        userId: userId,
        name: c.client_name || "عميل",
        email: c.email || null,
        phone: toStr(c["clinte_ phone"] || c.clinte_phone),
        company: null,
        status: "active",
        notes: c.note || null,
      });
      count++;
    } catch (e: any) {
      console.log(`  [ERROR] Client ${c.client_name}: ${e.message}`);
    }
  }
  console.log(`  Inserted ${count} clients`);
}

async function seedProfiles() {
  console.log("\n=== Seeding Profiles ===");
  const companyData = loadJson("company_profile_");
  const userData = loadJson("user_");
  console.log(`  Found ${companyData.length} company profiles`);

  // First create profiles for users with data
  let count = 0;
  const profiledUsers = new Set<string>();

  // Company profiles
  for (const cp of companyData) {
    const ownerBubbleId = cp["Created By"];
    const userId = userIdMap.get(ownerBubbleId);
    if (!userId || profiledUsers.has(userId)) continue;

    const user = userData.find((u: any) => u._id === ownerBubbleId);
    const username =
      user?.Slug || user?.username || `user-${randomUUID().slice(0, 8)}`;

    try {
      await db.insert(schema.profiles).values({
        userId: userId,
        username: username.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
        fullName:
          [user?.First_name, user?.["last_name "] || user?.last_name]
            .filter(Boolean)
            .join(" ") || null,
        bio: user?.Bio || null,
        profession: null,
        companyName: cp["business name "] || cp["business name"] || null,
        companyAddress: cp["business addris"] || cp.business_address || null,
        logoUrl: fixUrl(cp["business logo"]),
        website: cp["company website "] || cp["company website"] || null,
        publicPhone: toStr(cp["phone number"]),
        isPublic: true,
        onboardingCompleted: true,
        primaryColor: "#3b82f6",
        accentColor: "#f97316",
        headerStyle: "gradient",
        themeMode: "light",
        buttonStyle: "filled",
      });
      profiledUsers.add(userId);
      count++;
    } catch (e: any) {
      console.log(`  [ERROR] Profile for ${username}: ${e.message}`);
    }
  }

  // Create basic profiles for users without company profiles
  for (const u of userData) {
    const userId = userIdMap.get(u._id);
    if (!userId || profiledUsers.has(userId)) continue;

    const slug = u.Slug || u.username;
    if (!slug) continue;

    try {
      await db.insert(schema.profiles).values({
        userId: userId,
        username: slug.toLowerCase().replace(/[^a-z0-9-_]/g, ""),
        fullName:
          [u.First_name, u["last_name "] || u.last_name]
            .filter(Boolean)
            .join(" ") || null,
        bio: u.Bio || null,
        isPublic: false,
        onboardingCompleted: false,
        primaryColor: "#3b82f6",
        accentColor: "#f97316",
        headerStyle: "gradient",
        themeMode: "light",
        buttonStyle: "filled",
      });
      profiledUsers.add(userId);
      count++;
    } catch (e: any) {
      if (!e.message?.includes("duplicate")) {
        console.log(`  [ERROR] Profile for ${slug}: ${e.message}`);
      }
    }
  }
  console.log(`  Inserted ${count} profiles`);
}

async function seedSubscriptions() {
  console.log("\n=== Seeding Subscriptions ===");
  const subData = loadJson("subscription_");
  const userData = loadJson("user_");
  console.log(`  Found ${subData.length} subscriptions`);

  // Build stripe customer -> user mapping
  const stripeToUser = new Map<string, string>();
  for (const u of userData) {
    const customerId = u["stripe customer id"];
    if (customerId && u._id) {
      const userId = userIdMap.get(u._id);
      if (userId) stripeToUser.set(customerId, userId);
    }
  }

  let count = 0;
  const seenUsers = new Set<string>();

  for (const s of subData) {
    const customerId = s["id_customer "] || s["id_customer"] || s.id_customer;
    if (!customerId) continue;

    const userId = stripeToUser.get(customerId);
    if (!userId || seenUsers.has(userId)) continue;
    seenUsers.add(userId);

    const plan = (s.plan || "free").toLowerCase();
    if (plan === "free") continue;

    const isActive = s["sub active?"] === true;

    try {
      await db.insert(schema.subscriptions).values({
        userId: userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId:
          s["id_subscription "] || s["id_subscription"] || null,
        stripePriceId: null,
        plan: plan,
        status: isActive ? "active" : "canceled",
        cancelAtPeriodEnd: false,
      });
      count++;
    } catch (e: any) {
      if (!e.message?.includes("duplicate")) {
        console.log(`  [ERROR] Subscription: ${e.message}`);
      }
    }
  }
  console.log(`  Inserted ${count} subscriptions`);
}

async function seedTemplatesAsDocuments() {
  console.log("\n=== Seeding Templates as Documents ===");
  const data = loadJson("templates_");
  console.log(`  Found ${data.length} templates`);

  // Find the admin user (m3uuf) to own templates
  const adminBubbleId = "1711301309887x175822024615976500";
  const adminUserId = userIdMap.get(adminBubbleId);

  if (!adminUserId) {
    console.log("  [SKIP] Admin user not found, skipping templates");
    return;
  }

  let count = 0;
  for (const t of data) {
    const content = t["rech text "] || t["rech text"] || "";
    if (!content) continue;

    const creatorBubbleId = t["Created by"] || t["Created By"];
    const userId = userIdMap.get(creatorBubbleId) || adminUserId;

    try {
      await db.insert(schema.documents).values({
        userId: userId,
        title: t["Template Name"] || "قالب بدون عنوان",
        docType: "text",
        content: content,
        status: "draft",
        shareToken: randomUUID(),
      });
      count++;
    } catch (e: any) {
      console.log(
        `  [ERROR] Template ${t["Template Name"]}: ${e.message}`
      );
    }
  }
  console.log(`  Inserted ${count} document templates`);
}

async function main() {
  console.log("🚀 Starting database seed...");
  console.log(`  Database: ${process.env.DATABASE_URL}`);
  console.log(`  Assets dir: ${assetsDir}`);

  try {
    await seedUsers();
    await seedClients();
    await seedProfiles();
    await seedSubscriptions();
    await seedTemplatesAsDocuments();

    console.log("\n✅ Seed completed!");
    console.log(`  Users: ${userIdMap.size}`);
    console.log(`  Clients: ${clientIdMap.size}`);
  } catch (e) {
    console.error("❌ Seed failed:", e);
  } finally {
    await pool.end();
  }
}

main();
