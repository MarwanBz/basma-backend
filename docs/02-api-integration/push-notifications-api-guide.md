# Push Notifications API Guide

## Overview

The Basma Maintenance Platform uses **Firebase Cloud Messaging (FCM)** for push notifications. This guide covers all FCM-related API endpoints for mobile app integration.

## Base URL

```
Development: http://localhost:4300/api/fcm
Production: https://your-basma-domain.com/api/fcm
```

## Authentication

All FCM endpoints require JWT authentication in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Core Concepts

### Topics

Topics are categories that users subscribe to. When you send a notification to a topic, all subscribed devices receive it automatically.

**Default Topics** (auto-subscribed on registration):

- `all-users` - System-wide announcements
- `role-{userRole}` - Role-specific notifications (e.g., `role-customer`, `role-technician`)

**Feature Topics** (manual subscription):

- `maintenance-updates` - Maintenance request updates
- `chat-messages` - Chat notifications
- `announcements` - Company announcements

**Dynamic Topics** (created automatically):

- `request-{requestId}` - Specific request updates (e.g., `request-123`)
- `building-{buildingId}` - Building-specific updates
- `user-{userId}` - User-specific notifications

### Device Tokens

Each mobile device has a unique FCM token. When users log in, the app sends this token to register the device for notifications.

---

## API Endpoints

### 1. Register Device

Register a device to receive push notifications. This should be called when the user logs in.

**Endpoint:** `POST /api/fcm/register`

**Request:**

```json
{
  "token": "fcm_device_token_here",
  "platform": "IOS", // or "ANDROID", "WEB"
  "deviceId": "optional-device-id",
  "appVersion": "1.0.0"
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
    "createdAt": "2025-01-22T10:30:00Z"
  }
}
```

**Auto-subscriptions:**
When you register, the device is automatically subscribed to:

- `all-users`
- `role-{yourRole}` (e.g., `role-customer`)
- `maintenance-updates` (for customers and technicians)

**Example (JavaScript):**

```javascript
// Get FCM token from your device
const fcmToken = await getDeviceFCMToken();

// Register with backend
const response = await fetch("/api/fcm/register", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${userJWT}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    token: fcmToken,
    platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
    appVersion: "1.0.0",
  }),
});
```

---

### 2. Subscribe to Topic

Subscribe your device to a specific notification topic.

**Endpoint:** `POST /api/fcm/subscribe`

**Request:**

```json
{
  "token": "fcm_device_token_here",
  "topic": "chat-messages"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Successfully subscribed to topic: chat-messages"
}
```

**Common Topics to Subscribe:**

- `maintenance-updates`
- `chat-messages`
- `announcements`
- `building-{buildingId}` (for building-specific updates)

**Example (JavaScript):**

```javascript
await fetch("/api/fcm/subscribe", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${userJWT}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    token: fcmToken,
    topic: "chat-messages",
  }),
});
```

---

### 3. Unsubscribe from Topic

Unsubscribe your device from a topic you no longer want to receive.

**Endpoint:** `POST /api/fcm/unsubscribe`

**Request:**

```json
{
  "token": "fcm_device_token_here",
  "topic": "chat-messages"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Successfully unsubscribed from topic: chat-messages"
}
```

---

### 4. Unregister Device

Unregister a device when the user logs out. This prevents notifications from being sent to the device.

**Endpoint:** `DELETE /api/fcm/unregister`

**Request:**

```json
{
  "token": "fcm_device_token_here"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Device unregistered successfully"
}
```

**Example (JavaScript - on logout):**

```javascript
await fetch("/api/fcm/unregister", {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${userJWT}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    token: fcmToken,
  }),
});
```

---

### 5. Get Subscriptions

Get a list of all registered devices for the current user.

