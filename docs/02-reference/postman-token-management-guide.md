# Postman Token Management Guide for Basma Backend API

## Overview

This guide explains how backend developers can efficiently manage authentication tokens for different user roles when testing the Basma API using Postman. The system uses JWT (JSON Web Tokens) for authentication with role-based access control.

## User Roles and Token Management

The Basma system has 5 user roles, each with different permissions:

| Role                  | Description         | Permissions                             |
| --------------------- | ------------------- | --------------------------------------- |
| **SUPER_ADMIN**       | Full system access  | Can do everything                       |
| **MAINTENANCE_ADMIN** | Regional management | Can assign/manage requests              |
| **BASMA_ADMIN**       | Building management | View-only access (cannot assign/manage) |
| **TECHNICIAN**        | Field work          | Can work on assigned requests           |
| **CUSTOMER**          | Request creation    | Can create/manage own requests          |

## Token Management Strategies

### 1. Environment Variables (Recommended)

**Create separate environments for each role:**

```json
// SUPER_ADMIN Environment
{
  "base_url": "http://localhost:4300",
  "access_token": "",
  "admin_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "technician_token": "",
  "customer_token": "",
  "basma_admin_token": "",
  "my_user_id": "admin-user-id",
  "technician_user_id": "technician-id"
}

// TECHNICIAN Environment
{
  "base_url": "http://localhost:4300",
  "access_token": "",
  "admin_token": "",
  "technician_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "customer_token": "",
  "basma_admin_token": "",
  "my_user_id": "technician-user-id",
  "technician_user_id": "technician-id"
}

// CUSTOMER Environment
{
  "base_url": "http://localhost:4300",
  "access_token": "",
  "admin_token": "",
  "technician_token": "",
  "customer_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "basma_admin_token": "",
  "my_user_id": "customer-user-id",
  "technician_user_id": ""
}
```

### 2. Quick Token Switching

**Method 1: Environment Dropdown**

```bash
# 1. Create multiple environments (one per role)
# 2. Switch environments in Postman top-right dropdown
# 3. Each environment has its own token variables
```

**Method 2: Variable Override**

```bash
# Use different variable names for different roles
# Example: {{admin_token}}, {{technician_token}}, {{customer_token}}
```

**Method 3: Collection Variables**

```bash
# Set tokens as collection variables
# Update them when tokens expire
```

## Workflow for Different Roles

### 🔐 Initial Setup

1. **Login as SUPER_ADMIN** to create test users:

```bash
# Login Request
POST {{base_url}}/api/auth/login
{
  "email": "superadmin@basma.com",
  "password": "SuperAdmin123!"
}
```

2. **Create test users for each role:**

```bash
# Create TECHNICIAN
POST {{base_url}}/api/super-admin/users
Authorization: Bearer {{admin_token}}
{
  "name": "Test Technician",
  "email": "technician@test.com",
  "password": "Technician123!",
  "role": "TECHNICIAN"
}

# Create CUSTOMER
POST {{base_url}}/api/super-admin/users
{
  "name": "Test Customer",
  "email": "customer@test.com",
  "password": "Customer123!",
  "role": "CUSTOMER"
}
```

### 👷 Testing Technician Workflow

```bash
# 1. Login as technician
POST {{base_url}}/api/auth/login
{
  "email": "technician@test.com",
  "password": "Technician123!"
}
# → Save token to {{technician_token}}

# 2. Get assigned requests
GET {{base_url}}/api/requests?assignedToId={{my_user_id}}
Authorization: Bearer {{technician_token}}

# 3. Self-assign available request
POST {{base_url}}/api/requests/{{request_id}}/self-assign
Authorization: Bearer {{technician_token}}

# 4. Update status to IN_PROGRESS
PATCH {{base_url}}/api/requests/{{request_id}}/status
Authorization: Bearer {{technician_token}}
{
  "status": "IN_PROGRESS",
  "reason": "Starting work"
}

# 5. Complete the request
PATCH {{base_url}}/api/requests/{{request_id}}/status
Authorization: Bearer {{technician_token}}
{
  "status": "COMPLETED",
  "reason": "Work completed successfully"
}
```

### 👤 Testing Customer Workflow

