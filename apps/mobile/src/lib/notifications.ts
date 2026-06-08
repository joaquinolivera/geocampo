/**
 * @fileoverview Push notification service for GeoCampo mobile.
 *
 * Uses expo-notifications for local scheduled alerts and remote push (via Expo Push API).
 *
 * Setup in app.json (add to expo section):
 *   "plugins": ["expo-notifications"]
 *
 * Install:
 *   pnpm --filter @geocampo/mobile add expo-notifications
 *
 * Two notification types:
 *  1. Local scheduled — health due dates, stocking overload alerts
 *  2. Remote push     — team notifications, manager approvals (via Supabase Edge Functions)
 */

import * as Notifications from 'expo-notifications';
import type { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Config ──────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('geocampo', {
      name:       'GeoCampo',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync('geocampo_alerts', {
      name:       'Alertas ganaderas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500],
    });
  }

  return true;
}

// ─── Expo push token ──────────────────────────────────────────────────────────

/**
 * Get the Expo push token for this device.
 * Store this in Supabase (users.push_token) so your Edge Function can target it.
 */
export async function getExpoPushToken(projectId: string): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

// ─── Local scheduled notifications ────────────────────────────────────────────

export interface HealthDueAlert {
  herdName:      string;
  treatmentType: string;
  productName?:  string;
  dueDate:       Date;
}

/**
 * Schedule a local notification for an upcoming health treatment.
 * Call this whenever a health record with a nextDueDate is created/updated.
 * Returns the notification identifier (save to cancel later).
 */
export async function scheduleHealthDueAlert(alert: HealthDueAlert): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Fire the morning of the due date at 7:00 AM
  const fireAt = new Date(alert.dueDate);
  fireAt.setHours(7, 0, 0, 0);

  if (fireAt <= new Date()) return null; // already past

  const label = alert.productName
    ? `${alert.treatmentType} — ${alert.productName}`
    : alert.treatmentType;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ Sanidad: ${alert.herdName}`,
      body:  `Hoy vence: ${label}`,
      data:  { type: 'health_due', herdName: alert.herdName },
      sound: true,
      categoryIdentifier: 'geocampo_alerts',
    },
    trigger: {
      type: 'date' as unknown as SchedulableTriggerInputTypes,
      date: fireAt,
    } as Notifications.DateTriggerInput,
  });
}

export interface StockingAlert {
  pastureName:    string;
  capacityPercent: number;
}

/**
 * Send an immediate local notification for pasture overloading.
 */
export async function notifyOverload(alert: StockingAlert): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Sobrecarga: ${alert.pastureName}`,
      body:  `Carga al ${alert.capacityPercent}% de la capacidad. Considerá mover hacienda.`,
      data:  { type: 'stocking_overload', pastureName: alert.pastureName },
      sound: true,
    },
    trigger: null, // immediate
  });
}

// ─── Cancel / clear ───────────────────────────────────────────────────────────

export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Notification response listener ──────────────────────────────────────────

export type NotificationHandler = (notification: Notifications.Notification) => void;
export type ResponseHandler     = (response:     Notifications.NotificationResponse) => void;

/**
 * Set up notification listeners in _layout.tsx:
 *
 *   useEffect(() => {
 *     const { removeListeners } = setupNotificationListeners(
 *       (n) => console.log('received', n),
 *       (r) => router.push(`/herd/${r.notification.request.content.data.herdName}`)
 *     );
 *     return removeListeners;
 *   }, []);
 */
export function setupNotificationListeners(
  onReceive: NotificationHandler,
  onResponse: ResponseHandler,
): { removeListeners: () => void } {
  const sub1 = Notifications.addNotificationReceivedListener(onReceive);
  const sub2 = Notifications.addNotificationResponseReceivedListener(onResponse);

  return {
    removeListeners: () => {
      sub1.remove();
      sub2.remove();
    },
  };
}
