# User Roles

## The 5 Types of Users

```
👑 SUPER_ADMIN     (Can do everything)
    ↓
🏢 MAINTENANCE_ADMIN (Manages regions)
    ↓
🏪 BASMA_ADMIN     (Manages 1 building)
    ↓
🔧 TECHNICIAN      (Fixes things)
    ↓
👤 CUSTOMER        (Requests repairs)
```

## Who Can Do What?

### 👑 **SUPER_ADMIN**

- ✅ Control everything
- ✅ Create any user type
- ✅ See all system data
- ✅ Change system settings

### 🏢 **MAINTENANCE_ADMIN**

- ✅ Manage multiple buildings
- ✅ Create Basma Admins & Technicians
- ✅ See regional reports
- ❌ Cannot create Super Admins

### 🏪 **BASMA_ADMIN**

- ✅ Manage their building only
- ✅ Create Technicians & Customers
- ✅ Assign repair tasks
- ❌ Cannot see other buildings

### 🔧 **TECHNICIAN**

- ✅ See their assigned tasks
- ✅ Update work status
- ✅ Mark jobs complete
- ❌ Cannot create users

### 👤 **CUSTOMER**

- ✅ Submit repair requests
- ✅ Track their requests
- ✅ Rate completed work
- ❌ Cannot see others' requests

## Quick Permission Check

| Can they...        | Super  | Maintenance | Basma  | Tech | Customer |
| ------------------ | ------ | ----------- | ------ | ---- | -------- |
| Create users?      | ✅ All | ✅ Some     | ✅ Few | ❌   | ❌       |
| See all buildings? | ✅     | ✅          | ❌     | ❌   | ❌       |
| Approve requests?  | ✅     | ✅          | ✅     | ❌   | ❌       |
| Submit requests?   | ✅     | ✅          | ✅     | ✅   | ✅       |

## In the Code

The roles are stored as:

```typescript
enum user_role {
  SUPER_ADMIN
  MAINTENANCE_ADMIN
  BASMA_ADMIN
  TECHNICIAN
  CUSTOMER
}
```

And checked with:

```typescript
if (user.role !== "SUPER_ADMIN") {
  return "Access denied";
}
```

---

_Simple hierarchy, clear permissions!_
