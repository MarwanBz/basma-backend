#!/usr/bin/env ts-node

/**
 * Script to create a custom Super Admin user
 * Run with: npx ts-node scripts/create-custom-super-admin.ts
 */

import { SuperAdminService } from "../src/services/super-admin.service";

async function createCustomSuperAdmin() {
  console.log("👑 Creating Custom Super Admin user...\n");

  try {
    const superAdminService = new SuperAdminService();

    const superAdmin = await superAdminService.createUser({
      name: "Kaka Mer",
      email: "kaka.mer1998@gmail.com",
      password: "770108459",
      role: "SUPER_ADMIN",
    });

    console.log("✅ Super Admin created successfully!");
    console.log("📧 Email:", superAdmin.email);
    console.log("👤 Name:", superAdmin.name);
    console.log("🔑 Role:", superAdmin.role);
    console.log("🆔 ID:", superAdmin.id);
    console.log("\n🔐 Login credentials:");
    console.log("Email: kaka.mer1998@gmail.com");
    console.log("Password: 770108459");
    console.log(
      "\n📝 You can now use these credentials to test the Super Admin API endpoints."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Email already exists")
    ) {
      console.log("⚠️ Super Admin user already exists!");
      console.log("📧 Email: kaka.mer1998@gmail.com");
      console.log("🔐 Password: 770108459");
    } else {
      console.error("❌ Failed to create Super Admin:", error);
    }
  }
}

// Run the script
createCustomSuperAdmin().catch(console.error);