```bash
# 1. Login as customer
POST {{base_url}}/api/auth/login
{
  "email": "customer@test.com",
  "password": "Customer123!"
}
# → Save token to {{customer_token}}

# 2. Create maintenance request
POST {{base_url}}/api/requests
Authorization: Bearer {{customer_token}}
{
  "title": "Fix broken door",
  "description": "Door won't close properly",
  "priority": "MEDIUM",
  "categoryId": 1,
  "location": "Main entrance"
}

# 3. Get my requests
GET {{base_url}}/api/requests?requestedById={{my_user_id}}
Authorization: Bearer {{customer_token}}

# 4. Add comment to request
POST {{base_url}}/api/requests/{{request_id}}/comments
Authorization: Bearer {{customer_token}}
{
  "text": "Please fix this urgently",
  "isInternal": false
}
```

### 👑 Testing Admin Workflow

```bash
# 1. Login as admin
POST {{base_url}}/api/auth/login
{
  "email": "superadmin@basma.com",
  "password": "SuperAdmin123!"
}
# → Save token to {{admin_token}}

# 2. Get all requests
GET {{base_url}}/api/requests
Authorization: Bearer {{admin_token}}

# 3. Assign request to technician
POST {{base_url}}/api/requests/{{request_id}}/assign
Authorization: Bearer {{admin_token}}
{
  "assignedToId": "{{technician_user_id}}",
  "reason": "Assigning to available technician"
}

# 4. Close completed request
PATCH {{base_url}}/api/requests/{{request_id}}/status
Authorization: Bearer {{admin_token}}
{
  "status": "CLOSED",
  "reason": "Work verified and completed"
}
```

## Token Refresh Management

### Automatic Token Refresh

Add this script to your login requests:

```javascript
// Login Test Script
if (pm.response.code === 200) {
  const response = pm.response.json();

  // Save tokens based on user role
  if (response.data.user.role === "SUPER_ADMIN") {
    pm.environment.set("admin_token", response.data.accessToken);
    pm.environment.set("my_user_id", response.data.user.id);
  } else if (response.data.user.role === "TECHNICIAN") {
    pm.environment.set("technician_token", response.data.accessToken);
    pm.environment.set("my_user_id", response.data.user.id);
    pm.environment.set("technician_user_id", response.data.user.id);
  } else if (response.data.user.role === "CUSTOMER") {
    pm.environment.set("customer_token", response.data.accessToken);
    pm.environment.set("my_user_id", response.data.user.id);
  }

  console.log("Token saved for role:", response.data.user.role);
}
```

### Manual Token Refresh

```bash
# Refresh token endpoint
POST {{base_url}}/api/auth/refresh
{
  "refreshToken": "{{refresh_token}}"
}
```

## Advanced Best Practices

### 1. Environment Organization

```bash
# Create role-specific environments:
- Development - SUPER_ADMIN
- Development - TECHNICIAN
- Development - CUSTOMER
- Development - BASMA_ADMIN
- Production - SUPER_ADMIN
- Production - TECHNICIAN
- Production - CUSTOMER
```

### 2. Token Expiration Handling

```javascript
// Add to requests that might have expired tokens
pm.test("Handle token expiration", function () {
  if (pm.response.code === 401) {
    console.log("Token expired - please login again");
    // You could trigger a login request here
  }
});
```

### 3. Automated Token Refresh

```javascript
// Pre-request script for automatic token refresh
const refreshToken = pm.environment.get("refresh_token");
const currentToken = pm.environment.get("access_token");

if (refreshToken && !currentToken) {
  pm.sendRequest(
    {
      url: "{{base_url}}/api/auth/refresh",
      method: "POST",
      header: {
        "Content-Type": "application/json",
      },
      body: {
        mode: "raw",
        raw: JSON.stringify({ refreshToken: refreshToken }),
      },
    },
    function (err, res) {
      if (!err && res.code === 200) {
        const response = res.json();
        pm.environment.set("access_token", response.data.accessToken);
        if (response.data.refreshToken) {
          pm.environment.set("refresh_token", response.data.refreshToken);
        }
        console.log("✅ Token automatically refreshed");
      } else {
        console.log("❌ Token refresh failed - please login manually");
      }
    }
  );
}
```

### 4. Request Chaining with Error Handling

```javascript
// Example: Create request, then assign it, then update status
// 1. Create request (saves {{created_request_id}})
// 2. Assign request (uses {{created_request_id}})
// 3. Update status (uses {{created_request_id}})

// Add this to the Tests tab of each request
pm.test("Request chaining", function () {
  const requestId = pm.environment.get("created_request_id");
  if (pm.response.code === 201 && requestId) {
    // Chain to next request automatically
    // You can trigger the next request here
    console.log("Ready for next step in workflow");
  }
});
```

