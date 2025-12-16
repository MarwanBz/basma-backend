# Customer Completion Confirmation Feature - Feature Analysis

## 📋 Overview

When a technician or super admin marks a maintenance request as "COMPLETED", the customer who submitted the request should:

1. **Receive a notification** that their request has been completed
2. **Be able to confirm** that the work is actually done to their satisfaction
3. **Have the request move to CLOSED status** only after their confirmation

---

## ✅ Current Scope (this iteration)

- Notifications are **out of scope** (to be added later).
- Auto-confirm after **3 days** with no customer action; mark as `CLOSED`.
- Admin can manually close after timeout (override).
- Confirmation is irreversible for customers; only admin can reopen after confirm.
- Technician can revert `COMPLETED → IN_PROGRESS` only while not confirmed.

---

## 🔍 Current State Analysis

### Current Flow

```
DRAFT → SUBMITTED → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED
```

**Current Behavior:**

- ✅ Technician/Super Admin can change status to `COMPLETED`
- ✅ When status changes to `COMPLETED`, `completedDate` is set automatically
- ✅ Status change is recorded in `request_status_history`
- ❌ **No notification sent to customer** (FCM service is deprecated/commented out)
- ❌ **No customer confirmation mechanism exists**
- ❌ **No way for customer to verify completion**

### Current Code Location

- **Service**: `src/services/request.service.ts` → `updateRequestStatus()` method (lines 493-542)
- **Controller**: `src/controllers/request.controller.ts` → `updateStatus()` method
- **Route**: `PATCH /api/v1/requests/:id/status`

### Current Database Schema

```prisma
model maintenance_request {
  id                String    @id @default(uuid())
  status            request_status @default(SUBMITTED)
  completedDate     DateTime?
  requestedById     String  // Customer who created the request
  // ... other fields
}
```

**Missing Fields:**

- ❌ No `customerConfirmedAt` field
- ❌ No `customerConfirmationStatus` field
- ❌ No `customerConfirmationComment` field

---

## 🎯 Feature Requirements

### 1. Notification to Customer

**Status:** Deferred (not in current scope; add later)

**When:** Status changes to `COMPLETED` by technician or super admin

**What to Send (future):**

- Push notification (if FCM is re-enabled)
- Email notification (optional)
- In-app notification (if implemented)

**Notification Content (future):**

- Request title/identifier
- Message: "Your maintenance request has been marked as completed. Please confirm if the work is done to your satisfaction."
- Deep link to request details page
- Action buttons: "Confirm" / "Request Changes"
- with a rate system or feedback message.

### 2. Customer Confirmation Mechanism

**New Status Flow:**

```
... → IN_PROGRESS → COMPLETED (awaiting customer confirmation) → CLOSED
                                              ↓
                                    CUSTOMER_REJECTED (if customer says not done)
```

**Customer Actions:**

1. **Confirm Completion** → Request moves to `CLOSED` status
2. **Reject/Request Changes** → Request moves to `CUSTOMER_REJECTED` or back to `IN_PROGRESS`
3. **Add Comment** → Optional feedback about the completion
4. **No Response** → Auto-confirm after 3 days → `CLOSED` (admin can also close after timeout)

### 3. Database Changes Required

#### Option A: Add Fields to Existing Table (Recommended)

```prisma
model maintenance_request {
  // ... existing fields
  customerConfirmedAt        DateTime?
  customerConfirmationStatus  customer_confirmation_status?
  customerConfirmationComment String?  @db.Text
  customerRejectedAt          DateTime?
  customerRejectionReason     String?  @db.Text
}

enum customer_confirmation_status {
  PENDING      // Waiting for customer confirmation
  CONFIRMED    // Customer confirmed completion
  REJECTED     // Customer rejected/reported issues
}
```

#### Option B: Separate Confirmation Table

```prisma
model request_customer_confirmation {
  id                String    @id @default(uuid())
  requestId         String
  status            customer_confirmation_status
  confirmedAt       DateTime?
  rejectedAt       DateTime?
  customerComment   String?   @db.Text
  rejectionReason   String?   @db.Text
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  request           maintenance_request @relation(fields: [requestId], references: [id], onDelete: Cascade)

  @@unique([requestId])
  @@index([requestId])
  @@index([status])
}
```

### 4. API Endpoints Required

#### New Endpoints

```
POST /api/v1/requests/:id/confirm-completion
  - Customer confirms the work is done
  - Body: { comment?: string }
  - Response: Updated request with CLOSED status

POST /api/v1/requests/:id/reject-completion
  - Customer rejects/reports issues
  - Body: { reason: string, comment?: string }
  - Response: Updated request with CUSTOMER_REJECTED or IN_PROGRESS status

GET /api/v1/requests/:id/confirmation-status
  - Get current confirmation status
  - Response: { status, confirmedAt?, rejectedAt?, comment? }
```

