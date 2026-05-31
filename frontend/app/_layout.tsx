import { LoadingScreen } from '@/components/LoadingScreen';
import { useStore } from '@/store/app-store';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SoftAlertComponent } from '@/components/ui/SoftAlert';

/**
 * Root layout của toàn bộ ứng dụng — mount một lần duy nhất, bọc tất cả màn hình.
 * Chịu trách nhiệm: chờ SQLite hydrate xong, khởi tạo app (sync token, v.v.),
 * sau đó mới render Stack navigator để tránh flash màn hình sai trạng thái.
 */
export default function RootLayout() {
  // isHydrated = true khi Zustand đã load xong dữ liệu từ SQLite
  const isHydrated = useStore((state) => state.isHydrated);
  const initializeApp = useStore((state) => state.initializeApp);
  // isInit tách biệt với isHydrated để phân biệt "dữ liệu local sẵn sàng" vs "app logic đã chạy xong"
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    // Chờ hydration xong mới gọi initializeApp, tránh chạy với state rỗng
    // Guard `!isInit` ngăn gọi lại khi component re-render
    if (isHydrated && !isInit) {
      initializeApp().then(() => {
        setIsInit(true);
      }).catch(() => {
        // Kể cả khi init thất bại (ví dụ: không có mạng), vẫn cho vào app ở chế độ offline
        setIsInit(true);
      });
    }
  }, [isHydrated, isInit, initializeApp]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Hiển thị loading cho đến khi cả hydration lẫn init hoàn tất */}
        {!isHydrated || !isInit ? (
          <LoadingScreen text="Đang khởi tạo ứng dụng" />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen name="tabs" options={{ headerShown: false }} />
              {/* presentation: 'modal' cho form thêm — trượt lên từ dưới theo UX convention */}
              <Stack.Screen
                name="transaction/add"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="transaction/[id]"
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="wallet/add"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="wallet/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="budget/add"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="(insights)/notifications"
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="(insights)/report"
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
            </Stack>
          )}
          <StatusBar style="auto" />
          {/* SoftAlertComponent đặt ngoài Stack để luôn render trên cùng, kể cả khi đang loading */}
          <SoftAlertComponent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