### 5. Role-Based Request Authorization

```javascript
// Pre-request script to ensure correct token for role
const userRole = pm.environment.get("current_user_role");
const expectedRole = "TECHNICIAN"; // Change based on request

if (userRole !== expectedRole) {
  console.log(
    `⚠️ Warning: Current user role (${userRole}) may not have access to this endpoint`
  );
  console.log(`Expected role: ${expectedRole}`);
}
```

### 3. Request Chaining

```javascript
// Example: Create request, then assign it
// 1. Create request (saves {{created_request_id}})
// 2. Assign request (uses {{created_request_id}})
// 3. Update status (uses {{created_request_id}})
```

### 4. Error Testing

```javascript
// Test unauthorized access
pm.test("Should return 403 for unauthorized role", function () {
  pm.response.to.have.status(403);
});
```

## Common Issues and Solutions

### Issue: "Token expired"

**Solution:**

```bash
# 1. Login again with the same user
POST {{base_url}}/api/auth/login
{
  "email": "technician@test.com",
  "password": "Technician123!"
}
# 2. Update the corresponding token variable
```

### Issue: "Access denied"

**Solution:**

```bash
# 1. Check if you're using the correct token for the role
# 2. Verify the user has the required permissions
# 3. Some operations require specific roles (e.g., assignment = admin only)
```

### Issue: "Request not found"

**Solution:**

```bash
# 1. Check if {{created_request_id}} is set correctly
# 2. Verify the request was actually created
# 3. Check if the request was deleted or completed
```

## Automated User Creation Scripts

### Quick Setup Script

Create a script file `setup-test-users.js` to automatically create test users:

```javascript
// setup-test-users.js - Run with: node setup-test-users.js
const fetch = require("node-fetch");

const BASE_URL = "http://localhost:4300";
const SUPER_ADMIN_EMAIL = "superadmin@basma.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";

let adminToken = "";

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(adminToken && { Authorization: `Bearer ${adminToken}` }),
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

async function setup() {
  console.log("🚀 Setting up test users...\n");

  try {
    // 1. Login as Super Admin
    console.log("1. Logging in as Super Admin...");
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
      }),
    });
    adminToken = loginResponse.data.accessToken;
    console.log("✅ Admin login successful\n");

    // 2. Create Technician user
    console.log("2. Creating Technician user...");
    const technician = await makeRequest(`${BASE_URL}/api/super-admin/users`, {
      method: "POST",
      body: JSON.stringify({
        name: "Test Technician",
        email: "technician@test.com",
        password: "Technician123!",
        role: "TECHNICIAN",
      }),
    });
    console.log("✅ Technician created:", technician.data.email);

    // 3. Create Customer user
    console.log("3. Creating Customer user...");
    const customer = await makeRequest(`${BASE_URL}/api/super-admin/users`, {
      method: "POST",
      body: JSON.stringify({
        name: "Test Customer",
        email: "customer@test.com",
        password: "Customer123!",
        role: "CUSTOMER",
      }),
    });
    console.log("✅ Customer created:", customer.data.email);

    // 4. Create BASMA_ADMIN user
    console.log("4. Creating BASMA_ADMIN user...");
    const basmaAdmin = await makeRequest(`${BASE_URL}/api/super-admin/users`, {
      method: "POST",
      body: JSON.stringify({
        name: "Test Building Admin",
        email: "basmaadmin@test.com",
        password: "BasmaAdmin123!",
        role: "BASMA_ADMIN",
      }),
    });
    console.log("✅ BASMA_ADMIN created:", basmaAdmin.data.email);

    console.log("\n🎉 All test users created successfully!");
    console.log("\n📋 Test User Credentials:");
    console.log("SUPER_ADMIN: superadmin@basma.com / SuperAdmin123!");
    console.log("TECHNICIAN: technician@test.com / Technician123!");
    console.log("CUSTOMER: customer@test.com / Customer123!");
    console.log("BASMA_ADMIN: basmaadmin@test.com / BasmaAdmin123!");

    console.log("\n🔧 Next steps:");
    console.log("1. Import the updated Postman collection");
    console.log("2. Create environments for each role");
    console.log('3. Use the "Login" request to authenticate each role');
    console.log("4. Start testing the complete workflow!");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Make sure the backend server is running");
    console.log("2. Verify Super Admin credentials");
    console.log("3. Check if test users already exist");
  }
}

setup().catch(console.error);
```

