# Postman API Testing - Simple Guide

## 🎯 **What is Postman?**

**Postman** = Tool to test your API endpoints without writing code

**Think of it like:**

- 🏪 **Your API** = Restaurant menu
- 📋 **Postman** = Ordering system to test each dish
- 🍽️ **Endpoints** = Individual menu items

---

## 🚀 **Getting Started**

### **1. Import Collection**

```
File → Import → basma-api-postman-collection.json
```

### **2. Set Environment**

```
Environment Variables:
- base_url: http://localhost:4300
- access_token: (auto-filled after login)
```

### **3. Start Testing**

```
1. Login → Gets your access token
2. Test any protected endpoint
3. Check response data
```

---

## 🔧 **Key Concepts**

### **Environment Variables**

```
{{base_url}} = http://localhost:4300
{{access_token}} = your-jwt-token-here
```

**Why use them?**

- ✅ Change URL once for all requests
- ✅ Auto-save tokens after login
- ✅ Switch between dev/prod easily

### **Request Types**

| Method   | Purpose         | Example       |
| -------- | --------------- | ------------- |
| `GET`    | Read data       | Get all users |
| `POST`   | Create new      | Create user   |
| `PUT`    | Update existing | Update user   |
| `DELETE` | Remove          | Delete user   |

### **Authentication**

```
Header: Authorization: Bearer {{access_token}}
```

**Why Bearer tokens?**

- 🔒 Secure way to prove who you are
- ⏰ Expire automatically for security
- 🔄 Can be refreshed when needed

---

## 📝 **Testing Workflow**

### **Step 1: Start Server**

```bash
yarn dev
# Server runs on http://localhost:4300
```

### **Step 2: Create Super Admin**

```bash
npx ts-node scripts/create-super-admin.ts
# Creates: superadmin@basma.com / SuperAdmin123!
```

### **Step 3: Test in Order**

1. **🔐 Login** → Get your token
2. **📊 System Stats** → Verify access works
3. **👥 Create User** → Test user creation
4. **📋 Get Users** → See all users
5. **❌ Invalid Token** → Test security

---

## 🎯 **What to Look For**

### **✅ Success Responses**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": { "id": "123", "name": "Test User" }
}
```

### **❌ Error Responses**

```json
{
  "success": false,
  "message": "Access denied. Super Admin role required.",
  "error": "FORBIDDEN"
}
```

### **🔍 Status Codes**

- `200` = Success (GET/PUT)
- `201` = Created (POST)
- `401` = Unauthorized (bad token)
- `403` = Forbidden (wrong role)
- `404` = Not found
- `500` = Server error

---

## 🔄 **Auto-Magic Features**

### **Auto-Save Tokens**

```javascript
// In Login request → Tests tab:
if (pm.response.code === 200) {
  const response = pm.response.json();
  pm.environment.set("access_token", response.data.access_token);
}
```

### **Auto-Save User IDs**

```javascript
// In Create User request → Tests tab:
if (pm.response.code === 201) {
  const response = pm.response.json();
  pm.environment.set("created_user_id", response.data.id);
}
```

**Why this matters:**

- 🔄 No copy/paste tokens manually
- ⚡ Seamless testing workflow
- 🎯 Focus on testing, not setup

---

## 🧪 **Testing Scenarios**

### **Happy Path** ✅

```
1. Login with valid credentials
2. Create user with valid data
3. Get users list
4. Update user details
5. Delete user
```

### **Error Cases** ❌

```
1. Login with wrong password
2. Access Super Admin without token
3. Create user with invalid email
4. Update non-existent user
5. Access with expired token
```

### **Role Testing** 🔒

```
1. Super Admin can access everything
2. Regular user cannot access Super Admin endpoints
3. Invalid tokens are rejected
4. Missing tokens are rejected
```

---

## 💡 **Pro Tips**

### **1. Organize Tests**

- 📁 Group related endpoints in folders
- 🏷️ Use descriptive names
- 📝 Add descriptions for complex requests

### **2. Use Scripts**

- 🔄 Auto-save important values
- ✅ Assert response data is correct
- 📊 Log important information

### **3. Environment Management**

```
Development: base_url = http://localhost:4300
Production:  base_url = https://api.basma.com
```

### **4. Quick Testing**

- 🚀 Run entire folder at once
- ⚡ Use Collection Runner for bulk tests
- 📋 Export test results

---

## 🎯 **Your Collection Structure**

```
📁 Basma Backend API
├── 🏥 Health & Info (basic endpoints)
├── 🔐 Authentication (login, register, reset)
├── 👤 User Management (profile endpoints)
├── 👑 Super Admin
│   ├── 📊 System Management
│   ├── 👥 User Management
│   ├── 📋 Bulk Operations
│   └── 🔒 Security & Audit
├── 📊 Monitoring
└── 🧪 Test Authorization
```

---

_Test like a pro, catch bugs early!_




