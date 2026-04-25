import { LoadingScreen } from '@/components/LoadingScreen';
import { useStore } from '@/store/app-store';
import { initializeNotifications } from '@/utils/push-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const isHydrated = useStore((state) => state.isHydrated);
  const initializeApp = useStore((state) => state.initializeApp);
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    if (isHydrated && !isInit) {
      initializeApp().then(() => {
        setIsInit(true);
      }).catch(() => {
        setIsInit(true);
      });
    }
  }, [isHydrated, isInit, initializeApp]);

  useEffect(() => {
    if (isInit) {
      void initializeNotifications();
    }
  }, [isInit]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {!isHydrated || !isInit ? (
          <LoadingScreen text="Đang khởi tạo ứng dụng" />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen name="tabs" options={{ headerShown: false }} />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
