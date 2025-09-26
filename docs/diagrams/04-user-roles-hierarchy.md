# 👑 User Roles Hierarchy Diagram

## Overview

This diagram shows the complete user role hierarchy in the Basma Backend system, including permissions and access levels for each role.

## User Roles Hierarchy

```mermaid
graph TD
    subgraph "👑 SUPER ADMIN - Highest Authority"
        SA[👑 SUPER_ADMIN<br/>🔴 Highest Authority<br/>🔴 Full System Access]
        SA_PERMS[✅ Manage all users<br/>✅ Access system stats<br/>✅ View security logs<br/>✅ Perform bulk operations<br/>✅ System configuration<br/>✅ Audit trail access]
    end

    subgraph "🏢 ADMINISTRATIVE ROLES"
        MA[🔧 MAINTENANCE_ADMIN<br/>🟠 Maintenance Operations<br/>🟠 Technical Management]
        BA[🏢 BASMA_ADMIN<br/>🟡 Basma Operations<br/>🟡 Business Management]
        MA_PERMS[✅ Manage maintenance<br/>✅ Access maintenance data<br/>✅ Schedule operations<br/>✅ Monitor equipment]
        BA_PERMS[✅ Manage Basma data<br/>✅ Business operations<br/>✅ Customer relations<br/>✅ Report generation]
    end

    subgraph "👨‍🔧 OPERATIONAL ROLES"
        TECH[👨‍🔧 TECHNICIAN<br/>🟢 Technical Tasks<br/>🟢 Field Operations]
        TECH_PERMS[✅ Perform technical work<br/>✅ Access technical resources<br/>✅ Update work status<br/>✅ View assigned tasks]
    end

    subgraph "👤 CUSTOMER ROLES"
        CUST[👤 CUSTOMER<br/>🔵 Customer Features<br/>🔵 Service Access]
        CUST_PERMS[✅ Access customer features<br/>✅ View own data<br/>✅ Request services<br/>✅ View service history]
    end

    subgraph "🔄 LEGACY ROLES"
        ADMIN[👨‍💼 ADMIN<br/>🟣 Legacy Admin<br/>🟣 Limited Permissions]
        USER[👤 USER<br/>⚪ Basic User<br/>⚪ Default Role]
        ADMIN_PERMS[✅ Manage users (limited)<br/>✅ Access admin features<br/>✅ View reports]
        USER_PERMS[✅ View own profile<br/>✅ Basic operations<br/>✅ Limited access]
    end

    %% Hierarchy connections
    SA --> MA
    SA --> BA
    SA --> TECH
    SA --> CUST
    SA --> ADMIN
    SA --> USER

    MA --> TECH
    BA --> CUST

    %% Permission connections
    SA --> SA_PERMS
    MA --> MA_PERMS
    BA --> BA_PERMS
    TECH --> TECH_PERMS
    CUST --> CUST_PERMS
    ADMIN --> ADMIN_PERMS
    USER --> USER_PERMS

    %% Styling with high contrast colors
    classDef superAdmin fill:#ff6b6b,stroke:#c62828,stroke-width:3px,color:#fff
    classDef maintenance fill:#ff9800,stroke:#e65100,stroke-width:2px,color:#fff
    classDef basma fill:#ffc107,stroke:#f57f17,stroke-width:2px,color:#000
    classDef technician fill:#4caf50,stroke:#2e7d32,stroke-width:2px,color:#fff
    classDef customer fill:#2196f3,stroke:#1565c0,stroke-width:2px,color:#fff
    classDef legacy fill:#9c27b0,stroke:#6a1b9a,stroke-width:2px,color:#fff
    classDef basic fill:#9e9e9e,stroke:#424242,stroke-width:2px,color:#fff
    classDef permissions fill:#f5f5f5,stroke:#757575,stroke-width:1px,color:#000

    class SA superAdmin
    class MA,MA_PERMS maintenance
    class BA,BA_PERMS basma
    class TECH,TECH_PERMS technician
    class CUST,CUST_PERMS customer
    class ADMIN,ADMIN_PERMS legacy
    class USER,USER_PERMS basic
```

## Role Permissions Matrix

| Role                  | User Management  | System Access     | Data Access         | Operations          | Reports                |
| --------------------- | ---------------- | ----------------- | ------------------- | ------------------- | ---------------------- |
| **SUPER_ADMIN**       | ✅ All Users     | ✅ Full System    | ✅ All Data         | ✅ All Operations   | ✅ All Reports         |
| **MAINTENANCE_ADMIN** | ❌ Limited       | ✅ Maintenance    | ✅ Maintenance Data | ✅ Maintenance Ops  | ✅ Maintenance Reports |
| **BASMA_ADMIN**       | ❌ Limited       | ✅ Basma System   | ✅ Basma Data       | ✅ Basma Operations | ✅ Basma Reports       |
| **TECHNICIAN**        | ❌ None          | ✅ Technical      | ✅ Assigned Tasks   | ✅ Technical Work   | ✅ Work Reports        |
| **CUSTOMER**          | ❌ None          | ✅ Customer       | ✅ Own Data         | ✅ Service Requests | ✅ Own Reports         |
| **ADMIN**             | ✅ Limited Users | ✅ Admin Features | ✅ Limited Data     | ✅ Admin Operations | ✅ Admin Reports       |
| **USER**              | ❌ None          | ✅ Basic          | ✅ Own Profile      | ✅ Basic Operations | ❌ None                |