**Endpoint:** `GET /api/fcm/subscriptions`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "uuid",
        "platform": "IOS",
        "deviceId": "iPhone-123",
        "appVersion": "1.0.0",
        "createdAt": "2025-01-22T10:30:00Z",
        "lastUsedAt": "2025-01-23T15:45:00Z"
      },
      {
        "id": "uuid-2",
        "platform": "ANDROID",
        "deviceId": "Samsung-456",
        "appVersion": "1.0.0",
        "createdAt": "2025-01-20T09:15:00Z",
        "lastUsedAt": "2025-01-23T14:20:00Z"
      }
    ],
    "count": 2
  }
}
```

---

### 6. Send Test Notification (Development Only)

Send a test notification to yourself or a topic. **Only available in development environment.**

**Endpoint:** `POST /api/fcm/test/send`

**Request (to user):**

```json
{
  "userId": "user-uuid",
  "title": "Test Notification",
  "body": "This is a test notification",
  "data": {
    "customKey": "customValue"
  }
}
```

**Request (to topic):**

```json
{
  "topic": "maintenance-updates",
  "title": "Test Announcement",
  "body": "This is a test announcement to all subscribers"
}
```

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

---

### 7. Send Announcement (Admin Only)

Send a system-wide or role-specific announcement. **Requires admin role.**

**Endpoint:** `POST /api/fcm/announcement`

**Allowed Roles:**

- `MAINTENANCE_ADMIN`
- `BASMA_ADMIN`
- `SUPER_ADMIN`

**Request:**

```json
{
  "title": "Maintenance Schedule Update",
  "body": "Scheduled maintenance on Sunday 2PM-4PM",
  "targetRole": "ALL", // or "CUSTOMER", "TECHNICIAN", etc.
  "announcementId": "optional-uuid"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Announcement sent successfully"
}
```

**Target Role Options:**

- `ALL` - All users (default)
- `CUSTOMER` - Only customers
- `TECHNICIAN` - Only technicians
- `MAINTENANCE_ADMIN` - Only maintenance admins
- `BASMA_ADMIN` - Only Basma admins

---

## Notification Payload Structure

When your app receives a notification, it will contain:

### Notification Payload (displays in system tray)

```json
{
  "notification": {
    "title": "Request Updated",
    "body": "Your maintenance request #123 is now In Progress"
  }
}
```

### Data Payload (for app logic and deep linking)

```json
{
  "data": {
    "type": "request_status_change",
    "entityId": "request-uuid",
    "entityType": "request",
    "newStatus": "IN_PROGRESS",
    "action": "basma://request/request-uuid"
  }
}
```

### Notification Types

The `type` field in the data payload indicates what kind of notification it is:

- `request_status_change` - Request status was updated
- `request_assigned` - Technician was assigned to request
- `request_comment` - New comment on request
- `chat_message` - New chat message
- `announcement` - System announcement
- `system_update` - System update notification

---

## Automatic Notifications

The backend automatically sends notifications for these events:

### 1. New Request Created

- **Sent to:** Maintenance admins
- **Topic:** `role-maintenance_admin`
- **Trigger:** When a customer creates a new maintenance request

### 2. Request Status Changed

- **Sent to:** Request creator (customer) and assigned technician
- **Topics:** `request-{requestId}`, direct to users
- **Trigger:** When request status changes (SUBMITTED → IN_PROGRESS → COMPLETED, etc.)

### 3. Technician Assigned

- **Sent to:** Request creator and assigned technician
- **Topics:** `request-{requestId}`, direct to users
- **Trigger:** When admin assigns a technician to a request

### 4. New Comment Added

- **Sent to:** Request creator and assigned technician (excluding commenter)
- **Topics:** `request-{requestId}`, direct to users
- **Trigger:** When someone adds a comment to a request
- **Note:** Internal comments do not trigger notifications

### 5. Chat Message

- **Sent to:** Chat participants (excluding sender)
- **Topics:** `chat-{roomId}`, direct to users
- **Trigger:** When a new chat message is sent

---

## Deep Linking

Notifications include an `action` field in the data payload for deep linking:

### URL Format

```
basma://{screen}/{id}
```

### Examples

- `basma://request/123` - Open request #123
- `basma://request/123/comments` - Open request #123 comments
- `basma://chat/room-456` - Open chat room #456
- `basma://announcements` - Open announcements screen

### Handling Deep Links (React Native Example)

