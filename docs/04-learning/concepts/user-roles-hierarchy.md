# User Roles Hierarchy

## Why We Created Role Hierarchy

### **Before: Flat Structure**

```
ADMIN ← Can do everything? Not clear!
USER  ← Can do nothing? Also not clear!
```

**Problems:**

- ❌ Confusing permissions
- ❌ No job separation
- ❌ Security issues
- ❌ Hard to manage

### **After: Clear Hierarchy**

```
👑 SUPER_ADMIN      ← System boss
   ↓
🏢 MAINTENANCE_ADMIN ← Regional manager
   ↓
🏪 BASMA_ADMIN      ← Building manager
   ↓
🔧 TECHNICIAN       ← Worker
   ↓
👤 CUSTOMER         ← Service requester
```

**Benefits:**

- ✅ Clear permissions
- ✅ Realistic job roles
- ✅ Better security
- ✅ Easy to understand

## Real World Comparison

**Like a company structure:**

### **Pizza Company Example**

```
👑 CEO (SUPER_ADMIN)
   ↓ Controls whole company
🏢 Regional Manager (MAINTENANCE_ADMIN)
   ↓ Manages multiple stores
🏪 Store Manager (BASMA_ADMIN)
   ↓ Manages one store
🔧 Pizza Maker (TECHNICIAN)
   ↓ Makes pizzas
👤 Customer (CUSTOMER)
   ↓ Orders pizza
```

### **Hospital Example**

```
👑 Hospital Director (SUPER_ADMIN)
🏢 Department Head (MAINTENANCE_ADMIN)
🏪 Ward Supervisor (BASMA_ADMIN)
🔧 Nurse (TECHNICIAN)
👤 Patient (CUSTOMER)
```

## Permission Flow

**Higher roles can manage lower roles:**

```
SUPER_ADMIN → Can create/manage ALL roles
MAINTENANCE_ADMIN → Can create BASMA_ADMIN, TECHNICIAN, CUSTOMER
BASMA_ADMIN → Can create TECHNICIAN, CUSTOMER
TECHNICIAN → Cannot create users
CUSTOMER → Cannot create users
```

## Why This Makes Sense

### **Security Principle: "Least Privilege"**

- Give people only the permissions they need for their job
- CUSTOMER doesn't need to create users
- TECHNICIAN doesn't need to see all buildings
- BASMA_ADMIN doesn't need system settings

### **Business Logic**

- Mirrors real organizational structure
- Clear chain of command
- Easy to explain to stakeholders
- Scalable as company grows

## Benefits We Got

1. **Clear Responsibilities**
   - Everyone knows what they can/can't do
   - No confusion about permissions

2. **Better Security**
   - Customers can't access admin functions
   - Technicians can't create other users
   - Admins can't break the whole system

3. **Realistic Management**
   - Building admin manages their building only
   - Regional admin manages multiple buildings
   - Makes sense for real business

4. **Easy Expansion**
   - Can add new roles easily
   - Can adjust permissions as needed
   - Hierarchy scales naturally

---

_Structure creates clarity, clarity creates security!_
