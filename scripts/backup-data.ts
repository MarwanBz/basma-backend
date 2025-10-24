import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function backupData() {
  const data = {
    users: await prisma.user.findMany(),
    request_categories: await prisma.request_category.findMany(),
    maintenance_requests: await prisma.maintenance_request.findMany(),
    request_comments: await prisma.request_comment.findMany(),
    request_status_history: await prisma.request_status_history.findMany(),
    request_assignment_history: await prisma.request_assignment_history.findMany(),
    request_identifiers: await prisma.request_identifier.findMany(),
    building_configs: await prisma.building_config.findMany(),
    file_attachments: await prisma.file_attachment.findMany(),
  };

  fs.writeFileSync('backup-data.json', JSON.stringify(data, null, 2));
  console.log('✅ Data backed up to backup-data.json');
  await prisma.$disconnect();
}

backupData().catch(console.error);
