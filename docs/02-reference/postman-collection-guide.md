# Postman Collection Guide

## 📋 Collection Overview

**File:** `basma-api-postman-collection.json`  
**Purpose:** Complete API testing for Basma Backend

## 🗂️ Collection Structure

### **🏥 Health & Info**

- Health Check (`GET /health`)
- API Documentation (`GET /api-docs`)

### **🔐 Authentication**

- Register new user
- **Login** (auto-saves token)
- Forgot/Reset password
- Refresh token

### **👤 User Management**

- Get current user profile
- Update current user

### **👑 Super Admin**

- **📊 System Management:** Get system statistics
- **👥 User Management:** Full CRUD operations
- **📋 Bulk Operations:** Create/update/delete multiple users
- **🔒 Security & Audit:** View logs and system activity

### **📊 Monitoring**

- Get application metrics

### **🧪 Test Authorization**

- Test invalid/missing tokens

## ⚙️ Quick Setup

1. **Import:** `File → Import → basma-api-postman-collection.json`
2. **Environment Variables:**
   - `base_url`: `http://localhost:4300`
   - `access_token`: (auto-set after login)
3. **Test:** Start with Login → System Stats

## 🎯 Key Features

- ✅ **Auto-saves tokens** after login
- ✅ **Auto-saves user IDs** after creation
- ✅ **Pre-configured auth** on protected endpoints
- ✅ **Organized folders** for easy navigation
- ✅ **Sample data** in all requests

## 🚀 Testing Workflow

```
1. Login → Get token
2. System Stats → Verify Super Admin access
3. Create User → Test user creation
4. Get All Users → See results
5. Test Authorization → Verify security
```

**Perfect for testing your entire API in minutes!**
