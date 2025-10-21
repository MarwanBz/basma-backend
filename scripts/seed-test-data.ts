#!/usr/bin/env ts-node

/**
 * Comprehensive Test Data Seeding Script
 * Creates test users, categories, and maintenance requests
 * Preserves existing admin users
 *
 * Run with: npx ts-node scripts/seed-test-data.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Test users data
const testUsers = [
  {
    name: "أحمد محمد",
    email: "ahmed.mohamed@test.com",
    password: "Ahmed123!",
    role: "TECHNICIAN" as const,
  },
  {
    name: "فاطمة علي",
    email: "fatima.ali@test.com",
    password: "Fatima123!",
    role: "TECHNICIAN" as const,
  },
  {
    name: "محمد السيد",
    email: "mohamed.elsayed@test.com",
    password: "Mohamed123!",
    role: "CUSTOMER" as const,
  },
  {
    name: "نورا أحمد",
    email: "nora.ahmed@test.com",
    password: "Nora123!",
    role: "CUSTOMER" as const,
  },
  {
    name: "خالد محمود",
    email: "khaled.mahmoud@test.com",
    password: "Khaled123!",
    role: "BASMA_ADMIN" as const,
  },
  {
    name: "سارة حسن",
    email: "sara.hassan@test.com",
    password: "Sara123!",
    role: "MAINTENANCE_ADMIN" as const,
  },
];

// Request categories data
const categories = [
  {
    name: "سباكة",
    description: "تسريبات المياه، انسدادات، إصلاح الصنابير والمراحيض",
  },
  {
    name: "كهرباء",
    description: "مشاكل الكهرباء، الإضاءة، المفاتيح والمقابس",
  },
  {
    name: "تكييف وتدفئة",
    description: "صيانة وإصلاح أنظمة التكييف والتدفئة والتهوية",
  },
  {
    name: "أعمال إنشائية",
    description: "إصلاح الجدران، الأرضيات، الأسقف، الدهانات",
  },
  {
    name: "نجارة",
    description: "إصلاح الأبواب، النوافذ، الخزائن، الأثاث الخشبي",
  },
  {
    name: "أمن وسلامة",
    description: "الأقفال، أنظمة الإنذار، كاميرات المراقبة، أنظمة الدخول",
  },
  {
    name: "نظافة",
    description: "التنظيف العام، التنظيف العميق، إزالة القمامة",
  },
  {
    name: "مصاعد",
    description: "صيانة وإصلاح المصاعد وأنظمة الحركة",
  },
  {
    name: "حدائق",
    description: "صيانة الحدائق، قص العشب، تشذيب الأشجار",
  },
  {
    name: "تسربات",
    description: "كشف وإصلاح تسربات المياه والرطوبة",
  },
  {
    name: "زجاج ونوافذ",
    description: "إصلاح واستبدال الزجاج والنوافذ",
  },
  {
    name: "طوارئ",
    description: "حالات الطوارئ التي تتطلب اهتماماً فورياً",
  },
  {
    name: "أخرى",
    description: "طلبات صيانة أخرى غير مصنفة",
  },
];

// Sample maintenance requests
const maintenanceRequests = [
  {
    title: "تسرب مياه في المطبخ",
    description: "يوجد تسرب مياه تحت حوض المطبخ، يسبب تلف في الخشب",
    priority: "HIGH" as const,
    status: "SUBMITTED" as const,
    location: "الطابق الأول - شقة 101",
    building: "المبنى أ",
    specificLocation: "المطبخ",
    estimatedCost: 150.0,
  },
  {
    title: "مشكلة في المصعد",
    description: "المصعد لا يعمل بشكل صحيح، يصدر أصوات غريبة",
    priority: "URGENT" as const,
    status: "ASSIGNED" as const,
    location: "المصعد الرئيسي",
    building: "المبنى ب",
    specificLocation: "المصعد",
    estimatedCost: 500.0,
  },
  {
    title: "إصلاح مفتاح الكهرباء",
    description: "مفتاح الإضاءة في الصالة لا يعمل",
    priority: "MEDIUM" as const,
    status: "IN_PROGRESS" as const,
    location: "الطابق الثاني - شقة 205",
    building: "المبنى أ",
    specificLocation: "الصالة",
    estimatedCost: 75.0,
  },
  {
    title: "تنظيف الحديقة",
    description: "الحديقة تحتاج إلى تنظيف وتشذيب الأشجار",
    priority: "LOW" as const,
    status: "COMPLETED" as const,
    location: "الحديقة الأمامية",
    building: "المبنى أ",
    specificLocation: "الحديقة",
    estimatedCost: 200.0,
    actualCost: 180.0,
  },
  {
    title: "إصلاح الباب الأمامي",
    description: "الباب الأمامي لا يغلق بشكل صحيح",
    priority: "MEDIUM" as const,
    status: "SUBMITTED" as const,
    location: "المدخل الرئيسي",
    building: "المبنى ج",
    specificLocation: "الباب الأمامي",
    estimatedCost: 120.0,
  },
];

async function seedTestData() {
  console.log("🌱 بدء إضافة البيانات التجريبية...");
  console.log("🌱 Starting to seed test data...\n");

  try {
    // Step 1: Create test users
    console.log("👥 Creating test users...");
    const createdUsers = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          console.log(`   ⚠️  User already exists: ${userData.email}`);
          createdUsers.push(existingUser);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            ...userData,
            password: hashedPassword,
            emailVerified: new Date(), // Mark as verified for testing
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        console.log(`   ✅ Created ${userData.role}: ${user.email}`);
        createdUsers.push(user);
      } catch (error) {
        console.log(`   ❌ Failed to create user ${userData.email}:`, error);
      }
    }

    // Step 2: Create categories
    console.log("\n📂 Creating request categories...");
    const createdCategories = [];

    for (const categoryData of categories) {
      try {
        // Check if category already exists
        const existingCategory = await prisma.request_category.findFirst({
          where: { name: categoryData.name },
        });

        if (existingCategory) {
          console.log(`   ⚠️  Category already exists: ${categoryData.name}`);
          createdCategories.push(existingCategory);
          continue;
        }

        const category = await prisma.request_category.create({
          data: categoryData,
        });

        console.log(`   ✅ Created category: ${category.name}`);
        createdCategories.push(category);
      } catch (error) {
        console.log(
          `   ❌ Failed to create category ${categoryData.name}:`,
          error
        );
      }
    }

    // Step 3: Create maintenance requests
    console.log("\n🔧 Creating maintenance requests...");

    // Get some users for creating requests
    const customers = createdUsers.filter((user) => user.role === "CUSTOMER");
    const technicians = createdUsers.filter(
      (user) => user.role === "TECHNICIAN"
    );

    if (customers.length === 0) {
      console.log("   ⚠️  No customers found, skipping maintenance requests");
    } else {
      for (let i = 0; i < maintenanceRequests.length; i++) {
        try {
          const requestData = maintenanceRequests[i];
          const customer = customers[i % customers.length];
          const technician =
            technicians.length > 0 ? technicians[i % technicians.length] : null;
          const category = createdCategories[i % createdCategories.length];

          const request = await prisma.maintenance_request.create({
            data: {
              ...requestData,
              categoryId: category.id,
              requestedById: customer.id,
              assignedToId: technician?.id,
              scheduledDate:
                requestData.status === "ASSIGNED" ||
                requestData.status === "IN_PROGRESS"
                  ? new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000) // Schedule for next days
                  : null,
              completedDate:
                requestData.status === "COMPLETED"
                  ? new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000) // Completed in past
                  : null,
            },
          });

          console.log(`   ✅ Created request: ${request.title}`);
        } catch (error) {
          console.log(
            `   ❌ Failed to create request ${requestData.title}:`,
            error
          );
        }
      }
    }

    // Step 4: Summary
    console.log("\n🎉 Test data seeding completed!");
    console.log("🎉 تم إضافة البيانات التجريبية بنجاح!");

    console.log("\n📋 Test User Credentials:");
    console.log("=========================");
    testUsers.forEach((user) => {
      console.log(`${user.role}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log("");
    });

    console.log("📊 Database Summary:");
    console.log("===================");
    const userCount = await prisma.user.count();
    const categoryCount = await prisma.request_category.count();
    const requestCount = await prisma.maintenance_request.count();

    console.log(`👥 Total Users: ${userCount}`);
    console.log(`📂 Total Categories: ${categoryCount}`);
    console.log(`🔧 Total Requests: ${requestCount}`);
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedTestData().catch(console.error);
