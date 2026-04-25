import { Redirect, Tabs, router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store/app-store';
import { Colors, SoftColors, shadow } from '@/constants/design';
import { LinearGradient } from 'expo-linear-gradient';

function TabBarButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.addButtonWrap}>
      <TouchableOpacity onPress={onPress} style={styles.addButton} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const authToken = useStore((state) => state.authToken);
  const { aiAssistantEnabled, setAiAssistantEnabled } = useStore();

  if (!authToken) {
    return <Redirect href={'/auth/login' as any} />;
  }

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 72 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          ...shadow.card,
        },
        tabBarActiveTintColor: SoftColors.primaryDark,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Số giao dịch',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-button"
        options={{
          title: '',
          tabBarButton: () => <TabBarButton onPress={() => router.push('/transaction/add')} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Ngân sách',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>

    {aiAssistantEnabled && (
      <View style={[styles.floatingContainer, { bottom: 85 + insets.bottom }]}>
        <TouchableOpacity 
          activeOpacity={0.9}
          style={styles.floatingButton} 
          onPress={() => router.push('/ai-chat')}
        >
          <LinearGradient colors={[SoftColors.primary, '#5FE59D']} style={styles.floatingGradient}>
            <Ionicons name="sparkles" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.closeFloating}
          onPress={() => setAiAssistantEnabled(false)}
        >
          <Ionicons name="close" size={14} color={SoftColors.muted} />
        </TouchableOpacity>
      </View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  addButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: SoftColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  floatingContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    ...shadow.glow,
  },
  floatingGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFloating: {
    position: 'absolute',
    top: -6,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    ...shadow.soft,
  },
});
