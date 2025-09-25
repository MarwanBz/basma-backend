# How Authentication Works

## Simple Login Flow

```
1. User sends email + password
2. Server checks if correct
3. Server creates JWT token  
4. User gets token back
5. User includes token in future requests
6. Server checks token on each request
```

## JWT Token Contains

```json
{
  "userId": "abc-123",
  "role": "SUPER_ADMIN", 
  "expires": "2025-01-26"
}
```

## How We Check Permissions

### Step 1: Check if logged in
```typescript
const token = req.headers.authorization
if (!token) return "Please login"
```

### Step 2: Check token is valid
```typescript
const user = jwt.verify(token, SECRET_KEY)
if (!user) return "Invalid token"
```

### Step 3: Check role permissions
```typescript
if (user.role !== "SUPER_ADMIN") {
  return "Access denied"
}
```

## Protected Routes

| Route | Who Can Access |
|-------|---------------|
| `/api/auth/login` | ✅ Everyone |
| `/api/auth/signup` | ✅ Everyone |
| `/api/users` | 🔒 Logged in users |
| `/api/super-admin/*` | 🔒 Super Admins only |

## Email Verification

**Current Status**: ⚠️ **DISABLED** for development

```typescript
// DISABLED FOR NOW (easier testing)
// if (!user.emailVerified) {
//   return "Please verify email first"
// }
```

**Why disabled?**
- Faster development
- Easier testing  
- No email setup needed

**To enable**: Uncomment the code in `auth.service.ts`

## Security Features

- ✅ **Password hashing** with bcrypt
- ✅ **JWT tokens** with expiration
- ✅ **Role-based access** control
- ✅ **Rate limiting** to prevent spam
- ✅ **Input validation** with Zod

## Common Auth Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "No token provided" | Missing Authorization header | Add `Bearer token` |
| "Invalid token" | Token expired/wrong | Login again |
| "Access denied" | Wrong role | Check user permissions |

---
*Secure but simple!*