### Postman Collection Setup

```bash
# 1. Create separate environments:
# - BASMA-DEV-ADMIN (for SUPER_ADMIN operations)
# - BASMA-DEV-TECH (for TECHNICIAN operations)
# - BASMA-DEV-CUSTOMER (for CUSTOMER operations)
# - BASMA-DEV-BUILDING (for BASMA_ADMIN operations)

# 2. Set environment variables:
# base_url: http://localhost:4300
# admin_token: (leave empty)
# technician_token: (leave empty)
# customer_token: (leave empty)
# basma_admin_token: (leave empty)

# 3. Run the automated setup script:
node setup-test-users.js
```

### Quick Start Commands

```bash
# 1. Start the backend server
npm run dev

# 2. Run the automated user creation script
node setup-test-users.js

# 3. Import the Postman collection and create environments
# Use the "Login" request in Authentication folder for each role
# Update the corresponding token variables

# 4. Test the request workflow
# Create → Assign → Update Status → Comment → Complete
```

## Complete Workflow Examples by Role

### 🔐 SUPER_ADMIN Complete Workflow

**Environment:** `BASMA-DEV-ADMIN`

```bash
# Step 1: Login
POST {{base_url}}/api/auth/login
{
  "email": "superadmin@basma.com",
  "password": "SuperAdmin123!"
}
# → Saves {{admin_token}}, {{my_user_id}}

# Step 2: Create a test customer request
POST {{base_url}}/api/requests
Authorization: Bearer {{admin_token}}
{
  "title": "Test Request - Broken Door",
  "description": "Door mechanism needs repair",
  "priority": "MEDIUM",
  "categoryId": 1,
  "location": "Main Entrance",
  "building": "Building A"
}
# → Saves {{created_request_id}}

# Step 3: Get all requests
GET {{base_url}}/api/requests
Authorization: Bearer {{admin_token}}

# Step 4: Assign request to technician
POST {{base_url}}/api/requests/{{created_request_id}}/assign
Authorization: Bearer {{admin_token}}
{
  "assignedToId": "{{technician_user_id}}",
  "reason": "Assigning to available technician"
}

# Step 5: Monitor request progress
GET {{base_url}}/api/requests/{{created_request_id}}
Authorization: Bearer {{admin_token}}

# Step 6: Close completed request
PATCH {{base_url}}/api/requests/{{created_request_id}}/status
Authorization: Bearer {{admin_token}}
{
  "status": "CLOSED",
  "reason": "Work completed and verified"
}
```

### 👷 TECHNICIAN Complete Workflow

**Environment:** `BASMA-DEV-TECHNICIAN`

```bash
# Step 1: Login
POST {{base_url}}/api/auth/login
{
  "email": "technician@test.com",
  "password": "Technician123!"
}
# → Saves {{technician_token}}, {{my_user_id}}, {{technician_user_id}}

# Step 2: Get assigned requests
GET {{base_url}}/api/requests?assignedToId={{my_user_id}}
Authorization: Bearer {{technician_token}}

# Step 3: Self-assign available request
POST {{base_url}}/api/requests/{{created_request_id}}/self-assign
Authorization: Bearer {{technician_token}}

# Step 4: Start working on request
PATCH {{base_url}}/api/requests/{{created_request_id}}/status
Authorization: Bearer {{technician_token}}
{
  "status": "IN_PROGRESS",
  "reason": "Starting repair work"
}

# Step 5: Add internal comment
POST {{base_url}}/api/requests/{{created_request_id}}/comments
Authorization: Bearer {{technician_token}}
{
  "text": "Found issue with door hinges. Need replacement parts.",
  "isInternal": true
}

# Step 6: Complete the request
PATCH {{base_url}}/api/requests/{{created_request_id}}/status
Authorization: Bearer {{technician_token}}
{
  "status": "COMPLETED",
  "reason": "Door repair completed successfully"
}
```

### 👤 CUSTOMER Complete Workflow

**Environment:** `BASMA-DEV-CUSTOMER`

