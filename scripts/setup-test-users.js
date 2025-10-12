#!/usr/bin/env node

/**
 * Automated Test User Creation Script for Basma Backend API
 *
 * This script automatically creates test users for all roles and provides
 * login credentials for Postman testing.
 *
 * Usage: node scripts/setup-test-users.js
 *
 * Prerequisites:
 * - Backend server must be running on localhost:4300
 * - Super Admin user must exist (run create-super-admin.ts first if needed)
 */

const https = require("http");

const BASE_URL = "http://localhost:4300";
const SUPER_ADMIN_EMAIL = "superadmin@basma.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";

let adminToken = "";

/**
 * Make HTTP request with proper error handling
 */
async function makeRequest(url, options = {}) {
  const httpModule = url.startsWith("https")
    ? require("https")
    : require("http");

  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: "localhost",
      port: 4300,
      path: url.replace(BASE_URL, ""),
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken && { Authorization: `Bearer ${adminToken}` }),
        ...options.headers,
      },
    };

    const req = httpModule.request(requestOptions, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(data);

          if (!res.statusCode.toString().startsWith("2")) {
            reject(
              new Error(
                `HTTP ${res.statusCode}: ${parsedData.message || "Unknown error"}`
              )
            );
            return;
          }

          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Login as Super Admin to get token
 */
async function loginAsAdmin() {
  console.log("🔐 Logging in as Super Admin...");

  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      body: {
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
      },
    });

    adminToken = response.data.accessToken;
    console.log("✅ Admin login successful");
    console.log("🎫 Token acquired:", adminToken.substring(0, 20) + "...");
    console.log("");
    return true;
  } catch (error) {
    console.error("❌ Admin login failed:", error.message);
    console.log("");
    console.log("🔧 Please ensure:");
    console.log("1. Backend server is running (npm run dev)");
    console.log(
      "2. Super Admin user exists (run: npx ts-node scripts/create-super-admin.ts)"
    );
    console.log("3. Database is connected and migrations are up to date");
    return false;
  }
}

/**
 * Create a test user for a specific role
 */
async function createTestUser(role, name, email, password) {
  console.log(`👤 Creating ${role} user: ${name}...`);

  try {
    const response = await makeRequest(`${BASE_URL}/api/super-admin/users`, {
      method: "POST",
      body: {
        name,
        email,
        password,
        role,
      },
    });

    console.log(`✅ ${role} created: ${response.data.email}`);
    return response.data;
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log(`⚠️ ${role} already exists: ${email}`);
      console.log(`   Password: ${password}`);
      return null;
    } else {
      console.error(`❌ Failed to create ${role}:`, error.message);
      return null;
    }
  }
}

/**
 * Main setup function
 */
async function setup() {
  console.log("🚀 Basma Backend - Test User Setup");
  console.log("===================================\n");

  // Step 1: Login as Super Admin
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    return;
  }

  // Step 2: Create test users for each role
  const users = [];

  console.log("📝 Creating test users...\n");

  // Create Technician
  const technician = await createTestUser(
    "TECHNICIAN",
    "Test Technician",
    "technician@test.com",
    "Technician123!"
  );
  if (technician) users.push(technician);

  // Create Customer
  const customer = await createTestUser(
    "CUSTOMER",
    "Test Customer",
    "customer@test.com",
    "Customer123!"
  );
  if (customer) users.push(customer);

  // Create BASMA_ADMIN
  const basmaAdmin = await createTestUser(
    "BASMA_ADMIN",
    "Test Building Admin",
    "basmaadmin@test.com",
    "BasmaAdmin123!"
  );
  if (basmaAdmin) users.push(basmaAdmin);

  // Step 3: Summary
  console.log("\n🎉 Setup completed successfully!");
  console.log("\n📋 Test User Credentials for Postman:");
  console.log("=====================================");
  console.log("SUPER_ADMIN:");
  console.log("  Email: superadmin@basma.com");
  console.log("  Password: SuperAdmin123!");
  console.log("");
  console.log("TECHNICIAN:");
  console.log("  Email: technician@test.com");
  console.log("  Password: Technician123!");
  console.log("");
  console.log("CUSTOMER:");
  console.log("  Email: customer@test.com");
  console.log("  Password: Customer123!");
  console.log("");
  console.log("BASMA_ADMIN:");
  console.log("  Email: basmaadmin@test.com");
  console.log("  Password: BasmaAdmin123!");
  console.log("");

  console.log("🔧 Postman Setup Instructions:");
  console.log("=============================");
  console.log("1. Import the updated basma-api-postman-collection.json");
  console.log("2. Create separate environments for each role:");
  console.log("   - BASMA-DEV-ADMIN");
  console.log("   - BASMA-DEV-TECHNICIAN");
  console.log("   - BASMA-DEV-CUSTOMER");
  console.log("   - BASMA-DEV-BUILDING");
  console.log("3. Set base_url: http://localhost:4300 in each environment");
  console.log('4. Use the "Login" request to authenticate each role');
  console.log(
    "5. Test the complete workflow: Create → Assign → Update → Comment → Complete"
  );
  console.log("");
  console.log(
    "📚 See docs/02-reference/postman-token-management-guide.md for detailed instructions"
  );
}

// Run the setup
setup().catch((error) => {
  console.error("💥 Setup failed:", error.message);
  process.exit(1);
});
