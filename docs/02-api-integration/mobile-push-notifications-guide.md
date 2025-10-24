# Mobile Push Notifications Integration Guide

## Overview

This guide walks you through implementing push notifications in the Basma Maintenance mobile app using **Expo** and **Firebase Cloud Messaging (FCM)**.

## Prerequisites

- Expo-managed React Native project
- Backend API running with FCM endpoints
- Firebase project credentials (provided by backend team)

---

## Table of Contents

1. [Setup & Installation](#setup--installation)
2. [Firebase Configuration](#firebase-configuration)
3. [Request Permissions](#request-permissions)
4. [Device Registration](#device-registration)
5. [Handling Notifications](#handling-notifications)
6. [Deep Linking](#deep-linking)
7. [Topic Management](#topic-management)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Setup & Installation

### Step 1: Install Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

### Step 2: Configure app.json

Add Firebase configuration to your `app.json`:

```json
{
  "expo": {
    "name": "Basma Maintenance",
    "slug": "basma-maintenance",
    "version": "1.0.0",
    "android": {
      "package": "com.basma.maintenance",
      "googleServicesFile": "./google-services.json",
      "permissions": ["RECEIVE_BOOT_COMPLETED", "VIBRATE"]
    },
    "ios": {
      "bundleIdentifier": "com.basma.maintenance",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### Step 3: Add Firebase Config Files

**Get these files from the backend team:**

- `google-services.json` (for Android)
- `GoogleService-Info.plist` (for iOS)

Place them in your project root directory.

---

## Firebase Configuration

### Create Notification Service

Create `src/services/notificationService.ts`:

```typescript
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { API_URL } from "../config";

/**
 * Configure how notifications are displayed
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  /**
   * Request notification permissions (iOS requires explicit permission)
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn("Push notifications only work on physical devices");
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Failed to get push notification permissions");
      return false;
    }

    return true;
  }

  /**
   * Get FCM device token
   */
  async getDeviceToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        throw new Error("Must use physical device for push notifications");
      }

      // Get Expo push token (Expo handles FCM internally)
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      return token;
    } catch (error) {
      console.error("Error getting device token:", error);
      return null;
    }
  }

  /**
   * Register device with backend
   */
  async registerDevice(token: string, userJWT: string): Promise<boolean> {
    try {
      const platform = Platform.OS === "ios" ? "IOS" : "ANDROID";

      const response = await fetch(`${API_URL}/fcm/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userJWT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          platform,
          deviceId: Constants.deviceId || undefined,
          appVersion: Constants.expoConfig?.version || "1.0.0",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to register device");
      }

      console.log("✅ Device registered successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to register device:", error);
      return false;
    }
  }

  /**
   * Unregister device on logout
   */
  async unregisterDevice(token: string, userJWT: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/fcm/unregister`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userJWT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Failed to unregister device");
      }

      console.log("✅ Device unregistered successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to unregister device:", error);
      return false;
    }
  }

  /**
   * Subscribe to a topic
   */
  async subscribeToTopic(
    token: string,
    topic: string,
    userJWT: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/fcm/subscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userJWT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, topic }),
      });

      if (!response.ok) {
        throw new Error(`Failed to subscribe to ${topic}`);
      }

      console.log(`✅ Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${topic}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribeFromTopic(
    token: string,
    topic: string,
    userJWT: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/fcm/unsubscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userJWT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, topic }),
      });

      if (!response.ok) {
        throw new Error(`Failed to unsubscribe from ${topic}`);
      }

      console.log(`✅ Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from ${topic}:`, error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
```

---

## Request Permissions

### Add Permission Hook

Create `src/hooks/useNotificationPermissions.ts`:

```typescript
import { useState, useEffect } from "react";
import { notificationService } from "../services/notificationService";

export function useNotificationPermissions() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    setIsLoading(true);
    const granted = await notificationService.requestPermissions();
    setPermissionGranted(granted);
    setIsLoading(false);
  };

  return {
    permissionGranted,
    isLoading,
    requestPermissions,
  };
}
```

### Use in Your App

```typescript
import React from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useNotificationPermissions } from './hooks/useNotificationPermissions';

function App() {
  const { permissionGranted, isLoading, requestPermissions } = useNotificationPermissions();

  if (isLoading) {
    return <Text>Checking permissions...</Text>;
  }

  if (!permissionGranted) {
    return (
      <View>
        <Text>Notifications are disabled</Text>
        <Button
          title="Enable Notifications"
          onPress={() => {
            Alert.alert(
              'Enable Notifications',
              'Please enable notifications in your device settings',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }}
        />
      </View>
    );
  }

  return <YourApp />;
}
```

---

## Device Registration

### Register on Login

Add this to your login flow:

```typescript
import { notificationService } from "../services/notificationService";
import { useAuth } from "../context/AuthContext";

async function handleLogin(email: string, password: string) {
  try {
    // 1. Login to get JWT
    const authResponse = await loginAPI(email, password);
    const { token: userJWT } = authResponse;

    // 2. Save auth token
    await saveAuthToken(userJWT);

    // 3. Get device FCM token
    const fcmToken = await notificationService.getDeviceToken();

    if (fcmToken) {
      // 4. Register device with backend
      await notificationService.registerDevice(fcmToken, userJWT);
    }

    // 5. Navigate to home screen
    navigation.navigate("Home");
  } catch (error) {
    console.error("Login failed:", error);
    Alert.alert("Login Failed", "Please try again");
  }
}
```

### Unregister on Logout

```typescript
async function handleLogout() {
  try {
    const userJWT = await getAuthToken();
    const fcmToken = await notificationService.getDeviceToken();

    if (fcmToken && userJWT) {
      // 1. Unregister device
      await notificationService.unregisterDevice(fcmToken, userJWT);
    }

    // 2. Clear auth token
    await clearAuthToken();

    // 3. Navigate to login
    navigation.navigate("Login");
  } catch (error) {
    console.error("Logout failed:", error);
  }
}
```

---

## Handling Notifications

### Foreground Notifications

Handle notifications when app is open:

```typescript
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";

function useNotificationHandler() {
  const notificationListener = useRef<any>();

  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📬 Notification received:", notification);

        const { title, body } = notification.request.content;
        const data = notification.request.content.data;

        // Show an in-app alert or custom UI
        // You can also update badge counts, play sounds, etc.
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
    };
  }, []);
}
```

### Background & Quit State Notifications

Handle notification taps (when user taps the notification):

```typescript
import { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";

function useNotificationResponse() {
  const navigation = useNavigation();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Listen for user tapping on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 Notification tapped:", response);

        const data = response.notification.request.content.data;
        handleNotificationTap(data);
      });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigation]);

  const handleNotificationTap = (data: any) => {
    const { type, entityId, action } = data;

    // Handle deep links
    if (action) {
      const url = action.replace("basma://", "");
      const [screen, id] = url.split("/");

      switch (screen) {
        case "request":
          navigation.navigate("RequestDetail", { requestId: id });
          break;
        case "chat":
          navigation.navigate("Chat", { roomId: id });
          break;
        case "announcements":
          navigation.navigate("Announcements");
          break;
        default:
          console.warn("Unknown notification screen:", screen);
      }
    }
  };
}
```

### Complete Notification Hook

Combine everything into a single hook:

```typescript
// src/hooks/useNotifications.ts
import { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";

export function useNotifications() {
  const navigation = useNavigation();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Foreground notifications
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📬 Notification received:", notification);
        // Handle foreground notification
      });

    // Notification taps
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleDeepLink(data, navigation);
      });

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        handleDeepLink(data, navigation);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [navigation]);
}

function handleDeepLink(data: any, navigation: any) {
  const { action } = data;

  if (action) {
    const url = action.replace("basma://", "");
    const [screen, id, ...rest] = url.split("/");

    if (screen === "request") {
      navigation.navigate("RequestDetail", { requestId: id });
    } else if (screen === "chat") {
      navigation.navigate("Chat", { roomId: id });
    } else if (screen === "announcements") {
      navigation.navigate("Announcements");
    }
  }
}
```

### Use in Your Root Component

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useNotifications } from './hooks/useNotifications';

function AppNavigator() {
  useNotifications(); // Initialize notification handlers

  return (
    <NavigationContainer>
      {/* Your navigation setup */}
    </NavigationContainer>
  );
}
```

---

## Deep Linking

### Configure React Navigation

Update your navigation configuration to support deep links:

```typescript
import { LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['basma://', 'https://basma.app'],
  config: {
    screens: {
      Home: '',
      RequestDetail: 'request/:requestId',
      Chat: 'chat/:roomId',
      Announcements: 'announcements',
    },
  },
};

<NavigationContainer linking={linking}>
  {/* Your screens */}
</NavigationContainer>
```

---

## Topic Management

### Subscribe to Additional Topics

```typescript
// Subscribe to chat notifications
const fcmToken = await notificationService.getDeviceToken();
const userJWT = await getAuthToken();

await notificationService.subscribeToTopic(
  fcmToken!,
  "chat-messages",
  userJWT!
);
```

### User Preferences

Allow users to manage notification preferences:

```typescript
import React, { useState } from 'react';
import { View, Switch, Text } from 'react-native';
import { notificationService } from '../services/notificationService';

function NotificationSettings() {
  const [chatNotifications, setChatNotifications] = useState(true);
  const [requestUpdates, setRequestUpdates] = useState(true);

  const handleChatToggle = async (value: boolean) => {
    const fcmToken = await notificationService.getDeviceToken();
    const userJWT = await getAuthToken();

    if (value) {
      await notificationService.subscribeToTopic(fcmToken!, 'chat-messages', userJWT!);
    } else {
      await notificationService.unsubscribeFromTopic(fcmToken!, 'chat-messages', userJWT!);
    }

    setChatNotifications(value);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Chat Messages</Text>
        <Switch value={chatNotifications} onValueChange={handleChatToggle} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Request Updates</Text>
        <Switch value={requestUpdates} onValueChange={handleRequestToggle} />
      </View>
    </View>
  );
}
```

---

## Testing

### Test on Physical Device

**Push notifications only work on physical devices, not simulators/emulators.**

1. Build and install app on physical device:

```bash
expo run:ios --device
# or
expo run:android --device
```

2. Login to the app
3. Grant notification permissions
4. Use the backend test endpoint to send a test notification

### Test Notification Flow

Create a test screen in your app:

```typescript
import React, { useState } from 'react';
import { View, Button, TextInput, Alert } from 'react-native';
import { API_URL } from '../config';

function TestNotifications() {
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test');

  const sendTestNotification = async () => {
    try {
      const userJWT = await getAuthToken();
      const response = await fetch(`${API_URL}/fcm/test/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userJWT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: await getUserId(), // Your user ID
          title,
          body,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Test notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send notification');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Notification Title"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Notification Body"
        multiline
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, height: 100 }}
      />
      <Button title="Send Test Notification" onPress={sendTestNotification} />
    </View>
  );
}
```

---

## Troubleshooting

### Common Issues

**1. "Push notifications only work on physical devices"**

- **Solution:** Run on a real iOS/Android device, not simulator

**2. Notifications not appearing**

- Check permissions are granted
- Verify device is registered (check backend `/api/fcm/subscriptions`)
- Check Firebase console for delivery status
- Ensure app is built with correct Firebase config files

**3. "Failed to get device token"**

- Ensure `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in project root
- Rebuild app after adding config files
- Check Firebase project is correctly set up

**4. Deep links not working**

- Verify navigation configuration matches URL scheme
- Check `action` field in notification data payload
- Test deep links independently using Linking API

**5. iOS: Notifications work in development but not production**

- Ensure you have APNs certificates configured in Firebase
- Check production build has correct entitlements
- Verify bundle ID matches Firebase configuration

**6. Android: Notifications not showing**

- Check notification channel is created (Android 8+)
- Verify app has notification permissions
- Check battery optimization settings

### Debug Logging

Add comprehensive logging:

```typescript
// Enable verbose logging
console.log =
  console.info =
  console.warn =
  console.error =
    (message, ...args) => {
      // Your logging implementation
      if (__DEV__) {
        console.log(`[${new Date().toISOString()}]`, message, ...args);
      }
    };
```

---

## Production Checklist

Before releasing to production:

- [ ] Firebase config files added for both iOS and Android
- [ ] Notification permissions requested on app startup
- [ ] Device registration on login implemented
- [ ] Device unregistration on logout implemented
- [ ] Foreground notification handlers implemented
- [ ] Background notification handlers implemented
- [ ] Deep linking configured and tested
- [ ] Topic subscription/unsubscription working
- [ ] Tested on both iOS and Android physical devices
- [ ] APNs certificates configured in Firebase (iOS)
- [ ] Notification icons and sounds added
- [ ] User preference settings for notifications
- [ ] Analytics tracking for notification interactions

---

## Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Backend API Reference](./push-notifications-api-guide.md)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)

---

## Support

For issues or questions:

- Mobile development: Contact frontend team
- Backend API: See [Push Notifications API Guide](./push-notifications-api-guide.md)
- Firebase setup: Contact DevOps/backend team
