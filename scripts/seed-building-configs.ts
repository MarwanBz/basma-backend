#!/usr/bin/env node

/**
 * Building Configuration Seeding Script for Basma Backend
 *
 * This script creates default building configurations with proper identifier patterns
 * and provides sample data for testing the custom identifier system.
 *
 * Usage: npx ts-node scripts/seed-building-configs.ts
 *
 * Prerequisites:
 * - Backend server must be running on localhost:4300
 * - Super Admin user must exist with credentials: superadmin@basma.com / SuperAdmin123!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default building configurations
 */
const DEFAULT_BUILDINGS = [
  {
    buildingName: 'A',
    buildingCode: 'A',
    displayName: 'Building A',
    allowCustomId: false,
    currentSequence: 0,
  },
  {
    buildingName: 'B',
    buildingCode: 'B',
    displayName: 'Building B',
    allowCustomId: false,
    currentSequence: 0,
  },
  {
    buildingName: 'ABRAJ-1',
    buildingCode: 'ABRAJ1',
    displayName: 'برج اول / Tower One',
    allowCustomId: true, // Allow custom identifiers for this building
    currentSequence: 0,
  },
  {
    buildingName: 'ABRAJ-2',
    buildingCode: 'ABRAJ2',
    displayName: 'برج ثاني / Tower Two',
    allowCustomId: true,
    currentSequence: 0,
  },
  {
    buildingName: 'MAIN',
    buildingCode: 'MAIN',
    displayName: 'Main Building',
    allowCustomId: false,
    currentSequence: 0,
  },
  {
    buildingName: 'LIBRARY',
    buildingCode: 'LIB',
    displayName: 'Library Building',
    allowCustomId: false,
    currentSequence: 0,
  },
  {
    buildingName: 'SCIENCE',
    buildingCode: 'SCI',
    displayName: 'Science Building',
    allowCustomId: false,
    currentSequence: 0,
  },
  {
    buildingName: 'SPORTS',
    buildingCode: 'SPORT',
    displayName: 'Sports Complex',
    allowCustomId: false,
    currentSequence: 0,
  },
];

/**
 * Get or create SUPER_ADMIN user for system operations
 */
async function getSystemAdmin() {
  let adminUser = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!adminUser) {
    console.log('❌ No SUPER_ADMIN user found. Please create one first.');
    console.log('💡 Run: npx ts-node scripts/create-super-admin.ts');
    return null;
  }

  return adminUser;
}

/**
 * Create building configurations
 */
async function createBuildingConfigs(adminUserId: string) {
  console.log('🏗️  Creating building configurations...\n');

  const createdBuildings = [];

  for (const building of DEFAULT_BUILDINGS) {
    try {
      // Check if building already exists
      const existingBuilding = await prisma.building_config.findUnique({
        where: { buildingName: building.buildingName },
      });

      if (existingBuilding) {
        console.log(`⚠️  Building "${building.buildingName}" already exists. Skipping...`);
        createdBuildings.push(existingBuilding);
        continue;
      }

      // Create new building configuration
      const newBuilding = await prisma.building_config.create({
        data: {
          ...building,
          createdBy: adminUserId,
          lastResetYear: new Date().getFullYear(),
        },
      });

      console.log(`✅ Created building: ${newBuilding.buildingName} (${newBuilding.buildingCode})`);
      createdBuildings.push(newBuilding);

    } catch (error) {
      console.error(`❌ Failed to create building "${building.buildingName}":`, error);
    }
  }

  return createdBuildings;
}

/**
 * Create sample request identifiers for demonstration
 */
async function createSampleIdentifiers(buildings: any[]) {
  console.log('\n🔢 Creating sample request identifiers...\n');

  const currentYear = new Date().getFullYear();

  for (const building of buildings) {
    try {
      // Create a few sample identifiers for each building
      const sampleIdentifiers = [
        {
          identifier: `${currentYear.toString().slice(-2)}-${building.buildingCode}-001`,
          building: building.buildingName,
          year: currentYear,
          sequence: 1,
          isActive: true,
          createdBy: building.createdBy,
        },
        {
          identifier: `${currentYear.toString().slice(-2)}-${building.buildingCode}-002`,
          building: building.buildingName,
          year: currentYear,
          sequence: 2,
          isActive: true,
          createdBy: building.createdBy,
        },
      ];

      // Create custom identifiers for buildings that allow them
      if (building.allowCustomId) {
        sampleIdentifiers.push({
          identifier: `${building.buildingName}-CUSTOM-001`,
          building: building.buildingName,
          year: currentYear,
          sequence: 0, // 0 indicates custom identifier
          isActive: true,
          createdBy: building.createdBy,
          customSequence: 0,
        });
      }

      for (const identifierData of sampleIdentifiers) {
        try {
          const existingIdentifier = await prisma.request_identifier.findUnique({
            where: { identifier: identifierData.identifier },
          });

          if (existingIdentifier) {
            console.log(`⚠️  Identifier "${identifierData.identifier}" already exists. Skipping...`);
            continue;
          }

          const newIdentifier = await prisma.request_identifier.create({
            data: identifierData,
          });

          console.log(`✅ Created identifier: ${newIdentifier.identifier}`);
        } catch (error) {
          if (error.message.includes('Unique constraint')) {
            console.log(`⚠️  Identifier "${identifierData.identifier}" already exists. Skipping...`);
          } else {
            console.error(`❌ Failed to create identifier "${identifierData.identifier}":`, error);
          }
        }
      }

      // Update building sequence
      await prisma.building_config.update({
        where: { id: building.id },
        data: { currentSequence: 2 }, // Set to 2 since we created 2 sample identifiers
      });

    } catch (error) {
      console.error(`❌ Failed to create identifiers for building "${building.buildingName}":`, error);
    }
  }
}