#### Modified Endpoints

```
PATCH /api/v1/requests/:id/status
  - When changing to COMPLETED, set confirmation status to PENDING (notifications deferred)
  - Add validation: Cannot move from COMPLETED to CLOSED without customer confirmation or admin override
  - Allow technician revert to IN_PROGRESS only while not confirmed
```

---

## ⚠️ Edge Cases & Considerations

### 1. **What if customer never confirms?**

- **Decision (current scope)**: Auto-confirm after **3 days** → `CLOSED`.
- Admin can manually close after timeout (override).
- Reminders/notifications deferred to a future phase.

### 2. **What if customer rejects completion?**

- **Flow**: COMPLETED → CUSTOMER_REJECTED → IN_PROGRESS (reassign to technician)
- **Notification**: Notify assigned technician/admin about rejection
- **History**: Record rejection reason and customer comment
- **Re-assignment**: May need to reassign to same or different technician

### 3. **What if request is completed multiple times?**

- Customer confirms → CLOSED
- Later, admin reopens and technician marks COMPLETED again
- **Solution**: Track confirmation history, allow multiple confirmation cycles

### 4. **What if customer confirms but then wants to change?**

- **Option A**: Once confirmed, cannot undo (only admin can reopen)
- **Option B**: Allow customer to "undo confirmation" within X hours
- **Recommendation**: Option A (safer, prevents confusion)

### 5. **What if technician marks COMPLETED by mistake?**

- **Current**: Technician can change status back
- **With confirmation**: If customer hasn't confirmed yet, technician can revert
- **After confirmation**: Only admin can reopen

### 6. **What if customer account is deleted/deactivated?**

- **Solution**: Admin can manually confirm on behalf of customer
- **Or**: Auto-confirm after account deactivation period

### 7. **What if multiple customers are associated with one request?**

- **Current**: Only one `requestedById` field
- **Assumption**: One customer per request (current design)
- **Future**: If multiple customers needed, confirmation logic needs update

### 8. **Notification Delivery Failures**

- **Scenario**: Customer doesn't have app installed, email bounces, etc.
- **Solution**:
  - Log notification failures
  - Provide admin dashboard to see pending confirmations
  - Allow admin to manually notify or confirm on behalf

### 9. **Status Transition Rules**

```
Current Rules:
- COMPLETED can only be set by TECHNICIAN or SUPER_ADMIN
- CLOSED can only be set by ADMIN/SUPER_ADMIN

New Rules Needed:
- COMPLETED → CLOSED: Requires customer confirmation OR admin override
- COMPLETED → CUSTOMER_REJECTED: Customer action (via reject endpoint)
- CUSTOMER_REJECTED → IN_PROGRESS: Admin/Technician action
- COMPLETED → IN_PROGRESS: Technician can revert if not confirmed; after confirmation only admin can reopen
- COMPLETED → CLOSED (auto): Auto-confirm after 3 days with no response
```

### 10. **Concurrent Updates**

- **Scenario**: Customer tries to confirm while admin is changing status
- **Solution**: Use database transactions, optimistic locking, or status checks

---

## 🔐 Security & Permissions

### Role-Based Access Control

| Action                              | CUSTOMER          | TECHNICIAN        | ADMIN         | SUPER_ADMIN   |
| ----------------------------------- | ----------------- | ----------------- | ------------- | ------------- |
| Mark as COMPLETED                   | ❌                | ✅ (own requests) | ✅            | ✅            |
| Confirm completion                  | ✅ (own requests) | ❌                | ✅ (override) | ✅ (override) |
| Reject completion                   | ✅ (own requests) | ❌                | ❌            | ✅ (override) |
| View confirmation status            | ✅ (own requests) | ✅ (assigned)     | ✅            | ✅            |
| Manually close without confirmation | ❌                | ❌                | ✅            | ✅            |

### Validation Rules

1. Customer can only confirm/reject their own requests
2. Customer cannot confirm if status is not COMPLETED
3. Customer cannot confirm if already confirmed
4. Admin can override customer confirmation (with reason/audit log)

---

## 📊 Data & Analytics

### Metrics to Track

- Average time from COMPLETED to customer confirmation
- Percentage of requests confirmed vs rejected
- Average time customer takes to respond
- Number of reminders sent
- Customer rejection reasons (for quality improvement)

### Reporting

- Requests awaiting customer confirmation (dashboard)
- Confirmation rate by technician
- Confirmation rate by request category
- Time-to-confirmation trends

---

## 🚀 Implementation Phases

