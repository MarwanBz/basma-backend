# Super Admin Module

## What It Does

Super Admin can manage ALL users and system settings.

## 🗂️ Files Created

1. **`super-admin.service.ts`** - Business logic (287 lines)
2. **`super-admin.controller.ts`** - Request handling (120 lines)  
3. **`super-admin.routes.ts`** - API endpoints (158 lines)

## 🔒 Security

### **Authentication Required**
```typescript
router.use(requireAuth);  // Must be logged in
```

### **Role Check**
```typescript
const superAdminMiddleware = (req, res, next) => {
  if (req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      message: "Access denied. Super Admin role required."
    });
  }
  next();
};
```

## 📡 API Endpoints

### **User Management**
```
POST   /api/super-admin/users              # Create user
GET    /api/super-admin/users              # Get all users (with pagination)
GET    /api/super-admin/users/:id          # Get specific user  
PUT    /api/super-admin/users/:id          # Update user
DELETE /api/super-admin/users/:id          # Delete user
```

### **Bulk Operations**
```
POST   /api/super-admin/users/bulk-update  # Update multiple users
POST   /api/super-admin/users/bulk-delete  # Delete multiple users
```

### **System Info**
```
GET    /api/super-admin/system/stats       # System statistics
GET    /api/super-admin/security/logs      # Security logs  
GET    /api/super-admin/audit/logs         # Audit logs
```

## 💡 Key Features

### **Create Any User Type**
```typescript
await superAdminService.createUser({
  name: "John Doe",
  email: "john@example.com", 
  password: "SecurePass123!",
  role: "TECHNICIAN"  // Can be any role
});
```

### **Pagination Support**
```typescript
const users = await superAdminService.getAllUsers(
  page: 1,
  limit: 10,
  role: "TECHNICIAN"  // Optional filter
);
```

### **System Statistics**
```typescript
const stats = {
  totalUsers: 50,
  usersByRole: [
    { role: "CUSTOMER", count: 25 },
    { role: "TECHNICIAN", count: 15 },
    // ...
  ],
  recentUsers: 5,  // Last 7 days
  verificationRate: 80  // % verified emails
}
```

## 🧪 How to Test

### **1. Create Super Admin**
```bash
npx ts-node scripts/create-super-admin.ts
```

### **2. Test All Endpoints** 
```bash
npx ts-node scripts/test-super-admin-http.ts
```

### **3. Login Credentials**
```
Email: superadmin@basma.com
Password: SuperAdmin123!
```

## 🔧 Common Operations

### **Login as Super Admin**
```bash
curl -X POST http://localhost:4300/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@basma.com","password":"SuperAdmin123!"}'
```

### **Get System Stats**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4300/api/super-admin/system/stats
```

### **Create New User**
```bash
curl -X POST http://localhost:4300/api/super-admin/users \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "name": "New User",
    "email": "newuser@example.com",
    "password": "SecurePass123!", 
    "role": "CUSTOMER"
  }'
```

## ⚡ Performance Features

- ✅ **Pagination** for large user lists
- ✅ **Role filtering** to find specific user types
- ✅ **Bulk operations** for efficiency
- ✅ **Optimized queries** with Prisma
- ✅ **Error handling** for all operations

## 🛡️ Error Handling

```typescript
try {
  const user = await superAdminService.createUser(data);
  return { success: true, data: user };
} catch (error) {
  if (error.message === "Email already exists") {
    return { success: false, error: "User exists" };
  }
  throw error;  // Unknown error
}
```

---
*Full control, full responsibility!*