/**
 * Update existing maintenance requests with custom identifiers
 */
async function updateExistingRequests() {
  console.log('\n📝 Updating existing maintenance requests with custom identifiers...\n');

  const currentYear = new Date().getFullYear();

  try {
    // Get all existing requests without custom identifiers
    const existingRequests = await prisma.maintenance_request.findMany({
      where: {
        customIdentifier: null,
        building: { not: null },
      },
      take: 10, // Process first 10 requests as samples
    });

    console.log(`Found ${existingRequests.length} requests to update...\n`);

    for (const request of existingRequests) {
      try {
        // Get or create building config
        const buildingConfig = await prisma.building_config.findUnique({
          where: { buildingName: request.building },
        });

        if (!buildingConfig) {
          console.log(`⚠️  No building config found for "${request.building}". Skipping request ${request.id}...`);
          continue;
        }

        // Generate identifier
        const sequence = buildingConfig.currentSequence + 1;
        const yearShort = currentYear.toString().slice(-2);
        const identifier = `${yearShort}-${buildingConfig.buildingCode}-${sequence.toString().padStart(3, '0')}`;

        // Update request with custom identifier
        await prisma.maintenance_request.update({
          where: { id: request.id },
          data: { customIdentifier: identifier },
        });

        // Create identifier record
        await prisma.request_identifier.create({
          data: {
            identifier,
            building: request.building,
            year: currentYear,
            sequence,
            isActive: true,
            createdBy: 'system',
          },
        });

        // Update building sequence
        await prisma.building_config.update({
          where: { id: buildingConfig.id },
          data: { currentSequence: sequence },
        });

        console.log(`✅ Updated request ${request.id} with identifier: ${identifier}`);

      } catch (error) {
        console.error(`❌ Failed to update request ${request.id}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Failed to update existing requests:', error);
  }
}

/**
 * Display summary and next steps
 */
function displaySummary(buildings: any[]) {
  console.log('\n🎉 Building configuration seeding completed successfully!');
  console.log('================================================\n');

  console.log('📊 Summary:');
  console.log('==========');
  console.log(`✅ Created/verified ${buildings.length} building configurations`);
  console.log('✅ Created sample request identifiers');
  console.log('✅ Updated existing maintenance requests\n');

  console.log('🏢 Building Configurations:');
  console.log('==========================');
  buildings.forEach((building) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const nextId = `${year}-${building.buildingCode}-001`;
    const customSupport = building.allowCustomId ? '✅' : '❌';
    console.log(`📍 ${building.buildingName} (${building.buildingCode})`);
    console.log(`   Display: ${building.displayName}`);
    console.log(`   Next ID: ${nextId}`);
    console.log(`   Custom IDs: ${customSupport}`);
    console.log('');
  });

  console.log('🚀 Ready to Test:');
  console.log('=================');
  console.log('1. Create a new maintenance request with building field');
  console.log('2. Check the auto-generated customIdentifier in response');
  console.log('3. Use admin account to test custom identifier creation');
  console.log('4. Test building management APIs at /api/building-configs');
  console.log('');

  console.log('💡 API Examples:');
  console.log('=================');
  console.log('POST /api/requests');
  console.log('  { "title": "Fix elevator", "building": "ABRAJ-1", ... }');
  console.log('');
  console.log('POST /api/requests (Admin with custom ID)');
  console.log('  { "title": "Emergency repair", "building": "ABRAJ-1", "customIdentifier": "ABRAJ-1-EMERGENCY-001", ... }');
  console.log('');
  console.log('GET /api/building-configs/ABRAJ-1/next-identifier');
  console.log('  Response: { "nextIdentifier": "25-ABRAJ1-001" }');
}

/**
 * Main seeding function
 */
async function seedBuildingConfigs() {
  console.log('🚀 Basma Backend - Building Configuration Seeding');
  console.log('================================================\n');

  try {
    // Step 1: Get system admin
    console.log('🔐 Looking for system administrator...');
    const adminUser = await getSystemAdmin();

    if (!adminUser) {
      process.exit(1);
    }

    console.log(`✅ Found admin: ${adminUser.email}\n`);

    // Step 2: Create building configurations
    const buildings = await createBuildingConfigs(adminUser.id);

    if (buildings.length === 0) {
      console.log('⚠️  No buildings were created. Existing configurations found.\n');
      return;
    }

    // Step 3: Create sample identifiers
    await createSampleIdentifiers(buildings);

    // Step 4: Update existing requests
    await updateExistingRequests();

    // Step 5: Display summary
    displaySummary(buildings);

  } catch (error) {
    console.error('💥 Seeding failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure database is connected and migrations are up to date');
    console.log('2. Check that Prisma client is generated: npx prisma generate');
    console.log('3. Verify SUPER_ADMIN user exists');
    console.log('4. Make sure backend server is not running (this script uses direct DB access)');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedBuildingConfigs().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});