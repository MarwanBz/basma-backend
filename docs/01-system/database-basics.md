# Database Basics

## What Database We Use

**MySQL** with **Prisma** as our database tool

## Main Tables

### `user` table
```sql
- id          (unique identifier)
- name        (user's name) 
- email       (login email)
- password    (hashed password)
- role        (SUPER_ADMIN, CUSTOMER, etc.)
- createdAt   (when they joined)
```

## User Roles in Database

```typescript
enum user_role {
  SUPER_ADMIN       // System admin
  MAINTENANCE_ADMIN // Regional manager  
  BASMA_ADMIN      // Building manager
  TECHNICIAN       // Repair person
  CUSTOMER         // Service requester
  ADMIN           // Legacy (kept for compatibility)
  USER            // Legacy (kept for compatibility)  
}
```

## How Prisma Works

Instead of writing SQL:
```sql
SELECT * FROM user WHERE email = 'user@example.com'
```

We write TypeScript:
```typescript
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
})
```

## Database Schema File

Location: `prisma/schema.prisma`

This file defines:
- ✅ Table structure
- ✅ Data types  
- ✅ Relationships
- ✅ Constraints

## Migrations

When we change the database structure:

1. **Update** `schema.prisma`
2. **Create migration**: `prisma migrate dev`
3. **Apply to database**: `prisma migrate deploy`

## Recent Changes

### Added New Roles
```diff
enum user_role {
+  SUPER_ADMIN
+  MAINTENANCE_ADMIN  
+  BASMA_ADMIN
+  TECHNICIAN
+  CUSTOMER
   ADMIN     // Kept for compatibility
   USER      // Kept for compatibility
}
```

**Migration**: `20250925174250_add_system_roles`

## Database Queries Examples

### Find user by email
```typescript
const user = await prisma.user.findUnique({
  where: { email }
})
```

### Get all users with pagination
```typescript
const users = await prisma.user.findMany({
  take: 10,      // Limit to 10
  skip: 0,       // Start from beginning
  orderBy: { createdAt: 'desc' }
})
```

### Create new user
```typescript
const user = await prisma.user.create({
  data: {
    name: "John Doe",
    email: "john@example.com", 
    password: hashedPassword,
    role: "CUSTOMER"
  }
})
```

## Database Connection

Configured in: `src/config/database.ts`

Uses environment variable:
```bash
MYSQL_DATABASE_URL="mysql://user:pass@host:port/database"
```

---
*Simple structure, powerful queries!*
