import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function seedCategories() {
  try {
    console.log("🌱 بدء إضافة الفئات...");
    console.log("🌱 Starting to seed categories...");

    // Check if categories already exist
    const existingCount = await prisma.request_category.count();

    if (existingCount > 0) {
      console.log(`⚠️  يوجد ${existingCount} فئة موجودة بالفعل`);
      console.log(`⚠️  Found ${existingCount} existing categories`);

      const answer = await new Promise<string>((resolve) => {
        const readline = require("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.question(
          "هل تريد حذف الفئات الموجودة وإعادة إنشائها؟ (y/n): ",
          (answer: string) => {
            rl.close();
            resolve(answer);
          }
        );
      });

      if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
        console.log("✅ تم الإلغاء. الفئات الموجودة لم تتغير.");
        console.log("✅ Cancelled. Existing categories unchanged.");
        await prisma.$disconnect();
        return;
      }

      // Delete existing categories
      console.log("🗑️  جاري حذف الفئات الموجودة...");
      console.log("🗑️  Deleting existing categories...");
      await prisma.request_category.deleteMany();
    }

    // Create categories
    console.log(`📝 جاري إضافة ${categories.length} فئة...`);
    console.log(`📝 Creating ${categories.length} categories...`);

    for (const category of categories) {
      await prisma.request_category.create({
        data: category,
      });
      console.log(`   ✓ ${category.name}`);
    }

    // Verify creation
    const finalCount = await prisma.request_category.count();

    console.log("\n✅ تم إضافة الفئات بنجاح!");
    console.log("✅ Categories seeded successfully!");
    console.log(`📊 إجمالي الفئات: ${finalCount}`);
    console.log(`📊 Total categories: ${finalCount}\n`);

    // Display all categories
    console.log("📋 قائمة الفئات:");
    console.log("📋 Categories list:\n");

    const allCategories = await prisma.request_category.findMany({
      orderBy: { id: "asc" },
    });

    allCategories.forEach((cat) => {
      console.log(`   ${cat.id}. ${cat.name} - ${cat.description}`);
    });
  } catch (error) {
    console.error("❌ خطأ في إضافة الفئات:", error);
    console.error("❌ Error seeding categories:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCategories().catch((error) => {
  console.error(error);
  process.exit(1);
});
