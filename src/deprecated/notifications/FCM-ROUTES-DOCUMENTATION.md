# FCM Notification System - Deprecated Routes Documentation

> **Status:** DEPRECATED  
> **Date Deprecated:** 2024  
> **Reason:** FCM notification system has been deprecated and moved to this folder for reference.

This document provides comprehensive documentation of all FCM (Firebase Cloud Messaging) notification routes, services, and related components that were part of the Basma Maintenance Platform backend.

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Services](#services)
3. [Controllers](#controllers)
4. [Validators](#validators)
5. [Types & Interfaces](#types--interfaces)
6. [Configuration](#configuration)
7. [Database Schema](#database-schema)
8. [Dependencies](#dependencies)

---

## API Endpoints

All endpoints were available under the base path: `/api/v1/notifications`

### 1. Register Device

**Endpoint:** `POST /api/v1/notifications/register`

**Description:** Register a device for push notifications. This endpoint stores the FCM device token and automatically subscribes the device to default topics based on the user's role.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "token": "string (required, 1-500 chars)",
  "platform": "IOS | ANDROID | WEB (required)",
  "deviceId": "string (optional, max 100 chars)",
  "appVersion": "string (optional, max 20 chars)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "id": "uuid",
    "platform": "IOS",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized
- `404` - User not found

**Use Case:** Called when a user logs in on a mobile device or web app to enable push notifications.

---

### 2. Subscribe to Topic

**Endpoint:** `POST /api/v1/notifications/subscribe`

**Description:** Subscribe a device token to a specific notification topic. Topics allow broadcasting notifications to multiple devices without querying the database.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "token": "string (required, 1-500 chars)",
  "topic": "string (required, 1-100 chars, alphanumeric + -_.~%)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully subscribed to topic: maintenance-updates"
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized
- `404` - Device token not found or does not belong to user
- `500` - Failed to subscribe to topic

**Use Case:** Manually subscribe to specific topics like `maintenance-updates`, `request-{requestId}`, or `chat-{roomId}`.

---

### 3. Unsubscribe from Topic

**Endpoint:** `POST /api/v1/notifications/unsubscribe`

**Description:** Unsubscribe a device token from a specific notification topic.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "token": "string (required, 1-500 chars)",
  "topic": "string (required, 1-100 chars)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully unsubscribed from topic: maintenance-updates"
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized
- `404` - Device token not found or does not belong to user
- `500` - Failed to unsubscribe from topic

**Use Case:** Allow users to opt-out of specific notification topics.

---

### 4. Unregister Device

**Endpoint:** `DELETE /api/v1/notifications/unregister`

**Description:** Unregister a device token (typically called on logout). Marks the device token as inactive in the database.

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "token": "string (required, 1-500 chars)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Device unregistered successfully"
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized
- `404` - Device token not found or does not belong to user

**Use Case:** Called when a user logs out to stop receiving notifications on that device.

---

### 5. Get User Subscriptions

**Endpoint:** `GET /api/v1/notifications/subscriptions`

**Description:** Get all active device tokens registered for the current user.

**Authentication:** Required (Bearer Token)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "uuid",
        "platform": "IOS",
        "deviceId": "device-123",
        "appVersion": "1.0.0",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastUsedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

**Error Responses:**
- `401` - Unauthorized

**Use Case:** Display user's registered devices in account settings or for debugging.

---

### 6. Send Test Notification

**Endpoint:** `POST /api/v1/notifications/test/send`

**Description:** Send a test notification to a specific user or topic. **Only available in development environment.**

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "userId": "uuid (optional)",
  "topic": "string (optional)",
  "title": "string (required, 1-100 chars)",
  "body": "string (required, 1-500 chars)",
  "data": {
    "key": "value (all values must be strings)"
  }
}
```

**Note:** Either `userId` or `topic` must be provided.

**Response (200):**
```json
{
  "success": true,
  "message": "Test notification sent",
  "data": {
    "success": true,
    "messageId": "fcm-message-id",
    "successCount": 1,
    "failureCount": 0
  }
}
```

**Error Responses:**
- `400` - Validation error or missing userId/topic
- `401` - Unauthorized
- `403` - Not available in production

**Use Case:** Testing notification functionality during development.

---

### 7. Send Announcement

**Endpoint:** `POST /api/v1/notifications/announcement`

**Description:** Send a system-wide announcement to all users or a specific role. **Admin only.**

**Authentication:** Required (Bearer Token)  
**Authorization:** Must be `MAINTENANCE_ADMIN`, `BASMA_ADMIN`, or `SUPER_ADMIN`

**Request Body:**
```json
{
  "title": "string (required, 1-100 chars)",
  "body": "string (required, 1-1000 chars)",
  "targetRole": "CUSTOMER | TECHNICIAN | MAINTENANCE_ADMIN | BASMA_ADMIN | ALL (optional)",
  "announcementId": "uuid (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Announcement sent successfully"
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized
- `403` - Insufficient permissions (not an admin)

**Use Case:** Send important system updates, maintenance notices, or feature announcements to users.

---

## Services

### FCM Service (`fcm.service.ts`)

Core service for Firebase Cloud Messaging operations.

**Key Methods:**
- `sendToTopic(topic, message)` - Send notification to a topic
- `sendToDevice(token, message)` - Send notification to a specific device
- `sendToDevices(tokens[], message)` - Send notification to multiple devices
- `sendToUser(userId, message)` - Send notification to all user's devices
- `sendToCondition(condition, message)` - Send with topic condition
- `subscribeToTopic(token, topic)` - Subscribe device to topic
- `subscribeDevicesToTopic(tokens[], topic)` - Subscribe multiple devices
- `unsubscribeFromTopic(token, topic)` - Unsubscribe device from topic
- `registerDevice(userId, registration)` - Register new device token
- `unregisterDevice(token)` - Mark device as inactive
- `cleanupInactiveTokens()` - Remove tokens inactive for 30+ days

**Singleton Pattern:** Uses singleton pattern for service instance management.

---

### Notification Service (`notification.service.ts`)

High-level notification service that provides business logic methods for common notification scenarios.

**Key Methods:**
- `notifyRequestStatusChange()` - Notify when request status changes
- `notifyTechnicianAssigned()` - Notify when technician is assigned
- `notifyNewComment()` - Notify about new comments on requests
- `notifyChatMessage()` - Notify about chat messages
- `sendAnnouncement()` - Send system announcements
- `notifyNewRequest()` - Notify admins about new requests
- `subscribeToDefaultTopics()` - Auto-subscribe based on user role

**Topic Strategy:**
- Auto-subscribed topics: `all-users`, `role-{userRole}`
- Feature topics: `maintenance-updates`, `chat-messages`, `announcements`
- Dynamic topics: `request-{requestId}`, `building-{buildingId}`, `chat-{roomId}`, `user-{userId}`

---

## Controllers

### FCM Controller (`fcm.controller.ts`)

HTTP request handlers for FCM endpoints.

**Methods:**
- `registerDevice()` - Handle device registration
- `subscribeToTopic()` - Handle topic subscription
- `unsubscribeFromTopic()` - Handle topic unsubscription
- `unregisterDevice()` - Handle device unregistration
- `getSubscriptions()` - Get user's devices
- `sendTestNotification()` - Send test notification (dev only)
- `sendAnnouncement()` - Send announcement (admin only)

**Error Handling:** Uses Express error handling middleware with `AppError` class.

---

## Validators

### FCM Validators (`fcm.validator.ts`)

Zod validation schemas for all FCM endpoints.

**Schemas:**
- `registerDeviceSchema` - Device registration validation
- `subscribeToTopicSchema` - Topic subscription validation
- `unsubscribeFromTopicSchema` - Topic unsubscription validation
- `unregisterDeviceSchema` - Device unregistration validation
- `sendTestNotificationSchema` - Test notification validation
- `sendAnnouncementSchema` - Announcement validation

**Type Exports:**
- `RegisterDeviceInput`
- `SubscribeToTopicInput`
- `UnsubscribeFromTopicInput`
- `UnregisterDeviceInput`
- `SendTestNotificationInput`
- `SendAnnouncementInput`

---

## Types & Interfaces

### FCM Types (`fcm.types.ts`)

TypeScript type definitions for FCM system.

**Key Types:**
- `FcmNotification` - Notification payload structure
- `FcmData` - Data payload (string key-value pairs)
- `FcmMessage` - Complete FCM message with platform-specific configs
- `DeviceRegistrationRequest` - Device registration input
- `FcmServiceResponse` - Service method response
- `NotificationDataPayload` - Notification data structure

**Enums:**
- `NotificationType` - Types: REQUEST_STATUS_CHANGE, REQUEST_ASSIGNED, REQUEST_COMMENT, CHAT_MESSAGE, ANNOUNCEMENT, SYSTEM_UPDATE

**Classes:**
- `FcmTopics` - Topic naming conventions and helpers
- `NotificationTemplates` - Pre-built notification message templates

---

## Configuration

### FCM Config (`fcm.config.ts`)

Firebase Admin SDK initialization and configuration.

**Key Features:**
- Singleton pattern for Firebase app instance
- Service account JSON file validation
- Environment variable configuration:
  - `FIREBASE_PROJECT_ID` (default: "basma-maintenance")
  - `FIREBASE_SERVICE_ACCOUNT_PATH` (default: `config/firebase-service-account.json`)
  - `FIREBASE_DATABASE_URL` (optional)

**Methods:**
- `initialize()` - Initialize Firebase Admin SDK
- `getApp()` - Get Firebase app instance
- `getMessaging()` - Get Firebase Messaging instance
- `validateConfig()` - Validate configuration without initializing

**Dependencies:**
- `firebase-admin` package
- Service account JSON file

---

## Database Schema

### FCM Device Tokens Table

**Table Name:** `fcm_device_tokens`

**Schema:**
```prisma
model fcm_device_tokens {
  id          String   @id @default(uuid())
  userId      String
  token       String   @unique
  platform    fcm_device_tokens_platform
  deviceId    String?
  appVersion  String?
  isActive    Boolean  @default(true)
  lastUsedAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isActive])
  @@index([lastUsedAt])
}
```

**Platform Enum:**
```prisma
enum fcm_device_tokens_platform {
  IOS
  ANDROID
  WEB
}
```

**Migration Status:** 
- Table exists in database
- **Action Required:** Decide whether to:
  1. Keep table for historical data
  2. Drop table if no longer needed
  3. Archive data before dropping

**Note:** If dropping the table, create a migration to remove it from Prisma schema and database.

---

## Dependencies

### External Dependencies

- `firebase-admin` - Firebase Admin SDK for sending push notifications
- `@prisma/client` - Database client for device token storage

### Internal Dependencies

**Files that used notification services:**
- `src/services/request.service.ts` - Used `notificationService` for:
  - `notifyNewRequest()` - When new request created
  - `notifyNewComment()` - When comment added
  - `notifyRequestStatusChange()` - When status changed
  - `notifyTechnicianAssigned()` - When technician assigned

**Route Registration:**
- `src/app.ts` - Registered routes at `/api/v1/notifications`

---

## Migration Notes

### What Was Deprecated

1. **All FCM routes** - All 7 API endpoints
2. **FCM Service** - Core FCM operations service
3. **Notification Service** - High-level notification methods
4. **FCM Controller** - HTTP request handlers
5. **FCM Validators** - Request validation schemas
6. **FCM Types** - TypeScript type definitions
7. **FCM Config** - Firebase Admin SDK configuration

### Files Moved to Deprecated

All files have been moved to `src/deprecated/notifications/` with the following structure:
```
src/deprecated/notifications/
├── FCM-ROUTES-DOCUMENTATION.md (this file)
├── routes/
│   └── fcm.routes.ts
├── controllers/
│   └── fcm.controller.ts
├── services/
│   ├── fcm.service.ts
│   └── notification.service.ts
├── validators/
│   └── fcm.validator.ts
├── config/
│   └── fcm.config.ts
└── types/
    └── fcm.types.ts
```

### Code Changes Required

1. **`src/app.ts`** - FCM routes import and registration removed/commented
2. **`src/services/request.service.ts`** - All `notificationService` calls removed/commented

### Database Considerations

- **`fcm_device_tokens` table** - Still exists in database
- **Decision needed:** Keep for historical data or drop via migration
- **If keeping:** No action required
- **If dropping:** 
  1. Create Prisma migration to remove model
  2. Run migration to drop table from database
  3. Remove model from `prisma/schema.prisma`

---

## Related Documentation

- Original implementation summary: `docs/03-future-specs/FCM-IMPLEMENTATION-SUMMARY.md`
- API integration guide: `docs/02-api-integration/push-notifications-api-guide.md`
- Mobile push notifications guide: `docs/02-api-integration/mobile-push-notifications-guide.md`

---

## Notes

- This system used Firebase Cloud Messaging (FCM) for cross-platform push notifications
- Topic-based architecture allowed scalable broadcasting without database queries
- System supported iOS, Android, and Web platforms
- All endpoints required authentication via Bearer token
- Test endpoint was only available in development environment
- Announcement endpoint required admin privileges

