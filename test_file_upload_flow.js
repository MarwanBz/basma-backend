// Load environment variables
require('dotenv').config();

console.log('🔧 Testing File Upload Flow with Compiled Services\n');
console.log('==================================================\n');

// Test 1: Import compiled FileValidationService
console.log('1️⃣ Testing Compiled FileValidationService Import:');
try {
  const FileValidationService = require('./dist/src/services/validation/fileValidation.service.js').FileValidationService;
  const validationService = new FileValidationService();
  console.log('✅ FileValidationService imported successfully from compiled JS');

  // Test basic functionality
  const mockFile = {
    fieldname: 'files',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 12,
    buffer: Buffer.from('test content')
  };

  const mockContext = {
    userId: 'test-user',
    userRole: 'USER',
    ip: '127.0.0.1',
    userAgent: 'test',
    operation: 'upload',
    entityId: 'test-entity',
    entityType: 'MAINTENANCE_REQUEST',
    permissions: { canUpload: true },
    riskLevel: 'low',
    securityFlags: []
  };

  console.log('🔧 Testing file validation...');
  validationService.validateFile(mockFile, mockContext)
    .then(result => {
      console.log('✅ File validation completed successfully');
      console.log('   - Valid:', result.valid);
      console.log('   - Errors:', result.errors.length);
      console.log('   - Warnings:', result.warnings.length);
    })
    .catch(error => {
      console.error('❌ File validation failed:', error.message);
    });

} catch (error) {
  console.error('❌ FileValidationService import failed:', error.message);

  // Try different export patterns
  try {
    const module = require('./dist/src/services/validation/fileValidation.service.js');
    console.log('Available exports:', Object.keys(module));

    // Try different possible export names
    const possibleNames = ['FileValidationService', 'default', 'fileValidationService'];
    for (const name of possibleNames) {
      if (module[name]) {
        console.log(`✅ Found export: ${name}`);
        const Service = module[name];
        const instance = new Service();
        console.log('✅ Service instantiated successfully');
        break;
      }
    }
  } catch (error2) {
    console.error('❌ All import attempts failed:', error2.message);
  }
}

// Test 2: Import compiled FileService
console.log('\n2️⃣ Testing Compiled FileService Import:');
try {
  const FileService = require('./dist/src/services/file.service.js').FileService;
  console.log('✅ FileService class found');
} catch (error) {
  console.error('❌ FileService import failed:', error.message);

  try {
    const module = require('./dist/src/services/file.service.js');
    console.log('Available FileService exports:', Object.keys(module));
  } catch (error2) {
    console.error('❌ FileService module not accessible:', error2.message);
  }
}

// Test 3: Import compiled HetznerStorageService
console.log('\n3️⃣ Testing Compiled HetznerStorageService Import:');
try {
  const HetznerStorageService = require('./dist/src/services/storage/hetznerStorage.service.js').HetznerStorageService;
  console.log('✅ HetznerStorageService class found');

  // Test instantiation
  const config = {
    provider: 'hetzner',
    bucket: process.env.HETZNER_BUCKET_NAME,
    region: process.env.HETZNER_REGION || 'nbg1',
    endpoint: process.env.HETZNER_ENDPOINT_URL,
    accessKeyId: process.env.HETZNER_ACCESS_KEY_ID,
    secretAccessKey: process.env.HETZNER_SECRET_ACCESS_KEY,
    encryptionEnabled: true
  };

  const storageService = new HetznerStorageService(config);
  console.log('✅ HetznerStorageService instantiated successfully');

} catch (error) {
  console.error('❌ HetznerStorageService import failed:', error.message);
}

// Test 4: Check compiled file structure
console.log('\n4️⃣ Compiled File Structure:');
const fs = require('fs');
const path = require('path');

function checkDirectory(dirPath, prefix = '') {
  try {
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        console.log(prefix + '📁 ' + item + '/');
        if (prefix.length < 8) { // Limit depth
          checkDirectory(fullPath, prefix + '  ');
        }
      } else {
        console.log(prefix + '📄 ' + item);
      }
    });
  } catch (error) {
    console.error(prefix + '❌ Cannot read directory:', error.message);
  }
}

checkDirectory('./dist/src/services');

// Test 5: Database connection with correct variable name
console.log('\n5️⃣ Database Connection with MYSQL_DATABASE_URL:');
if (process.env.MYSQL_DATABASE_URL) {
  try {
    // Override the database URL for Prisma
    process.env.DATABASE_URL = process.env.MYSQL_DATABASE_URL;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    prisma.$connect()
      .then(() => {
        console.log('✅ Database connection successful');
        return prisma.$disconnect();
      })
      .catch(error => {
        console.error('❌ Database connection failed:', error.message);
      });
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  }
} else {
  console.log('❌ MYSQL_DATABASE_URL not set');
}

// Test 6: Check if TypeScript path mapping works in ts-node
console.log('\n6️⃣ TypeScript Path Mapping Test:');
try {
  // This should work if ts-node and tsconfig-paths are properly configured
  console.log('Testing ts-node resolution...');

  // Try to require ts-node and paths
  const tsNodePath = require.resolve('ts-node');
  const tsConfigPaths = require.resolve('tsconfig-paths');

  console.log('✅ ts-node found at:', tsNodePath);
  console.log('✅ tsconfig-paths found at:', tsConfigPaths);

  // Check if ts-node is properly configured in the current process
  if (process[Symbol.for('ts-node.register.instance')]) {
    console.log('✅ ts-node is registered in this process');
  } else {
    console.log('❌ ts-node is not registered - this is the issue!');
    console.log('   The app needs to run with: node -r ts-node/register -r tsconfig-paths/register');
  }

} catch (error) {
  console.error('❌ TypeScript tooling check failed:', error.message);
}

console.log('\n🎯 Diagnosis Summary:');
console.log('==================');
console.log('If compiled imports work but ts-node imports fail, the issue is:');
console.log('1. Missing ts-node registration');
console.log('2. Missing tsconfig-paths registration');
console.log('3. Incorrect Node.js startup command');
console.log('');
console.log('The fix is to ensure the app starts with:');
console.log('node -r ts-node/register -r tsconfig-paths/register src/index.ts');
console.log('');
console.log('Or check the package.json scripts and nodemon configuration.');