```bash
# Step 1: Login
POST {{base_url}}/api/auth/login
{
  "email": "customer@test.com",
  "password": "Customer123!"
}
# → Saves {{customer_token}}, {{my_user_id}}

# Step 2: Create maintenance request
POST {{base_url}}/api/requests
Authorization: Bearer {{customer_token}}
{
  "title": "Leaky faucet in apartment 5B",
  "description": "Kitchen faucet is dripping constantly. Needs immediate attention.",
  "priority": "HIGH",
  "categoryId": 2,
  "location": "Kitchen",
  "building": "Building B",
  "specificLocation": "Apartment 5B"
}
# → Saves {{created_request_id}}

# Step 3: Get my requests
GET {{base_url}}/api/requests?requestedById={{my_user_id}}
Authorization: Bearer {{customer_token}}

# Step 4: Add comment to request
POST {{base_url}}/api/requests/{{created_request_id}}/comments
Authorization: Bearer {{customer_token}}
{
  "text": "Please fix this as soon as possible. The dripping is very annoying.",
  "isInternal": false
}

# Step 5: Check request status updates
GET {{base_url}}/api/requests/{{created_request_id}}
Authorization: Bearer {{customer_token}}

# Step 6: Add follow-up comment
POST {{base_url}}/api/requests/{{created_request_id}}/comments
Authorization: Bearer {{customer_token}}
{
  "text": "Thank you for the quick response! The faucet is now working perfectly.",
  "isInternal": false
}
```

### 🏢 BASMA_ADMIN (Building Admin) Workflow

**Environment:** `BASMA-DEV-BUILDING`

```bash
# Step 1: Login
POST {{base_url}}/api/auth/login
{
  "email": "basmaadmin@test.com",
  "password": "BasmaAdmin123!"
}
# → Saves {{basma_admin_token}}, {{my_user_id}}

# Step 2: Get requests for your building
GET {{base_url}}/api/requests?building=Building%20A
Authorization: Bearer {{basma_admin_token}}

# Step 3: View request details (read-only access)
GET {{base_url}}/api/requests/{{created_request_id}}
Authorization: Bearer {{basma_admin_token}}

# Step 4: Add building-specific comment
POST {{base_url}}/api/requests/{{created_request_id}}/comments
Authorization: Bearer {{basma_admin_token}}
{
  "text": "This is a common issue in Building A. Please ensure proper documentation.",
  "isInternal": false
}

# Step 5: Monitor all building requests
GET {{base_url}}/api/requests?building=Building%20A&status=IN_PROGRESS
Authorization: Bearer {{basma_admin_token}}
```

### 🔄 Cross-Role Workflow Example

**Complete request lifecycle across all roles:**

```bash
# 1. CUSTOMER creates request
POST {{base_url}}/api/requests (Customer token)
# → Request created with status SUBMITTED

# 2. SUPER_ADMIN assigns to technician
POST {{base_url}}/api/requests/{{id}}/assign (Admin token)
# → Request status: ASSIGNED

# 3. TECHNICIAN starts work
PATCH {{base_url}}/api/requests/{{id}}/status (Technician token)
# → Status: IN_PROGRESS

# 4. TECHNICIAN adds internal notes
POST {{base_url}}/api/requests/{{id}}/comments (Technician token)
# → Internal comment added

# 5. CUSTOMER adds follow-up
POST {{base_url}}/api/requests/{{id}}/comments (Customer token)
# → Customer comment added

# 6. TECHNICIAN completes work
PATCH {{base_url}}/api/requests/{{id}}/status (Technician token)
# → Status: COMPLETED

# 7. SUPER_ADMIN closes request
PATCH {{base_url}}/api/requests/{{id}}/status (Admin token)
# → Status: CLOSED

# 8. BASMA_ADMIN monitors building
GET {{base_url}}/api/requests?building=Building%20A (Building token)
# → Views all building requests
```

## Pro Tips

1. **Use Postman Runner** for automated testing of workflows
2. **Create request templates** for common operations
3. **Use environment-specific data** for different deployment environments
4. **Document your test scenarios** in request descriptions
5. **Use Newman** for CI/CD integration of API tests
6. **Set up automated token refresh** for long testing sessions
7. **Create workflow chains** for complex multi-step processes
8. **Use role-specific environments** to avoid token conflicts
9. **Monitor request IDs** across workflow steps
10. **Test error scenarios** with invalid tokens and permissions

## Security Notes

- Never commit tokens to version control
- Use environment-specific tokens for different deployment stages
- Rotate tokens regularly in production
- Use refresh tokens for long-lived sessions
- Monitor token usage for security auditing

---

_This guide helps backend developers efficiently test the Basma API with proper role-based access control and token management._
