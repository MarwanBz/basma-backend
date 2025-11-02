// Load environment variables first
require('dotenv').config();

const fs = require('fs');
const path = require('path');

console.log('🔧 Comprehensive Backend Debug Report\n');
console.log('=====================================\n');

// 1. Check Node.js and npm versions
console.log('1️⃣ Environment Check:');
console.log('Node.js version:', process.version);
console.log('Current working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV);

// 2. Check package.json dependencies
console.log('\n2️⃣ Package Dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  console.log('Express version:', packageJson.dependencies.express);
  console.log('Prisma version:', packageJson.dependencies['@prisma/client']);
  console.log('AWS SDK version:', packageJson.dependencies['aws-sdk']);
  console.log('Multer version:', packageJson.dependencies.multer);
  console.log('TypeScript version:', packageJson.devDependencies.typescript);
} catch (error) {
  console.error('❌ Could not read package.json:', error.message);
}

// 3. Check environment variables
console.log('\n3️⃣ Environment Variables:');
const requiredEnvVars = [
  'DATABASE_URL',
  'HETZNER_ENDPOINT_URL',
  'HETZNER_ACCESS_KEY_ID',
  'HETZNER_SECRET_ACCESS_KEY',
  'HETZNER_BUCKET_NAME',
  'JWT_SECRET'
];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('SECRET') || varName.includes('KEY')) {
      console.log(`✅ ${varName}: SET (${value.length} chars)`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

// 4. Check TypeScript configuration
console.log('\n4️⃣ TypeScript Configuration:');
try {
  const tsConfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
  console.log('Target:', tsConfig.compilerOptions.target);
  console.log('Module:', tsConfig.compilerOptions.module);
  console.log('Paths configured:', !!tsConfig.compilerOptions.paths);
  if (tsConfig.compilerOptions.paths) {
    console.log('Available paths:', Object.keys(tsConfig.compilerOptions.paths));
  }
} catch (error) {
  console.error('❌ Could not read tsconfig.json:', error.message);
}

// 5. Check if build directory exists
console.log('\n5️⃣ Build Status:');
const distExists = fs.existsSync('./dist');
console.log('Dist directory exists:', distExists);

if (distExists) {
  try {
    const distFiles = fs.readdirSync('./dist');
    console.log('Files in dist:', distFiles.slice(0, 10)); // Show first 10 files
  } catch (error) {
    console.error('❌ Could not read dist directory:', error.message);
  }
}

// 6. Check database connection with Prisma
console.log('\n6️⃣ Database Connection Test:');
async function testDatabase() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test if user table exists
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ User table accessible (${userCount} users found)`);
    } catch (error) {
      console.error('❌ User table error:', error.message);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

// 7. Test file validation service imports
console.log('\n7️⃣ Service Import Test:');
async function testServiceImports() {
  try {
    console.log('Testing FileValidationService import...');
    // This will likely fail due to TypeScript path mapping
    const FileValidationService = require('./src/services/validation/fileValidation.service.ts');
    console.log('✅ FileValidationService imported successfully');
  } catch (error) {
    console.error('❌ FileValidationService import failed:', error.message);

    // Try alternative import
    try {
      console.log('Trying compiled JS import...');
      const FileValidationService = require('./dist/services/validation/fileValidation.service.js');
      console.log('✅ FileValidationService imported from dist');
    } catch (error2) {
      console.error('❌ Compiled import also failed:', error2.message);
    }
  }
}

// 8. Check multer configuration
console.log('\n8️⃣ Multer Configuration Test:');
try {
  const multer = require('multer');
  const upload = multer({ storage: multer.memoryStorage() });
  console.log('✅ Multer configured successfully');
} catch (error) {
  console.error('❌ Multer configuration failed:', error.message);
}

// 9. Generate recommendations
console.log('\n9️⃣ Recommendations:');

// Check if running in development with ts-node
if (process.env.NODE_ENV === 'development' && !distExists) {
  console.log('🔧 Running in development without compiled files');
  console.log('   - Ensure ts-node is properly configured');
  console.log('   - Check tsconfig.json paths configuration');
  console.log('   - Verify NODE_PATH environment variable');
}

// Check common issues
if (!process.env.DATABASE_URL) {
  console.log('🔧 DATABASE_URL not set in .env file');
}

if (!process.env.HETZNER_ACCESS_KEY_ID) {
  console.log('🔧 Hetzner storage credentials not configured');
}

// Run async tests
async function runTests() {
  await testDatabase();
  await testServiceImports();

  console.log('\n🎯 Next Steps:');
  console.log('1. If import tests failed, the issue is TypeScript path mapping');
  console.log('2. If database tests failed, check DATABASE_URL and Prisma setup');
  console.log('3. Check application logs for specific error details');
  console.log('4. Consider running `npm run build` to generate compiled JavaScript');

  console.log('\n📊 Debug Complete!');
}

runTests().catch(console.error);