```javascript
import * as Notifications from "expo-notifications";
import { useNavigation } from "@react-navigation/native";

// Handle notification tap
Notifications.addNotificationResponseReceivedListener((response) => {
  const action = response.notification.request.content.data.action;

  if (action) {
    const url = action.replace("basma://", "");
    const [screen, id] = url.split("/");

    // Navigate to appropriate screen
    if (screen === "request") {
      navigation.navigate("RequestDetail", { requestId: id });
    } else if (screen === "chat") {
      navigation.navigate("Chat", { roomId: id });
    }
    // ... handle other screens
  }
});
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized**

```json
{
  "success": false,
  "error": "Unauthorized - Invalid token"
}
```

**404 Not Found**

```json
{
  "success": false,
  "error": "Device token not found or does not belong to user"
}
```

**400 Validation Error**

```json
{
  "success": false,
  "error": "FCM token is required"
}
```

**403 Forbidden (for admin endpoints)**

```json
{
  "success": false,
  "error": "Only administrators can send announcements"
}
```

---

## Best Practices

### 1. Register on Login

Always register the device when the user logs in:

```javascript
async function handleLogin(email, password) {
  // Login
  const authResponse = await login(email, password);

  // Get FCM token
  const fcmToken = await getFCMToken();

  // Register device
  await registerDevice(fcmToken, authResponse.token);
}
```

### 2. Unregister on Logout

Always unregister when the user logs out:

```javascript
async function handleLogout() {
  const fcmToken = await getFCMToken();

  // Unregister device
  await unregisterDevice(fcmToken);

  // Then logout
  await logout();
}
```

### 3. Handle Token Refresh

FCM tokens can change. Handle token refresh:

```javascript
// Listen for token refresh
messaging().onTokenRefresh(async (newToken) => {
  // Re-register with new token
  await registerDevice(newToken, userJWT);
});
```

### 4. Request Permissions (iOS)

On iOS, you must request notification permissions:

```javascript
import * as Notifications from "expo-notifications";

const { status } = await Notifications.requestPermissionsAsync();
if (status !== "granted") {
  alert("Please enable notifications in settings");
}
```

### 5. Handle Foreground Notifications

Display notifications even when app is open:

```javascript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

---

## Testing Notifications

### Using the Test Endpoint

1. Ensure you're in development mode
2. Register your device
3. Send a test notification:

```bash
curl -X POST http://localhost:4300/api/fcm/test/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "title": "Test Notification",
    "body": "Testing push notifications"
  }'
```

### Testing Topic Subscriptions

1. Subscribe to a test topic:

```bash
curl -X POST http://localhost:4300/api/fcm/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-fcm-token",
    "topic": "test-topic"
  }'
```

2. Send to the topic:

```bash
curl -X POST http://localhost:4300/api/fcm/test/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "test-topic",
    "title": "Topic Test",
    "body": "Testing topic notifications"
  }'
```

---

## Troubleshooting

### Notifications Not Receiving

1. **Check device registration:**

   ```bash
   GET /api/fcm/subscriptions
   ```

   Ensure your device is listed.

2. **Verify FCM token is valid:**
   - Tokens can expire or become invalid
   - Try re-registering the device

3. **Check Firebase Console:**
   - Go to Firebase Console → Cloud Messaging
   - Check for any delivery failures

4. **Verify permissions (iOS):**
   - Ensure notification permissions are granted
   - Check Settings → Basma App → Notifications

### Token Registration Fails

1. **Check authentication:**
   - Ensure JWT token is valid
   - Check Authorization header format

2. **Verify token format:**
   - FCM tokens are long strings (150+ characters)
   - Ensure you're sending the correct token

3. **Check platform value:**
   - Must be exactly `IOS`, `ANDROID`, or `WEB`
   - Case sensitive

---

## Environment Variables

Required backend environment variables:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=basma-maintenance
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
FIREBASE_DATABASE_URL=https://basma-maintenance.firebaseio.com
```

---

## Rate Limits

All FCM endpoints are subject to the general API rate limit:

- **Auth endpoints:** 5 requests per minute
- **General API:** 100 requests per minute

---

## Support

For issues or questions:

- Backend issues: Contact backend team
- Firebase issues: Check [Firebase documentation](https://firebase.google.com/docs/cloud-messaging)
- Mobile integration: See [Mobile Integration Guide](./mobile-push-notifications-guide.md)
