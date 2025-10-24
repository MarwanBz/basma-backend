import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function restoreData() {
  try {
    const backupFile = "backup-data.json";

    if (!fs.existsSync(backupFile)) {
      console.error("❌ backup-data.json not found!");
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
    console.log("📦 Starting data restoration...\n");

    // Step 1: Restore users first (no dependencies)
    if (data.users && data.users.length > 0) {
      for (const user of data.users) {
        await prisma.user.upsert({
          where: { id: user.id },
          update: user,
          create: user,
        });
      }
      console.log(`✅ Restored ${data.users.length} users`);
    }

    // Step 2: Restore request_categories (no dependencies)
    if (data.request_categories && data.request_categories.length > 0) {
      for (const category of data.request_categories) {
        await prisma.request_category.upsert({
          where: { id: category.id },
          update: category,
          create: category,
        });
      }
      console.log(
        `✅ Restored ${data.request_categories.length} request categories`
      );
    }

    // Step 3: Restore building_configs (depends on users)
    if (data.building_configs && data.building_configs.length > 0) {
      for (const config of data.building_configs) {
        await prisma.building_config.upsert({
          where: { id: config.id },
          update: config,
          create: config,
        });
      }
      console.log(
        `✅ Restored ${data.building_configs.length} building configs`
      );
    }

    // Step 4: Restore request_identifiers (depends on users)
    if (data.request_identifiers && data.request_identifiers.length > 0) {
      for (const identifier of data.request_identifiers) {
        await prisma.request_identifier.upsert({
          where: { id: identifier.id },
          update: identifier,
          create: identifier,
        });
      }
      console.log(
        `✅ Restored ${data.request_identifiers.length} request identifiers`
      );
    }

    // Step 5: Restore maintenance_requests (depends on users, categories, identifiers)
    if (data.maintenance_requests && data.maintenance_requests.length > 0) {
      for (const request of data.maintenance_requests) {
        await prisma.maintenance_request.upsert({
          where: { id: request.id },
          update: request,
          create: request,
        });
      }
      console.log(
        `✅ Restored ${data.maintenance_requests.length} maintenance requests`
      );
    }

    // Step 6: Restore request_comments (depends on requests and users)
    if (data.request_comments && data.request_comments.length > 0) {
      for (const comment of data.request_comments) {
        await prisma.request_comment.upsert({
          where: { id: comment.id },
          update: comment,
          create: comment,
        });
      }
      console.log(
        `✅ Restored ${data.request_comments.length} request comments`
      );
    }

    // Step 7: Restore request_status_history (depends on requests and users)
    if (data.request_status_history && data.request_status_history.length > 0) {
      for (const history of data.request_status_history) {
        await prisma.request_status_history.upsert({
          where: { id: history.id },
          update: history,
          create: history,
        });
      }
      console.log(
        `✅ Restored ${data.request_status_history.length} status history records`
      );
    }

    // Step 8: Restore request_assignment_history (depends on requests and users)
    if (
      data.request_assignment_history &&
      data.request_assignment_history.length > 0
    ) {
      for (const assignment of data.request_assignment_history) {
        await prisma.request_assignment_history.upsert({
          where: { id: assignment.id },
          update: assignment,
          create: assignment,
        });
      }
      console.log(
        `✅ Restored ${data.request_assignment_history.length} assignment history records`
      );
    }

    // Step 9: Restore file_attachments (depends on users)
    if (data.file_attachments && data.file_attachments.length > 0) {
      for (const attachment of data.file_attachments) {
        await prisma.file_attachment.upsert({
          where: { id: attachment.id },
          update: attachment,
          create: attachment,
        });
      }
      console.log(
        `✅ Restored ${data.file_attachments.length} file attachments`
      );
    }

    console.log("\n✨ Data restoration completed successfully!");
    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error during restoration:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

restoreData().catch(console.error);
