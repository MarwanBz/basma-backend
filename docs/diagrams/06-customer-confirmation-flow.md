# Customer Completion Confirmation Flow

## Current Flow (Before Feature)

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌────────┐
│ DRAFT   │ --> │ SUBMITTED│ --> │  ASSIGNED  │ --> │IN_PROGRESS│ --> │COMPLETED│ --> │ CLOSED │
└─────────┘     └──────────┘     └─────────────┘     └──────────┘     └────────┘     └────────┘
                                                                              │
                                                                              │ (Admin only)
                                                                              ▼
                                                                         ┌────────┐
                                                                         │ CLOSED │
                                                                         └────────┘
```

## Proposed Flow (After Feature)

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────────┐
│ DRAFT   │ --> │ SUBMITTED│ --> │  ASSIGNED  │ --> │IN_PROGRESS│ --> │  COMPLETED   │
└─────────┘     └──────────┘     └─────────────┘     └──────────┘     └──────────────┘
                                                                              │
                                                                              │ (Technician/Admin)
                                                                              │ + Notification to Customer
                                                                              │
                                                                              ▼
                                                                    ┌─────────────────────┐
                                                                    │ Awaiting Customer   │
                                                                    │   Confirmation     │
                                                                    └─────────────────────┘
                                                                            │
                                                              (Auto-close after 3 days)
                                                                            │
                                                                              │
                                                                    ┌─────────┴─────────┐
                                                                    │                   │
                                                                    ▼                   ▼
                                                          ┌─────────────────┐   ┌──────────────────┐
                                                          │ Customer        │   │ Customer         │
                                                          │ Confirms       │   │ Rejects          │
                                                          └─────────────────┘   └──────────────────┘
                                                                    │                   │
                                                                    │                   ▼
                                                                    │          ┌──────────────────┐
                                                                    │          │CUSTOMER_REJECTED │
                                                                    │          └──────────────────┘
                                                                    │                   │
                                                                    │                   │ (Admin/Technician)
                                                                    │                   ▼
                                                                    │          ┌──────────┐
                                                                    │          │IN_PROGRESS│ (Reassign)
                                                                    │          └──────────┘
                                                                    │
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │     CLOSED      │
                                                          └─────────────────┘
```

**Notes (current scope)**: Notifications are deferred; auto-close after 3 days without customer action (admin can also close).

## Detailed Sequence Diagram

```
Technician/Admin          System              Customer            Database
     │                      │                    │                    │
     │──Mark COMPLETED─────>│                    │                    │
     │                      │                    │                    │
     │                      │──Set completedDate─>                    │
     │                      │                    │                    │
     │                      │──Send Notification───────────────────>│
     │                      │                    │                    │
     │                      │                    │<───Notification─────│
     │                      │                    │                    │
     │                      │                    │                    │
     │                      │                    │──Confirm──────────>│
     │                      │                    │                    │
     │                      │<──Update Status────│                    │
     │                      │                    │                    │
     │                      │──Set CLOSED────────>                    │
     │                      │                    │                    │
     │<──Response───────────│                    │                    │
```

## Alternative: Customer Rejects

```
Technician/Admin          System              Customer            Database
     │                      │                    │                    │
     │──Mark COMPLETED─────>│                    │                    │
     │                      │                    │                    │
     │                      │──Send Notification───────────────────>│
     │                      │                    │                    │
     │                      │                    │<───Notification─────│
     │                      │                    │                    │
     │                      │                    │                    │
     │                      │                    │──Reject───────────>│
     │                      │                    │                    │
     │                      │<──Update Status────│                    │
     │                      │                    │                    │
     │                      │──Set REJECTED──────>                    │
     │                      │                    │                    │
     │<──Notification───────│                    │                    │
     │                      │                    │                    │
     │──Reassign/Reopen────>│                    │                    │
     │                      │                    │                    │
     │                      │──Set IN_PROGRESS───>                    │
```

## Status Transition Matrix

| From Status       | To Status         | Who Can Do It     | Requires              |
| ----------------- | ----------------- | ----------------- | --------------------- |
| IN_PROGRESS       | COMPLETED         | Technician, Admin | -                     |
| COMPLETED         | CLOSED            | Customer, Admin   | Customer confirmation |
| COMPLETED         | CUSTOMER_REJECTED | Customer          | Rejection reason      |
| COMPLETED         | IN_PROGRESS       | Technician, Admin | - (revert)            |
| CUSTOMER_REJECTED | IN_PROGRESS       | Admin, Technician | -                     |
| CUSTOMER_REJECTED | COMPLETED         | Admin             | - (override)          |

## Decision Tree: What Happens After COMPLETED?

```
                    COMPLETED Status
                         │
          ┌──────────────┴──────────────┐
          │                              │
    Customer Action?              Timeout/Admin?
          │                              │
    ┌─────┴─────┐                ┌───────┴───────┐
    │           │                │               │
  Confirm    Reject         Auto-confirm    Admin Override
    │           │                │               │
    ▼           ▼                ▼               ▼
  CLOSED   REJECTED          CLOSED          CLOSED
              │
              ▼
         IN_PROGRESS
         (Reassign)
```

## Notification Flow

```
Status Change to COMPLETED
         │
         ├──> Check Customer FCM Tokens
         │         │
         │         ├──> Send Push Notification
         │         │         │
         │         │         └──> Deep Link to Request
         │         │
         │         └──> Send Email (Optional)
         │
         └──> Record in Notification Log
```

## Confirmation States

```
┌─────────────────────────────────────────┐
│  COMPLETED Status                       │
│  customerConfirmationStatus: PENDING    │
└─────────────────────────────────────────┘
              │
              ├──> Customer Confirms
              │         │
              │         └──> CLOSED
              │              customerConfirmationStatus: CONFIRMED
              │
              └──> Customer Rejects
                        │
                        └──> CUSTOMER_REJECTED
                             customerConfirmationStatus: REJECTED
```
