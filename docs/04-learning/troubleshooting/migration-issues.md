# Migration Troubleshooting

## Common Migration Problems & Solutions

### **Problem 1: "Invalid value for argument role"**

**Error:**

```
Invalid value for argument `role`. Expected user_role.
```

**Cause:** Using old role names in new code

```typescript
// ❌ Wrong - using old role
await prisma.user.create({
  data: { role: "ADMIN" }, // This still works but...
});

// ❌ Wrong - using non-existent role
await prisma.user.create({
  data: { role: "MANAGER" }, // This doesn't exist!
});
```

**Solution:** Use new role names

```typescript
// ✅ Correct - using new roles
await prisma.user.create({
  data: { role: "SUPER_ADMIN" },
});

await prisma.user.create({
  data: { role: "CUSTOMER" },
});
```

---

### **Problem 2: "Migration failed to apply"**

**Error:**

```
Migration failed: Database is not empty
```

**Cause:** Database has data that conflicts with new schema

**Solution:**

```bash
# 1. Backup your data first!
mysqldump -u user -p database > backup.sql

# 2. Reset migrations
npx prisma migrate reset

# 3. Apply migrations again
npx prisma migrate dev
```

---

### **Problem 3: "Existing users have invalid roles"**

**Problem:** Old users have ADMIN role, but code expects SUPER_ADMIN

**Check existing users:**

```sql
SELECT email, role FROM user WHERE role IN ('ADMIN', 'USER');
```

**Solution:** Update existing users manually

```sql
-- Promote important ADMINs to SUPER_ADMIN
UPDATE user SET role = 'SUPER_ADMIN'
WHERE email = 'boss@company.com' AND role = 'ADMIN';

-- Convert regular USERs to CUSTOMERs
UPDATE user SET role = 'CUSTOMER'
WHERE role = 'USER';
```

---

### **Problem 4: "Role not recognized in TypeScript"**

**Error:**

```typescript
Type '"SUPER_ADMIN"' is not assignable to type 'user_role'
```

**Cause:** TypeScript types not updated after migration

**Solution:**

```bash
# Regenerate Prisma client
npx prisma generate
```

---

### **Problem 5: "Can't access API after migration"**

**Error:** `403 Forbidden` when trying to access endpoints

**Cause:** Your user has old role, but endpoint expects new role

**Check your user's role:**

```sql
SELECT role FROM user WHERE email = 'your-email@example.com';
```

**Solution:** Update your user's role

```sql
UPDATE user SET role = 'SUPER_ADMIN'
WHERE email = 'your-email@example.com';
```

---

## Prevention Tips

### **Before Running Migration:**

1. ✅ **Backup database**
2. ✅ **Test on development first**
3. ✅ **Plan role mapping** (which ADMIN becomes which new role)
4. ✅ **Update test data**

### **After Running Migration:**

1. ✅ **Run `npx prisma generate`**
2. ✅ **Update existing users' roles**
3. ✅ **Test all API endpoints**
4. ✅ **Update test scripts**

### **Quick Health Check:**

```bash
# Check migration applied
npx prisma migrate status

# Test role creation
npx ts-node scripts/create-super-admin.ts

# Test API endpoints
npx ts-node scripts/test-super-admin-http.ts
```

## Emergency Rollback

**If everything breaks:**

1. **Stop the server**

```bash
# Stop your app
pkill -f "yarn dev"
```

2. **Restore database**

```bash
# Restore from backup
mysql -u user -p database < backup.sql
```

3. **Reset to previous schema**

```bash
# Go back to previous migration
git checkout HEAD~1 -- prisma/schema.prisma
npx prisma db push
```

---

_Better safe than sorry - always backup first!_
