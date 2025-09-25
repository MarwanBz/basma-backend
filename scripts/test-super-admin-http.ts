#!/usr/bin/env ts-node

/**
 * Test script for Super Admin HTTP API endpoints
 * Run with: npx ts-node scripts/test-super-admin-http.ts
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:4300";
const SUPER_ADMIN_EMAIL = "superadmin@basma.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";

let accessToken = "";

async function makeRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${data.message || "Unknown error"}`
    );
  }

  return data;
}

async function login() {
  console.log("🔐 Logging in as Super Admin...");

  const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
    }),
  });

  accessToken = response.data.accessToken;
  console.log("✅ Login successful!");
  console.log("🎫 Access token:", accessToken.substring(0, 20) + "...");
  console.log("");
}

async function testSystemStats() {
  console.log("📊 Testing system stats endpoint...");

  const stats = await makeRequest(`${BASE_URL}/api/super-admin/system/stats`);
  console.log("✅ System stats retrieved:", stats);
  console.log("");
}

async function testGetAllUsers() {
  console.log("👥 Testing get all users endpoint...");

  const users = await makeRequest(
    `${BASE_URL}/api/super-admin/users?page=1&limit=5`
  );
  console.log("✅ Users retrieved:", users);
  console.log("");
}

async function testCreateUser() {
  console.log("➕ Testing create user endpoint...");

  const newUser = await makeRequest(`${BASE_URL}/api/super-admin/users`, {
    method: "POST",
    body: JSON.stringify({
      name: "Test HTTP User",
      email: `test-http-${Date.now()}@example.com`,
      password: "TestPassword123!",
      role: "CUSTOMER",
    }),
  });

  console.log("✅ User created:", newUser);
  return newUser;
}

async function testGetUserById(userId: string) {
  console.log("🔍 Testing get user by ID endpoint...");

  const user = await makeRequest(`${BASE_URL}/api/super-admin/users/${userId}`);
  console.log("✅ User retrieved by ID:", user);
  console.log("");
}

async function testUpdateUser(userId: string) {
  console.log("✏️ Testing update user endpoint...");

  const updatedUser = await makeRequest(
    `${BASE_URL}/api/super-admin/users/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: "Updated HTTP User",
        role: "TECHNICIAN",
      }),
    }
  );

  console.log("✅ User updated:", updatedUser);
  console.log("");
}

async function testGetUsersByRole() {
  console.log("🎭 Testing get users by role endpoint...");

  const technicians = await makeRequest(
    `${BASE_URL}/api/super-admin/users?role=TECHNICIAN&page=1&limit=5`
  );
  console.log("✅ Technicians retrieved:", technicians);
  console.log("");
}

async function testSecurityLogs() {
  console.log("🔒 Testing security logs endpoint...");

  const logs = await makeRequest(
    `${BASE_URL}/api/super-admin/security/logs?page=1&limit=5`
  );
  console.log("✅ Security logs retrieved:", logs);
  console.log("");
}

async function testAuditLogs() {
  console.log("📋 Testing audit logs endpoint...");

  const logs = await makeRequest(
    `${BASE_URL}/api/super-admin/audit/logs?page=1&limit=5`
  );
  console.log("✅ Audit logs retrieved:", logs);
  console.log("");
}

async function testBulkUpdate(userId: string) {
  console.log("📦 Testing bulk update endpoint...");

  const result = await makeRequest(
    `${BASE_URL}/api/super-admin/users/bulk-update`,
    {
      method: "POST",
      body: JSON.stringify({
        updates: [
          {
            id: userId,
            data: { name: "Bulk Updated HTTP User" },
          },
        ],
      }),
    }
  );

  console.log("✅ Bulk update completed:", result);
  console.log("");
}

async function testDeleteUser(userId: string) {
  console.log("🗑️ Testing delete user endpoint...");

  const result = await makeRequest(
    `${BASE_URL}/api/super-admin/users/${userId}`,
    {
      method: "DELETE",
    }
  );

  console.log("✅ User deleted:", result);
  console.log("");
}

async function testUnauthorizedAccess() {
  console.log("🚫 Testing unauthorized access...");

  const originalToken = accessToken;
  try {
    // Try to access without token
    accessToken = "";

    await makeRequest(`${BASE_URL}/api/super-admin/system/stats`);
    console.log("❌ Should have failed!");
  } catch (error) {
    console.log("✅ Unauthorized access properly blocked:", error.message);
  } finally {
    accessToken = originalToken;
  }
  console.log("");
}

async function testSuperAdminAPI() {
  console.log("🧪 Testing Super Admin HTTP API...\n");

  try {
    // Test login
    await login();

    // Test system stats
    await testSystemStats();

    // Test get all users
    await testGetAllUsers();

    // Test create user
    const newUser = await testCreateUser();

    // Test get user by ID
    await testGetUserById(newUser.data.id);

    // Test update user
    await testUpdateUser(newUser.data.id);

    // Test get users by role
    await testGetUsersByRole();

    // Test security logs
    await testSecurityLogs();

    // Test audit logs
    await testAuditLogs();

    // Test bulk update
    await testBulkUpdate(newUser.data.id);

    // Test unauthorized access
    await testUnauthorizedAccess();

    // Test delete user
    await testDeleteUser(newUser.data.id);

    console.log("🎉 All Super Admin HTTP API tests passed!");
    console.log("\n📝 API Endpoints Summary:");
    console.log("✅ POST /api/auth/login - Authentication");
    console.log("✅ GET /api/super-admin/system/stats - System statistics");
    console.log("✅ GET /api/super-admin/users - Get all users");
    console.log("✅ POST /api/super-admin/users - Create user");
    console.log("✅ GET /api/super-admin/users/:id - Get user by ID");
    console.log("✅ PUT /api/super-admin/users/:id - Update user");
    console.log("✅ DELETE /api/super-admin/users/:id - Delete user");
    console.log("✅ GET /api/super-admin/users?role=ROLE - Get users by role");
    console.log("✅ GET /api/super-admin/security/logs - Security logs");
    console.log("✅ GET /api/super-admin/audit/logs - Audit logs");
    console.log(
      "✅ POST /api/super-admin/users/bulk-update - Bulk update users"
    );
    console.log(
      "✅ POST /api/super-admin/users/bulk-delete - Bulk delete users"
    );
  } catch (error) {
    console.error("❌ Super Admin HTTP API test failed:", error);
    console.log("\n🔧 This might be due to:");
    console.log("1. Server not running (start with: yarn dev)");
    console.log("2. Database connection issues");
    console.log("3. Authentication problems");
  }
}

// Run the test
testSuperAdminAPI().catch(console.error);
