import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

async function getNotifications() {
  if (isExpoGo) return null;
  return import('expo-notifications');
}

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

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour = 20, minute = 0) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

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

export async function initializeNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Thông báo',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#36D879',
    });
  }

  await scheduleDailyReminder(20, 0);
}
