import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useStore } from '@/store/app-store';

export default function RootLayout() {
  const isHydrated = useStore((state) => state.isHydrated);
  const isInitialized = useStore((state) => state.isInitialized);
  const initializeApp = useStore((state) => state.initializeApp);

  useEffect(() => {
    if (isHydrated && !isInitialized) {
      void initializeApp();
    }
  }, [initializeApp, isHydrated, isInitialized]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {!isHydrated || !isInitialized ? (
          <LoadingScreen text="Đang khởi tạo ứng dụng..." />
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
        </Stack>
        )}
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
