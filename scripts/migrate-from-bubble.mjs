/**
 * Migration script: Bubble.io → Railway PostgreSQL
 *
 * Migrates: Users, Clients, Documents, Company Profiles, Subscriptions
 *
 * Usage: node scripts/migrate-from-bubble.mjs
 *
 * Required env: DATABASE_URL (Railway PostgreSQL connection string)
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = "/tmp/bubble_export";

// Railway PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:nlDdNkvCFawXBdJFHeYpxSGZzcMzNtZr@interchange.proxy.rlwy.net:36155/railway";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 15000,
});

// ─── Helper Functions ────────────────────────────────────────────

function loadJSON(filename) {
  const filepath = path.join(EXPORT_DIR, filename);
  const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  // Some files have response.results wrapper, some are raw arrays
  if (Array.isArray(data)) return data;
  if (data.response?.results) return data.response.results;
  return data;
}

function generateUUID() {
  return crypto.randomUUID();
}

function parseBubbleDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return null;
  }
}

async function query(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// ─── Migration: Users ────────────────────────────────────────────

async function migrateUsers() {
  console.log("\n📦 Migrating Users...");
  const bubbleUsers = loadJSON("all_users.json");

  let migrated = 0;
  let skipped = 0;
  const userIdMap = {}; // Bubble _id → PostgreSQL id
  const userEmailMap = {}; // email → PostgreSQL id

  for (const bu of bubbleUsers) {
    const authEmail = bu.authentication?.email?.email;
    if (!authEmail) {
      skipped++;
      continue;
    }

    // Check if user already exists
    const existing = await query("SELECT id FROM users WHERE email = $1", [authEmail.toLowerCase()]);
    if (existing.rows.length > 0) {
      userIdMap[bu._id] = existing.rows[0].id;
      userEmailMap[authEmail.toLowerCase()] = existing.rows[0].id;
      skipped++;
      continue;
    }

    const userId = generateUUID();
    const firstName = bu.First_name || null;
    const lastName = (bu["last_name "] || "").trim() || null;
    const profileImage = bu.image || null;
    const isSignedUp = bu.user_signed_up === true;
    const emailConfirmed = bu.authentication?.email?.email_confirmed || false;
    const role = (bu["User level"] === "admin" || authEmail === "m3uuuf@gmail.com") ? "admin" : "user";

    try {
      await query(
        `INSERT INTO users (id, email, first_name, last_name, profile_image_url, auth_provider, email_verified, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (email) DO NOTHING`,
        [userId, authEmail.toLowerCase(), firstName, lastName, profileImage, "email", emailConfirmed, role]
      );
      userIdMap[bu._id] = userId;
      userEmailMap[authEmail.toLowerCase()] = userId;
      migrated++;
    } catch (err) {
      console.error(`  ❌ User ${authEmail}: ${err.message}`);
    }
  }

  console.log(`  ✅ Users: ${migrated} migrated, ${skipped} skipped`);
  return { userIdMap, userEmailMap };
}

// ─── Migration: Clients ──────────────────────────────────────────

async function migrateClients(userEmailMap) {
  console.log("\n📦 Migrating Clients...");
  const bubbleClients = loadJSON("all_clients_api.json");

  let migrated = 0;
  let skipped = 0;
  const clientIdMap = {}; // Bubble _id → PostgreSQL id

  for (const bc of bubbleClients) {
    const clientEmail = bc.email || null;
    const clientName = bc.client_name || clientEmail || "Unknown";

    // Find the owner user - for API data we only have email
    // We'll assign to the first admin user as owner
    const adminResult = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const ownerId = adminResult.rows[0]?.id;

    if (!ownerId) {
      skipped++;
      continue;
    }

    const clientId = generateUUID();
    try {
      await query(
        `INSERT INTO clients (id, user_id, name, email, phone, company, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [clientId, ownerId, clientName, clientEmail, null, null, "active", null]
      );
      clientIdMap[bc._id] = clientId;
      migrated++;
    } catch (err) {
      console.error(`  ❌ Client ${clientEmail}: ${err.message}`);
    }
  }

  console.log(`  ✅ Clients: ${migrated} migrated, ${skipped} skipped`);
  return clientIdMap;
}

// ─── Migration: Clients from Scraped Data (with full fields) ─────

async function migrateScrapedClients(userEmailMap) {
  console.log("\n📦 Migrating Scraped Clients (with names/phones)...");

  // The scraped data file (if exists)
  const scrapedPath = path.join(EXPORT_DIR, "scraped_clients.json");
  if (!fs.existsSync(scrapedPath)) {
    console.log("  ⚠️ No scraped_clients.json found, skipping enrichment");
    return;
  }

  const scraped = JSON.parse(fs.readFileSync(scrapedPath, "utf-8"));
  let updated = 0;

  for (const sc of scraped) {
    if (!sc.email) continue;

    // Find the owner user by client_to email
    const ownerEmail = sc.client_to?.toLowerCase();
    const ownerId = userEmailMap[ownerEmail];

    try {
      // Update existing client or insert new one
      const result = await query(
        `UPDATE clients SET
           name = COALESCE(NULLIF($1, ''), name),
           phone = COALESCE(NULLIF($2, ''), phone),
           notes = COALESCE(NULLIF($3, ''), notes),
           user_id = COALESCE($4, user_id)
         WHERE email = $5
         RETURNING id`,
        [sc.client_name, sc.clinte_phone, sc.note, ownerId, sc.email]
      );
      if (result.rows.length > 0) updated++;
    } catch (err) {
      // Ignore update errors
    }
  }

  console.log(`  ✅ Updated ${updated} clients with scraped data`);
}

// ─── Migration: Documents (Client_docs) ──────────────────────────

async function migrateDocuments(userIdMap, clientIdMap) {
  console.log("\n📦 Migrating Documents...");
  const bubbleDocs = loadJSON("all_docs.json");

  let migrated = 0;
  let skipped = 0;

  for (const bd of bubbleDocs) {
    const ownerId = userIdMap[bd.owner] || userIdMap[bd["Created By"]];
    if (!ownerId) {
      // Try to find by any user
      const anyUser = await query("SELECT id FROM users LIMIT 1");
      if (!anyUser.rows[0]) { skipped++; continue; }
    }

    const userId = ownerId || (await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1")).rows[0]?.id;
    if (!userId) { skipped++; continue; }

    const clientId = clientIdMap[bd.client] || null;
    const title = bd["Template Name"] || "Untitled Document";
    const description = bd.Description || null;
    const content = bd["Rech Text"] || null;
    const fileUrl = bd["Template File"] || null;
    const createdAt = parseBubbleDate(bd["Created Date"]);
    const shareToken = crypto.randomBytes(16).toString("hex");

    const docId = generateUUID();
    try {
      await query(
        `INSERT INTO documents (id, user_id, client_id, title, doc_type, content, file_url, status, share_token, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [docId, userId, clientId, title, "file", content, fileUrl, "draft", shareToken, createdAt || new Date().toISOString()]
      );
      migrated++;
    } catch (err) {
      console.error(`  ❌ Doc "${title}": ${err.message}`);
    }
  }

  console.log(`  ✅ Documents: ${migrated} migrated, ${skipped} skipped`);
}

// ─── Migration: Company Profiles ─────────────────────────────────

async function migrateCompanyProfiles(userIdMap) {
  console.log("\n📦 Migrating Company Profiles...");
  const profiles = loadJSON("company_profiles.json");

  let migrated = 0;

  for (const cp of profiles) {
    const userId = userIdMap[cp["Created By"]];
    if (!userId) continue;

    // Check if profile already exists for this user
    const existing = await query("SELECT id FROM profiles WHERE user_id = $1", [userId]);
    if (existing.rows.length > 0) {
      // Update existing profile
      try {
        await query(
          `UPDATE profiles SET
             company_name = COALESCE($1, company_name),
             logo_url = COALESCE($2, logo_url),
             phone_public = COALESCE($3, phone_public),
             website = COALESCE($4, website),
             updated_at = NOW()
           WHERE user_id = $5`,
          [
            cp["business name "]?.trim(),
            cp["business logo"] ? `https:${cp["business logo"]}` : null,
            cp["phone number"] || null,
            cp["company website "]?.trim() || null,
            userId
          ]
        );
        migrated++;
      } catch (err) {
        console.error(`  ❌ Profile update: ${err.message}`);
      }
      continue;
    }

    // Create new profile
    const profileId = generateUUID();
    const username = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      await query(
        `INSERT INTO profiles (id, user_id, username, company_name, logo_url, phone_public, website, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          profileId,
          userId,
          username,
          cp["business name "]?.trim() || null,
          cp["business logo"] ? `https:${cp["business logo"]}` : null,
          cp["phone number"] || null,
          cp["company website "]?.trim() || null,
        ]
      );
      migrated++;
    } catch (err) {
      console.error(`  ❌ Profile: ${err.message}`);
    }
  }

  console.log(`  ✅ Company Profiles: ${migrated} migrated`);
}

// ─── Migration: Subscriptions ────────────────────────────────────

async function migrateSubscriptions(userIdMap) {
  console.log("\n📦 Migrating Subscriptions...");
  const subs = loadJSON("all_subs.json");

  let migrated = 0;
  let skipped = 0;

  for (const bs of subs) {
    const userId = userIdMap[bs["Created By"]];
    if (!userId) { skipped++; continue; }

    // Map Bubble plan names to our plan names
    const bubblePlan = bs.plan || "free";
    let plan = "free";
    if (bubblePlan.toLowerCase().includes("premium")) plan = "premium";
    else if (bubblePlan.toLowerCase().includes("basic")) plan = "basic";
    else if (bubblePlan.toLowerCase().includes("pro")) plan = "pro";

    const isActive = bs["sub active?"] === true;
    const stripeCustomerId = bs["id_customer "]?.trim() || null;
    const stripeSubId = bs["id_subscription "]?.trim() || null;

    try {
      await query(
        `INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           plan = EXCLUDED.plan,
           status = EXCLUDED.status,
           stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
           stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
           updated_at = NOW()`,
        [
          generateUUID(),
          userId,
          stripeCustomerId,
          stripeSubId,
          plan,
          isActive ? "active" : "inactive",
          parseBubbleDate(bs["Created Date"]) || new Date().toISOString(),
        ]
      );
      migrated++;
    } catch (err) {
      console.error(`  ❌ Sub: ${err.message}`);
      skipped++;
    }
  }

  console.log(`  ✅ Subscriptions: ${migrated} migrated, ${skipped} skipped`);
}

// ─── Main Migration ──────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Bubble → Railway Migration");
  console.log("═══════════════════════════════════════\n");

  // Test connection
  try {
    const res = await query("SELECT NOW() as time, current_database() as db");
    console.log(`✅ Connected to: ${res.rows[0].db} at ${res.rows[0].time}`);
  } catch (err) {
    console.error("❌ Cannot connect to database:", err.message);
    process.exit(1);
  }

  // Check for existing data
  const existingUsers = await query("SELECT count(*) FROM users");
  const existingClients = await query("SELECT count(*) FROM clients");
  console.log(`\n📊 Current DB state: ${existingUsers.rows[0].count} users, ${existingClients.rows[0].count} clients`);

  // Run migrations in order
  const { userIdMap, userEmailMap } = await migrateUsers();
  const clientIdMap = await migrateClients(userEmailMap);
  await migrateScrapedClients(userEmailMap);
  await migrateDocuments(userIdMap, clientIdMap);
  await migrateCompanyProfiles(userIdMap);
  await migrateSubscriptions(userIdMap);

  // Final stats
  console.log("\n═══════════════════════════════════════");
  console.log("📊 Final Database State:");
  const tables = ["users", "clients", "documents", "profiles", "subscriptions"];
  for (const t of tables) {
    const res = await query(`SELECT count(*) FROM ${t}`);
    console.log(`  ${t}: ${res.rows[0].count} records`);
  }

  console.log("\n✅ Migration complete!");
  await pool.end();
}

main().catch((err) => {
  console.error("💥 Migration failed:", err);
  pool.end();
  process.exit(1);
});
