/**
 * seed-users.ts
 * Creates 4 demo auth users + profiles, then runs seed.sql for demo data.
 *
 * Usage: npx tsx scripts/seed-users.ts
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in environment or .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface DemoUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: "owner" | "branch_manager" | "loan_officer" | "cashier";
  branch_id: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: "owner@bensonanson.loans",
    password: "Demo@2026",
    full_name: "Benson Anson",
    phone: "+260 977 000001",
    role: "owner",
    branch_id: "b0000000-0000-0000-0000-000000000001",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    email: "manager@bensonanson.loans",
    password: "Demo@2026",
    full_name: "Grace Mwanza",
    phone: "+260 977 000002",
    role: "branch_manager",
    branch_id: "b0000000-0000-0000-0000-000000000001",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    email: "officer@bensonanson.loans",
    password: "Demo@2026",
    full_name: "Patrick Chilufya",
    phone: "+260 977 000003",
    role: "loan_officer",
    branch_id: "b0000000-0000-0000-0000-000000000001",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    email: "cashier@bensonanson.loans",
    password: "Demo@2026",
    full_name: "Esther Banda",
    phone: "+260 977 000004",
    role: "cashier",
    branch_id: "b0000000-0000-0000-0000-000000000001",
  },
];

async function createAuthUsers() {
  console.log("Creating demo auth users...");

  for (const user of DEMO_USERS) {
    // Check if user already exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing?.users?.some(
      (u) => u.email === user.email
    );

    if (alreadyExists) {
      console.log(`  User ${user.email} already exists, skipping.`);
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
      },
    });

    if (error) {
      console.error(`  Failed to create ${user.email}:`, error.message);
    } else {
      console.log(`  Created user: ${user.email} (${user.role})`);
    }
  }
}

async function createProfiles() {
  console.log("\nCreating user profiles...");

  for (const user of DEMO_USERS) {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        branch_id: user.branch_id,
        is_active: true,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error(
        `  Failed to create profile for ${user.email}:`,
        error.message
      );
    } else {
      console.log(`  Profile created: ${user.full_name} (${user.role})`);
    }
  }
}

async function runSeedSql() {
  console.log("\nRunning seed.sql for demo data...");

  const seedPath = resolve(__dirname, "../supabase/seed.sql");
  let sql: string;
  try {
    sql = readFileSync(seedPath, "utf-8");
  } catch {
    console.log("  seed.sql not found, skipping demo data.");
    return;
  }

  // Split by semicolons and execute each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  let successCount = 0;
  let errorCount = 0;

  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc("exec_sql", {
        query: stmt + ";",
      });
      // If exec_sql doesn't exist, try direct query via rest
      if (error && error.message.includes("function")) {
        console.log(
          "  exec_sql not available. Use Supabase SQL Editor to run seed.sql."
        );
        return;
      }
      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    } catch {
      errorCount++;
    }
  }

  console.log(
    `  Seed complete: ${successCount} succeeded, ${errorCount} failed.`
  );
}

async function main() {
  console.log("=== Benson Anson Loans — Demo Seed ===\n");

  await createAuthUsers();
  await createProfiles();
  await runSeedSql();

  console.log("\n=== Seed Complete ===");
  console.log("\nDemo login credentials:");
  console.log("  Owner:     owner@bensonanson.loans     / Demo@2026");
  console.log("  Manager:   manager@bensonanson.loans   / Demo@2026");
  console.log("  Officer:   officer@bensonanson.loans   / Demo@2026");
  console.log("  Cashier:   cashier@bensonanson.loans   / Demo@2026");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
