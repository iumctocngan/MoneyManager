import { Platform } from 'react-native';

// Tắt hoàn toàn Push Notifications vì ứng dụng chạy local bằng Expo, tránh các thông báo hoặc yêu cầu quyền dư thừa
async function getNotifications() {
  return null;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}

export async function scheduleDailyReminder(hour = 20, minute = 0) {
  // Không hoạt động khi chạy ở chế độ Expo local
}

export async function cancelDailyReminder() {
  // Không hoạt động khi chạy ở chế độ Expo local
}

export async function initializeNotifications() {
  // Bỏ qua việc đăng ký và yêu cầu quyền thông báo để tránh dư thừa khi chạy Expo local
}
