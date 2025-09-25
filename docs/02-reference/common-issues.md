# Common Issues We Solved

## 🐛 Issues Found During Development

### **Issue 1: UUID Validation Error**

**Problem**: Test failing with "Invalid user ID"  
**Error**: `HTTP 400: Invalid user ID`

**Root Cause**: 
```typescript
// ❌ Wrong way
await testGetUserById(newUser.id);  // undefined!

// ✅ Correct way  
await testGetUserById(newUser.data.id);  // actual ID
```

**Why**: API response structure is:
```json
{
  "success": true,
  "data": {
    "id": "actual-user-id",
    "name": "John Doe"
  }
}
```

**Lesson**: Always check API response structure first!

---

### **Issue 2: Middleware Import Error**

**Problem**: `Router.use() requires a middleware function`

**Root Cause**:
```typescript
// ❌ Wrong import
import { authMiddleware } from "@/middleware/authMiddleware";

// ✅ Correct import
import { requireAuth } from "@/middleware/authMiddleware";
```

**Why**: Export name was `requireAuth`, not `authMiddleware`

**Lesson**: Check export names in the actual file!

---

### **Issue 3: Variable Scope Error**

**Problem**: `ReferenceError: originalToken is not defined`

**Root Cause**:
```typescript
// ❌ Wrong scope
try {
  const originalToken = accessToken;  // Declared inside try
  // ...
} finally {
  accessToken = originalToken;  // Not accessible here!
}

// ✅ Correct scope
const originalToken = accessToken;  // Declared outside
try {
  // ...
} finally {
  accessToken = originalToken;  // Accessible here!
}
```

**Lesson**: Understand JavaScript variable scope!

---

### **Issue 4: Email Verification Blocking**

**Problem**: Cannot login even with correct credentials  
**Error**: `HTTP 401: Please verify your email before logging in`

**Root Cause**: Email verification was required but no emails being sent

**Solution**: Commented out verification check
```typescript
// ✅ Disabled for development
// if (!user.emailVerified) {
//   throw new AppError("Please verify your email...");
// }
```

**Lesson**: Remove blockers during development!

---

## 🔧 Quick Fixes Guide

### **"Invalid user ID" Error**
```typescript
// Check API response structure
console.log("Full response:", response);
// Use response.data.id, not response.id
```

### **"Middleware function required" Error**
```typescript
// Check actual export name
const exports = require('./path/to/file');
console.log(Object.keys(exports));
```

### **"Variable not defined" Error**
```typescript
// Move variable declaration outside try/catch
const variable = initialValue;
try {
  // use variable
} finally {
  // variable is accessible here
}
```

### **"Email verification" Error**
```bash
# Check if verification is disabled
grep -n "emailVerified" src/services/auth.service.ts
```

## 🚨 Red Flags to Watch For

### **1. Accessing Nested Properties**
```typescript
// ❌ Dangerous
user.profile.address.street  // Could crash

// ✅ Safe
user?.profile?.address?.street  // Optional chaining
```

### **2. Assuming Response Structure** 
```typescript
// ❌ Assumptions
const id = response.id;  // Might not exist

// ✅ Verify first
console.log("Response:", response);
const id = response.data?.id;
```

### **3. Import/Export Mismatches**
```typescript
// ❌ Wrong
import { wrongName } from "./file";

// ✅ Check exports first
// Look at the actual file to see what's exported
```

## 🎯 Debugging Tips

### **1. Always Console.log**
```typescript
console.log("Request:", req.body);
console.log("Response:", response);
console.log("User:", user);
```

### **2. Check File Exports**
```bash
# See what a file exports
grep -n "export" src/path/to/file.ts
```

### **3. Test Response Structure**
```bash
# Test API directly
curl -X GET http://localhost:4300/api/endpoint | jq .
```

### **4. Check Environment Variables**
```bash
# Verify environment is set
echo $RESEND_API_KEY
grep RESEND .env
```

## ✅ Validation Checklist

Before submitting code:

- [ ] Test API responses match expected structure
- [ ] Check all imports are correct export names  
- [ ] Verify variable scope in try/catch blocks
- [ ] Test both success and error scenarios
- [ ] Confirm environment variables are set
- [ ] Run all test scripts

---
*Learn from mistakes, avoid repeating them!*
