#!/usr/bin/env ts-node

/**
 * Script to create a Super Admin user
 * Run with: npx ts-node scripts/create-super-admin.ts
 */

import { SuperAdminService } from "../src/services/super-admin.service";

async function createSuperAdmin() {
  console.log("👑 Creating Super Admin user...\n");

  try {
    const superAdminService = new SuperAdminService();

    const superAdmin = await superAdminService.createUser({
      name: "Super Admin",
      email: "superadmin@basma.com",
      password: "SuperAdmin123!",
      role: "SUPER_ADMIN",
    });

    console.log("✅ Super Admin created successfully!");
    console.log("📧 Email:", superAdmin.email);
    console.log("👤 Name:", superAdmin.name);
    console.log("🔑 Role:", superAdmin.role);
    console.log("🆔 ID:", superAdmin.id);
    console.log("\n🔐 Login credentials:");
    console.log("Email: superadmin@basma.com");
    console.log("Password: SuperAdmin123!");
    console.log(
      "\n📝 You can now use these credentials to test the Super Admin API endpoints."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Email already exists")
    ) {
      console.log("⚠️ Super Admin user already exists!");
      console.log("📧 Email: superadmin@basma.com");
      console.log("🔐 Password: SuperAdmin123!");
    } else {
      console.error("❌ Failed to create Super Admin:", error);
    }
  }
}

// Run the script
createSuperAdmin().catch(console.error);
