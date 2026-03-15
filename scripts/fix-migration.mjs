/**
 * Fix migration:
 * 1. Create subscriptions based on Bubble user levels
 * 2. Enrich client data with names from Bubble user mapping
 */

import pg from "pg";
import fs from "fs";
import crypto from "crypto";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:nlDdNkvCFawXBdJFHeYpxSGZzcMzNtZr@interchange.proxy.rlwy.net:36155/railway";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 15000,
});

async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ─── Fix 1: Create subscriptions from user levels ────────────────

async function fixSubscriptions() {
  console.log("\n📦 Creating subscriptions based on Bubble user levels...");

  const bubbleUsers = JSON.parse(fs.readFileSync("/tmp/bubble_export/all_users.json", "utf-8"));

  // Build a map of email → user level
  const userLevelMap = {};
  for (const bu of bubbleUsers) {
    const email = bu.authentication?.email?.email?.toLowerCase();
    if (email) {
      userLevelMap[email] = bu["User level"] || "free";
    }
  }

  // Get all migrated users
  const users = await query("SELECT id, email FROM users");
  let created = 0;

  for (const user of users.rows) {
    // Check if subscription already exists
    const existing = await query("SELECT id FROM subscriptions WHERE user_id = $1", [user.id]);
    if (existing.rows.length > 0) continue;

    const bubbleLevel = userLevelMap[user.email] || "free";
    let plan = "free";
    if (bubbleLevel.toLowerCase().includes("premium")) plan = "premium";
    else if (bubbleLevel.toLowerCase().includes("basic")) plan = "basic";
    else if (bubbleLevel.toLowerCase().includes("admin")) plan = "premium"; // admin gets premium

    try {
      await query(
        `INSERT INTO subscriptions (id, user_id, plan, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [crypto.randomUUID(), user.id, plan, "active"]
      );
      created++;
    } catch (err) {
      // ignore
    }
  }

  console.log(`  ✅ Created ${created} subscriptions`);
}

// ─── Fix 2: Enrich clients with names from owner-client mapping ──

async function enrichClients() {
  console.log("\n📦 Enriching client names...");

  // The clients API only gave us email. But some client emails match user emails.
  // For those, we can use the user's name as the client name.
  const bubbleUsers = JSON.parse(fs.readFileSync("/tmp/bubble_export/all_users.json", "utf-8"));

  const userNameMap = {};
  for (const bu of bubbleUsers) {
    const email = bu.authentication?.email?.email?.toLowerCase();
    if (email) {
      const name = [bu.First_name, (bu["last_name "] || "").trim()].filter(Boolean).join(" ");
      if (name) userNameMap[email] = name;
    }
  }

  // Update clients where name is just an email
  const clients = await query("SELECT id, email, name FROM clients WHERE name = email OR name = 'Unknown' OR name LIKE '%@%'");
  let updated = 0;

  for (const client of clients.rows) {
    const email = client.email?.toLowerCase();
    const userName = userNameMap[email];
    if (userName) {
      await query("UPDATE clients SET name = $1 WHERE id = $2", [userName, client.id]);
      updated++;
    }
  }

  console.log(`  ✅ Enriched ${updated} client names`);
}

// ─── Fix 3: Set proper client ownership ──────────────────────────

async function fixClientOwnership() {
  console.log("\n📦 Fixing client ownership...");

  // From the Bubble docs data, we know client_to = owner, and owner = the user who created the client
  // The docs have "owner" field with Bubble user ID
  // Let me map docs to their owner and assign clients accordingly

  const docs = JSON.parse(fs.readFileSync("/tmp/bubble_export/all_docs.json", "utf-8"));
  const bubbleUsers = JSON.parse(fs.readFileSync("/tmp/bubble_export/all_users.json", "utf-8"));
  const bubbleClients = JSON.parse(fs.readFileSync("/tmp/bubble_export/all_clients_api.json", "utf-8"));

  // Build bubble user ID → email map
  const bubbleIdToEmail = {};
  for (const bu of bubbleUsers) {
    const email = bu.authentication?.email?.email?.toLowerCase();
    if (email) bubbleIdToEmail[bu._id] = email;
  }

  // From docs: find which owner created which client
  const clientOwnerMap = {}; // client bubble_id → owner email
  for (const doc of docs) {
    const ownerBubbleId = doc.owner;
    const clientBubbleId = doc.client;
    if (ownerBubbleId && clientBubbleId) {
      const ownerEmail = bubbleIdToEmail[ownerBubbleId];
      if (ownerEmail) {
        clientOwnerMap[clientBubbleId] = ownerEmail;
      }
    }
  }

  // Now update client ownership
  let updated = 0;
  for (const bc of bubbleClients) {
    const ownerEmail = clientOwnerMap[bc._id];
    if (!ownerEmail) continue;

    const ownerUser = await query("SELECT id FROM users WHERE email = $1", [ownerEmail]);
    if (!ownerUser.rows[0]) continue;

    const clientEmail = bc.email?.toLowerCase();
    if (!clientEmail) continue;

    const result = await query(
      "UPDATE clients SET user_id = $1 WHERE email = $2 AND user_id != $1",
      [ownerUser.rows[0].id, clientEmail]
    );
    if (result.rowCount > 0) updated++;
  }

  console.log(`  ✅ Fixed ownership for ${updated} clients`);
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 Fixing Migration Data");
  console.log("═══════════════════════════════════════\n");

  await fixSubscriptions();
  await enrichClients();
  await fixClientOwnership();

  // Final stats
  console.log("\n═══════════════════════════════════════");
  console.log("📊 Final Database State:");
  for (const t of ["users", "clients", "documents", "profiles", "subscriptions"]) {
    const res = await query(`SELECT count(*) FROM ${t}`);
    console.log(`  ${t}: ${res.rows[0].count} records`);
  }

  // Show subscription plan distribution
  const planDist = await query("SELECT plan, count(*) FROM subscriptions GROUP BY plan ORDER BY count DESC");
  console.log("\n  Subscription plans:");
  for (const r of planDist.rows) {
    console.log(`    ${r.plan}: ${r.count}`);
  }

  console.log("\n✅ Fix complete!");
  await pool.end();
}

main().catch((err) => {
  console.error("💥 Fix failed:", err);
  pool.end();
  process.exit(1);
});
