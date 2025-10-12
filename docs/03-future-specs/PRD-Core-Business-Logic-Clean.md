# 📋 Product Requirements Document (PRD)

## Basma Maintenance Management System - Core Business Logic

---

## 📊 Document Information

| Field             | Value                               |
| ----------------- | ----------------------------------- |
| **Document Type** | Product Requirements Document (PRD) |
| **Product**       | Basma Maintenance Management System |
| **Version**       | 2.0                                 |
| **Date**          | 2024-01-15                          |
| **Author**        | Development Team                    |
| **Status**        | Draft                               |

---

## 🎯 Executive Summary

### **Product Vision**

Basma is a focused maintenance request management system designed for Basma Real Estate Investment and Development Company to streamline maintenance request handling across multiple properties and buildings.

### **Core Business Problem**

- **Manual maintenance request tracking** leading to delays and inefficiencies
- **Poor communication** between customers, technicians, and management
- **Lack of visibility** into maintenance request status and progress
- **No centralized request management** system

### **Solution Overview**

A role-based maintenance request platform that enables:

- **Streamlined request lifecycle** from creation to completion
- **Simple workflow management** with clear status tracking
- **Basic technician assignment** (self-assignment or manual)
- **Role-based access control** with appropriate permissions
- **Real-time status updates** and progress tracking

---

## 🏢 Business Context

### **Company Background**

- **Company**: Basma Real Estate Investment and Development Company
- **Industry**: Real Estate Management
- **Focus**: Property maintenance request management
- **Scale**: Multiple buildings and properties across regions

### **Target Users**

1. **Property Owners/Managers** (Basma Admin)
2. **Maintenance Managers** (Maintenance Admin)
3. **Technicians** (Field Workers)
4. **Tenants/Customers** (Service Requesters)
5. **System Administrators** (Super Admin)

---

## 🎯 Core Business Logic

### **1. Maintenance Request Management**

#### **1.1 Request Lifecycle**

```
📝 DRAFT → 📤 SUBMITTED → 👤 ASSIGNED → 🔧 IN_PROGRESS → ✅ COMPLETED → 🔒 CLOSED
                                    ↓
                                 ❌ REJECTED
```

#### **1.2 Business Rules**

- **Request Creation**: Any authenticated user can create maintenance requests
- **Priority Assignment**: Low, Medium, High, Urgent (manually set)
- **Status Transitions**: Only authorized users can change specific statuses
- **Completion Approval**: Requires maintenance admin approval before closing

#### **1.3 Request Categories**

- **Plumbing**: Leaks, clogs, fixture repairs
- **Electrical**: Power issues, lighting, outlets
- **HVAC**: Heating, cooling, ventilation
- **Structural**: Walls, floors, ceilings
- **Security**: Locks, alarms, access control
- **Cleaning**: General maintenance, deep cleaning
- **Emergency**: Urgent safety issues

### **2. User Role Management**

#### **2.1 Role Hierarchy**

```
👑 SUPER_ADMIN (System Owner)
    ↓
🏢 MAINTENANCE_ADMIN (Regional Manager)
    ↓
🏪 BASMA_ADMIN (Building Viewer)
    ↓
🔧 TECHNICIAN (Field Worker)
    ↓
👤 CUSTOMER (Service Requester)
```

#### **2.2 Permission Matrix**

| Action                    | Super Admin | Maintenance Admin | Basma Admin | Technician | Customer |
| ------------------------- | ----------- | ----------------- | ----------- | ---------- | -------- |
| **Create Requests**       | ✅          | ✅                | ✅          | ✅         | ✅       |
| **View All Requests**     | ✅          | ✅                | ✅          | ❌         | ❌       |
| **Assign Technicians**    | ✅          | ✅                | ❌          | ❌         | ❌       |
| **Update Request Status** | ✅          | ✅                | ❌          | ✅         | ❌       |
| **Manage Users**          | ✅          | ❌                | ❌          | ❌         | ❌       |
| **View Reports**          | ✅          | ✅                | ✅          | ❌         | ❌       |
| **View Statistics**       | ✅          | ✅                | ✅          | ❌         | ❌       |

### **3. Request Assignment**

#### **3.1 Assignment Methods**

- **Self-Assignment**: Technicians can take available requests
- **Manual Assignment**: Maintenance Admin assigns requests to technicians
- **Simple Process**: No complex algorithms or automatic matching

#### **3.2 Assignment Rules**

- Technicians can self-assign available requests
- Maintenance Admin can manually assign any request
- Only one technician per request
- Requests can be reassigned by Maintenance Admin

---

## 🔧 Technical Requirements

### **1. Performance Requirements**

- **Request List Loading**: < 500ms
- **Request Creation**: < 200ms
- **Status Updates**: < 100ms
- **Concurrent Users**: 100+ simultaneous users

### **2. Security Requirements**

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control
- **Data Encryption**: All sensitive data encrypted
- **Input Validation**: Comprehensive input sanitization

### **3. Scalability Requirements**

