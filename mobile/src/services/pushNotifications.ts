// ============================================
// REUSA - Push Notifications Service
// ============================================

import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usersApi } from './api';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/stores/authStore';

// Configure notification behavior - wrapped in try-catch for emulator compatibility
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  console.log('Notifications handler setup skipped (emulator mode):', error);
}

/**
 * Register for push notifications and get token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const token = tokenData.data;

    // Android-specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2D9B6E',
      });

      // Chat messages channel
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Mensajes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#2D9B6E',
      });

      // Transactions channel
      await Notifications.setNotificationChannelAsync('transactions', {
        name: 'Compras y Ventas',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Send token to backend
 */
export async function savePushToken(token: string): Promise<void> {
  try {
    const platform = Platform.OS as 'ios' | 'android';
    await usersApi.registerDevice(token, platform);
    console.log('Push token saved to backend');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Handle notification response (when user taps notification)
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigation: any,
) {
  const data = response.notification.request.content.data;

  switch (data?.type) {
    case 'message':
      if (data.conversationId) {
        navigation.navigate(ROUTES.CHAT_DETAIL, {
          conversationId: data.conversationId,
        });
      }
      break;

    case 'purchase':
    case 'offer':
    case 'trade_proposal':
      if (data.conversationId) {
        navigation.navigate(ROUTES.CHAT_DETAIL, {
          conversationId: data.conversationId,
        });
      } else if (data.transactionId) {
        navigation.navigate(ROUTES.TRANSACTION_DETAIL, {
          transactionId: data.transactionId,
        });
      }
      break;

    case 'review':
      navigation.navigate(ROUTES.REVIEWS, { userId: 'me' });
      break;

    case 'price_drop':
    case 'favorite':
      if (data.productId) {
        navigation.navigate(ROUTES.PRODUCT_DETAIL, {
          productId: data.productId,
        });
      }
      break;

    default:
      // Default: go to home
      navigation.navigate(ROUTES.HOME_TAB);
  }
}

/**
 * Hook for managing push notifications
 */
export function usePushNotifications() {
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Skip notifications setup in emulator
    if (!Device.isDevice) {
      console.log('Push notifications skipped (emulator mode)');
      return;
    }

    // Register and save token
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        savePushToken(token);
      }
    }).catch((error) => {
      console.log('Push notification registration failed:', error);
    });

    // Listen for incoming notifications while app is open
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received:', notification);
        }
      );

      // Listen for notification responses (user taps)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          handleNotificationResponse(response, navigation);
        }
      );
    } catch (error) {
      console.log('Notification listeners setup failed:', error);
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, navigation]);

  return {
    expoPushToken,
  };
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null = immediate
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