### Phase 1: Core Functionality (MVP)

1. Add database fields for customer confirmation
2. Modify status update logic to handle COMPLETED → confirmation flow
3. Create customer confirmation endpoints
4. Add validation and permissions
5. Update status transition rules

### Phase 2: Notifications

1. Re-enable or implement notification service
2. Send notification when status changes to COMPLETED
3. Send reminder notifications for pending confirmations
4. Email notifications (optional)

### Phase 3: Enhanced Features

1. Confirmation history/audit log
2. Admin dashboard for pending confirmations
3. Auto-confirm after timeout
4. Analytics and reporting

### Phase 4: Advanced Features

1. Customer can add photos/comments with confirmation
2. Rating system (1-5 stars) with confirmation
3. Multiple confirmation cycles support
4. Customer can undo confirmation (within time window)

---

## 📝 API Examples

### Mark Request as Completed (Technician/Admin)

```http
PATCH /api/v1/requests/123/status
Authorization: Bearer <technician_token>
Content-Type: application/json

{
  "status": "COMPLETED",
  "reason": "All repairs completed successfully"
}

Response: 200 OK
{
  "id": "123",
  "status": "COMPLETED",
  "completedDate": "2025-01-15T10:30:00Z",
  "customerConfirmationStatus": "PENDING",
  // ... other fields
}
```

### Customer Confirms Completion

```http
POST /api/v1/requests/123/confirm-completion
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "comment": "Work looks great! Thank you."
}

Response: 200 OK
{
  "id": "123",
  "status": "CLOSED",
  "customerConfirmationStatus": "CONFIRMED",
  "customerConfirmedAt": "2025-01-15T14:20:00Z",
  // ... other fields
}
```

### Customer Rejects Completion

```http
POST /api/v1/requests/123/reject-completion
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "reason": "Work not completed properly",
  "comment": "The door still doesn't close correctly. Please fix again."
}

Response: 200 OK
{
  "id": "123",
  "status": "CUSTOMER_REJECTED",
  "customerConfirmationStatus": "REJECTED",
  "customerRejectedAt": "2025-01-15T14:25:00Z",
  // ... other fields
}
```

### Get Confirmation Status

```http
GET /api/v1/requests/123/confirmation-status
Authorization: Bearer <customer_token>

Response: 200 OK
{
  "requestId": "123",
  "status": "PENDING",
  "completedDate": "2025-01-15T10:30:00Z",
  "daysSinceCompletion": 2,
  "canConfirm": true,
  "canReject": true
}
```

---

## 🧪 Testing Scenarios

### Happy Path

1. Technician marks request as COMPLETED
2. Customer receives notification
3. Customer confirms completion
4. Request status changes to CLOSED

### Rejection Path

1. Technician marks request as COMPLETED
2. Customer receives notification
3. Customer rejects with reason
4. Request status changes to CUSTOMER_REJECTED
5. Technician/admin notified
6. Request reassigned or status changed to IN_PROGRESS

### Edge Cases

1. Customer confirms twice (should fail)
2. Customer confirms after admin already closed (should fail)
3. Customer confirms request that's not COMPLETED (should fail)
4. Multiple technicians try to mark COMPLETED simultaneously
5. Customer account deleted before confirmation
6. Notification delivery failure scenarios

---

## 📚 Related Documentation

- [Request Status Lifecycle](./05-requests-module.md)
- [User Roles](./../01-system/user-roles.md)
- [FCM Notifications](./FCM-IMPLEMENTATION-SUMMARY.md)
- [API Specifications](./04-api-specifications.md)

---

## ❓ Open Questions

1. **Notification System**: Should we re-enable FCM or implement a new notification system?
2. **Auto-confirm Timeout**: What should be the default timeout period? (Recommendation: 7 days)
3. **Rejection Flow**: Should rejection automatically reassign to technician or require admin action?
4. **Multiple Confirmations**: Should we support multiple completion → confirmation cycles?
5. **Email Notifications**: Should we send email in addition to push notifications?
6. **Customer Rating**: Should confirmation include a rating system (1-5 stars)?
7. **Photo Evidence**: Should customers be able to upload photos with confirmation/rejection?

---

## 🎯 Success Criteria

- ✅ Customer receives notification when request is marked COMPLETED
- ✅ Customer can confirm or reject completion via API
- ✅ Request cannot be CLOSED without customer confirmation (unless admin override)
- ✅ All status transitions are properly validated
- ✅ Confirmation history is tracked and auditable
- ✅ Admin can see pending confirmations in dashboard
- ✅ System handles edge cases gracefully

---

**Document Status**: 📝 **DRAFT - For Review**

**Last Updated**: 2025-01-15

**Author**: Feature Analysis
