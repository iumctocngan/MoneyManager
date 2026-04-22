import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Budget, Transaction } from '@/constants/types';

/**
 * Detect whether the app is running inside Expo Go.
 * In Expo Go (SDK 53+), remote push notification infrastructure
 * has been removed. All push-notification calls must be guarded.
 */
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  // Fallback for older SDK versions
  (Constants as any).appOwnership === 'expo';

/**
 * Lazily import expo-notifications only in a real dev/production build.
 * This prevents the module's side-effect code (addPushTokenListener) from
 * crashing Expo Go at startup.
 */
async function getNotifications() {
  if (isExpoGo) return null;
  return import('expo-notifications');
}

// Configure foreground notification handler — only outside Expo Go.
if (!isExpoGo) {
  void import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  });
}

/**
 * Request notification permissions from the user.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a daily reminder notification at a specific hour.
 * Cancels any previous daily reminder before scheduling.
 */
export async function scheduleDailyReminder(hour = 20, minute = 0) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  // Cancel existing daily reminders
  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💰 Nhớ ghi chi tiêu!',
      body: 'Hãy ghi lại các khoản chi tiêu trong ngày nhé.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Cancel the scheduled daily reminder.
 */
export async function cancelDailyReminder() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.title?.includes('Nhớ ghi chi tiêu')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Send an immediate local notification for budget alerts.
 */
export async function sendBudgetAlert(categoryName: string, pct: number) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const isExceeded = pct >= 100;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isExceeded ? '🔴 Vượt ngân sách!' : '⚠️ Sắp hết ngân sách',
      body: isExceeded
        ? `${categoryName}: Đã chi ${Math.round(pct)}% ngân sách. Hãy cân nhắc chi tiêu!`
        : `${categoryName}: Đã chi ${Math.round(pct)}% ngân sách.`,
      sound: true,
    },
    trigger: null, // Immediate
  });
}

/**
 * Check budgets and fire push notifications for any that cross thresholds.
 * Should be called after adding a transaction.
 */
export function checkBudgetAlerts(
  budgets: Budget[],
  transactions: Transaction[],
  getCategoryName: (id: string) => string
) {
  const now = new Date();

  for (const budget of budgets) {
    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate);

    if (now < start || now > end) continue;

    const spent = transactions
      .filter(
        (tx) =>
          tx.categoryId === budget.categoryId &&
          tx.type === 'expense' &&
          new Date(tx.date) >= start &&
          new Date(tx.date) <= end
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    if (pct >= 80) {
      const catName = getCategoryName(budget.categoryId);
      void sendBudgetAlert(catName, pct);
    }
  }
}

/**
 * Initialize push notifications setup.
 * Requests permission and sets up the daily reminder.
 * No-ops in Expo Go (SDK 53+).
 */
export async function initializeNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Thông báo',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#36D879',
    });
  }

  // Schedule daily reminder at 8pm
  await scheduleDailyReminder(20, 0);
}