## Detailed Role Descriptions

### 👑 SUPER_ADMIN

**Highest authority level with complete system access**

**Permissions:**

- ✅ Create, read, update, delete any user
- ✅ Access all system statistics and metrics
- ✅ View security logs and audit trails
- ✅ Perform bulk operations on users
- ✅ Configure system settings
- ✅ Access all monitoring data
- ✅ Manage all user roles
- ✅ Override any restrictions

**Use Cases:**

- System administration
- Emergency access
- User management
- Security monitoring
- System configuration

### 🔧 MAINTENANCE_ADMIN

**Manages maintenance operations and technical systems**

**Permissions:**

- ✅ Manage maintenance schedules
- ✅ Access maintenance-related data
- ✅ Monitor equipment status
- ✅ Assign maintenance tasks
- ✅ View maintenance reports
- ✅ Update maintenance records
- ❌ Cannot manage users outside maintenance

**Use Cases:**

- Equipment maintenance
- Preventive maintenance
- Maintenance scheduling
- Technical oversight

### 🏢 BASMA_ADMIN

**Manages Basma-specific business operations**

**Permissions:**

- ✅ Manage Basma business data
- ✅ Handle customer relations
- ✅ Generate business reports
- ✅ Access Basma-specific features
- ✅ Manage Basma operations
- ✅ View business metrics
- ❌ Cannot access technical systems

**Use Cases:**

- Business management
- Customer service
- Business reporting
- Operations management

### 👨‍🔧 TECHNICIAN

**Performs technical tasks and field operations**

**Permissions:**

- ✅ Access assigned technical tasks
- ✅ Update work status
- ✅ View technical resources
- ✅ Report work completion
- ✅ Access technical documentation
- ✅ View assigned equipment
- ❌ Cannot manage other users

**Use Cases:**

- Field work
- Technical repairs
- Equipment maintenance
- Work reporting

### 👤 CUSTOMER

**End customer with access to customer features**

**Permissions:**

- ✅ View own profile and data
- ✅ Request services
- ✅ View service history
- ✅ Access customer portal
- ✅ Update own information
- ✅ View service status
- ❌ Cannot access admin features

**Use Cases:**

- Service requests
- Account management
- Service tracking
- Customer support

### 👨‍💼 ADMIN (Legacy)

**Legacy admin role with limited permissions**

**Permissions:**

- ✅ Manage users (limited scope)
- ✅ Access admin features
- ✅ View admin reports
- ✅ Basic user operations
- ❌ Cannot access system configuration
- ❌ Cannot view security logs

**Use Cases:**

- Basic user management
- Admin operations
- Limited reporting

### 👤 USER (Default)

**Basic user with minimal permissions**

**Permissions:**

- ✅ View own profile
- ✅ Update own information
- ✅ Basic operations
- ❌ Cannot manage other users
- ❌ Cannot access admin features
- ❌ Cannot view reports

**Use Cases:**

- Basic account access
- Profile management
- Limited functionality

## Role Assignment Rules

### 🔄 Role Hierarchy Rules

1. **SUPER_ADMIN** can assign any role to any user
2. **MAINTENANCE_ADMIN** can assign TECHNICIAN role
3. **BASMA_ADMIN** can assign CUSTOMER role
4. **ADMIN** can assign USER role
5. **Lower roles** cannot assign higher roles

### 🛡️ Security Rules

1. **Role escalation** requires SUPER_ADMIN approval
2. **Bulk role changes** require SUPER_ADMIN
3. **Role deletion** requires SUPER_ADMIN
4. **Cross-role access** is restricted

### 📊 Audit Requirements

1. **All role changes** are logged
2. **Permission usage** is tracked
3. **Failed access attempts** are monitored
4. **Role assignments** require justification

## API Endpoint Access by Role

### 🔐 Authentication Endpoints

- **All roles**: Login, logout, password reset
- **SUPER_ADMIN**: User creation, role assignment

### 👤 User Management Endpoints

- **SUPER_ADMIN**: Full CRUD operations
- **ADMIN**: Limited user management
- **Other roles**: View own profile only

### 📊 Monitoring Endpoints

- **SUPER_ADMIN**: All monitoring data
- **MAINTENANCE_ADMIN**: Maintenance metrics
- **BASMA_ADMIN**: Business metrics
- **Other roles**: Limited access

### 🔧 System Endpoints

- **SUPER_ADMIN**: Full system access
- **Other roles**: No system access

