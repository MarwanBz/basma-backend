# Database Migrations

## What is a Database Migration?

A **migration** is a way to change your database structure safely.

Think of it like renovating a house while people are still living in it - you need to do it carefully so nothing breaks.

## Why Use Migrations?

### **Problem without migrations:**

```
❌ Change database directly
❌ Other developers get confused
❌ Production database breaks
❌ Can't undo changes easily
```

### **Solution with migrations:**

```
✅ Track all database changes
✅ Share changes with team
✅ Apply changes safely
✅ Can undo if needed
```

## How Migrations Work

### Step 1: Write Migration File

```sql
-- 20250925174250_add_system_roles/migration.sql
ALTER TABLE user MODIFY role ENUM('SUPER_ADMIN', 'CUSTOMER', ...);
```

### Step 2: Apply Migration

```bash
npx prisma migrate dev
```

### Step 3: Database Updates

```
Before: user.role can be 'ADMIN' or 'USER'
After:  user.role can be 'SUPER_ADMIN', 'CUSTOMER', etc.
```

## Real World Example

**Like adding new floors to a building:**

- Floor 1: USER (basement - basic access)
- Floor 2: CUSTOMER (ground - can request things)
- Floor 3: TECHNICIAN (first floor - can fix things)
- Floor 4: BASMA_ADMIN (second floor - can manage building)
- Floor 5: SUPER_ADMIN (penthouse - can control everything)

## Migration Safety Rules

1. ✅ **Always backup** before migrating
2. ✅ **Test on development** first
3. ✅ **Keep old data** when possible
4. ✅ **Write descriptive names** for migrations

## Common Migration Types

| Type              | Example                                  | When to Use               |
| ----------------- | ---------------------------------------- | ------------------------- |
| **Add Column**    | `ALTER TABLE user ADD COLUMN phone`      | New feature needs data    |
| **Change Column** | `ALTER TABLE user MODIFY role ENUM(...)` | Update existing field     |
| **Add Table**     | `CREATE TABLE orders`                    | New feature needs storage |
| **Add Index**     | `CREATE INDEX ON user(email)`            | Performance improvement   |

---

_Change safely, step by step!_