- **Database**: Support 10,000+ requests
- **Users**: Support 1,000+ concurrent users
- **Geographic**: Multi-region deployment ready

---

## 📊 Success Metrics

### **1. Operational Metrics**

- **Request Resolution Time**: Average time from creation to completion
- **Request Processing Time**: Time from submission to assignment
- **Customer Satisfaction**: Rating from completed requests

### **2. System Metrics**

- **API Response Time**: 95th percentile < 200ms
- **System Uptime**: 99.9% availability
- **Error Rate**: < 0.1% of requests

### **3. Business Metrics**

- **Efficiency Improvement**: 30% faster request resolution
- **User Adoption**: 90% of target users active monthly
- **Customer Satisfaction**: 4.5+ star average rating

---

## 🚀 Implementation Phases

### **Phase 1: Core Request Management (MVP)**

- ✅ User authentication and role management
- ✅ Basic request CRUD operations
- ✅ Request status workflow
- ✅ Simple technician assignment
- ✅ Basic reporting and statistics

### **Phase 2: Enhanced Features** (Future)

- 🔄 Advanced reporting and analytics
- 🔄 Mobile application
- 🔄 File attachments for requests
- 🔄 Enhanced notifications

### **Phase 3: Advanced Features** (Future)

- ⏳ Parts management (if needed)
- ⏳ Advanced workflow automation
- ⏳ Integration with external systems

---

## 🎨 User Experience Requirements

### **1. User Interface**

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Intuitive Navigation**: Easy to find and use features
- **Role-specific Dashboards**: Each role sees relevant information
- **Simple Workflows**: Minimal clicks to complete tasks

### **2. User Workflows**

- **Request Creation**: Simple form with essential fields
- **Technician Dashboard**: Clear list of available and assigned requests
- **Manager Dashboard**: Overview of all requests and team performance
- **Customer Portal**: Easy request submission and status tracking

---

## 📋 Core Features

### **1. Request Management**

#### **For All Users**

- Create new maintenance requests
- View own submitted requests
- Track request status and progress

#### **For Basma Admin**

- View all requests in their facility
- View request statistics and reports
- Monitor current request status

#### **For Maintenance Admin**

- View all requests across facilities
- Assign requests to technicians
- Approve completed requests
- Generate reports and analytics

#### **For Technicians**

- View available requests for self-assignment
- Update status of assigned requests
- Mark requests as completed

#### **For Super Admin**

- Full access to all features
- User management capabilities
- System-wide statistics and reports

### **2. Status Management**

#### **Status Definitions**

- **Draft**: Request created but not submitted
- **Submitted**: Request submitted and awaiting assignment
- **Assigned**: Request assigned to technician
- **In Progress**: Technician working on request
- **Completed**: Work finished, awaiting approval
- **Closed**: Request approved and closed
- **Rejected**: Request rejected with reason

#### **Status Transition Rules**

- **Draft → Submitted**: Request creator
- **Submitted → Assigned**: Maintenance Admin or Technician self-assignment
- **Assigned → In Progress**: Assigned Technician
- **In Progress → Completed**: Assigned Technician
- **Completed → Closed**: Maintenance Admin approval
- **Any Status → Rejected**: Maintenance Admin with reason

---

## 🚨 Risk Assessment

### **1. Technical Risks**

- **Database Performance**: Large volume of requests
- **User Adoption**: Training requirements for new system

### **2. Mitigation Strategies**

- **Performance Testing**: Load testing before launch
- **User Training**: Comprehensive training program
- **Gradual Rollout**: Phased deployment approach

---

## 📋 Acceptance Criteria

### **1. Functional Requirements**

- ✅ Users can create, view, and update maintenance requests
- ✅ Technicians can self-assign or be assigned to requests
- ✅ Request status can be updated through the complete lifecycle
- ✅ Managers can view reports and statistics
- ✅ Role-based access control works correctly

### **2. Business Requirements**

- ✅ System reduces maintenance request resolution time
- ✅ System provides visibility into maintenance request status
- ✅ System improves communication between stakeholders
- ✅ System is easy to use for all user types

---

## 📚 Appendices

### **A. Glossary**

- **Request**: A maintenance task or issue that needs to be addressed
- **Technician**: A field worker who performs maintenance tasks
- **Assignment**: The process of assigning a technician to a request
- **Status**: The current state of a request in its lifecycle

### **B. References**

- [System Architecture Document](./01-system-overview.md)
- [API Specifications](./04-api-specifications.md)
- [Database Schema](./03-database-schema.md)
- [User Roles Documentation](../01-system/user-roles.md)

### **C. Change Log**

| Version | Date       | Changes                                      | Author           |
| ------- | ---------- | -------------------------------------------- | ---------------- |
| 1.0     | 2024-01-15 | Initial PRD creation                         | Development Team |
| 2.0     | 2024-01-15 | Simplified to focus on core request handling | Development Team |

---

**Document Status**: ✅ **APPROVED**  
**Next Review Date**: 2024-02-15  
**Distribution**: All stakeholders






