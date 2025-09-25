# Prisma Migrations - Quick Guide

## Essential Commands

### **Create New Migration**

```bash
# After changing schema.prisma
npx prisma migrate dev --name your_migration_name

# Example:
npx prisma migrate dev --name add_user_roles
```

### **Apply Migrations**

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

### **Check Migration Status**

```bash
npx prisma migrate status
```

### **Reset Everything (DANGER!)**

```bash
# Deletes all data and re-runs migrations
npx prisma migrate reset
```

## Step-by-Step Workflow

### **1. Modify Schema**

Edit `prisma/schema.prisma`:

```typescript
enum user_role {
  SUPER_ADMIN     // ← Add new role
  CUSTOMER        // ← Add new role
  ADMIN          // ← Keep old role
}
```

### **2. Create Migration**

```bash
npx prisma migrate dev --name add_system_roles
```

This creates:

- `migrations/20250925174250_add_system_roles/migration.sql`
- Updates your database
- Regenerates Prisma client

### **3. Update Code**

```typescript
// Now you can use new roles
const user = await prisma.user.create({
  data: {
    role: "SUPER_ADMIN", // ← New role works!
  },
});
```

## Migration Files Structure

```
prisma/
├── schema.prisma                    # Your data model
└── migrations/
    ├── migration_lock.toml          # Lock file
    └── 20250925174250_add_system_roles/
        └── migration.sql            # SQL commands
```

## Reading Migration Files

**File:** `20250925174250_add_system_roles/migration.sql`

```sql
-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM(
  'SUPER_ADMIN',
  'MAINTENANCE_ADMIN',
  'BASMA_ADMIN',
  'TECHNICIAN',
  'CUSTOMER',
  'ADMIN',
  'USER'
) NOT NULL DEFAULT 'USER';
```

**Translation:** "Change the user table's role column to accept 7 different values instead of 2"

## Common Use Cases

### **Add New Column**

```typescript
// In schema.prisma
model user {
  id    String @id
  phone String? // ← Add this
}
```

```bash
npx prisma migrate dev --name add_user_phone
```

### **Change Column Type**

```typescript
// Change VARCHAR(50) to VARCHAR(100)
model user {
  name String @db.VarChar(100) // ← Increase size
}
```

### **Add New Table**

```typescript
model Order {
  id     String @id @default(uuid())
  userId String
  user   user   @relation(fields: [userId], references: [id])
}
```

## Best Practices

### **Migration Names**

```bash
# ✅ Good names (descriptive)
npx prisma migrate dev --name add_user_roles
npx prisma migrate dev --name add_order_table
npx prisma migrate dev --name fix_email_unique_constraint

# ❌ Bad names (unclear)
npx prisma migrate dev --name update
npx prisma migrate dev --name fix
npx prisma migrate dev --name changes
```

### **Testing Migrations**

```bash
# 1. Test on development first
npx prisma migrate dev

# 2. Run your tests
npm test

# 3. Then apply to production
npx prisma migrate deploy
```

### **Safe Production Deployment**

```bash
# 1. Backup database first
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql

# 2. Apply migration
npx prisma migrate deploy

# 3. Test application
curl http://your-app/health
```

## Emergency Commands

### **Check What Will Happen (Dry Run)**

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

### **Manual Migration Fix**

```bash
# Mark migration as applied (if you applied manually)
npx prisma migrate resolve --applied 20250925174250_add_system_roles
```

### **Create Migration Without Applying**

```bash
npx prisma migrate dev --create-only --name add_user_roles
# Edit the SQL file if needed
npx prisma migrate dev  # Then apply
```

---

_Migrate with confidence, one step at a time!_
