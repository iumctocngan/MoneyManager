import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useStore } from '@/store/app-store';
import { SoftColors, shadow } from '@/constants/design';
import { SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { generateNotifications } from '@/services/notification.service';
import { AppNotification } from '@/constants/types';

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function NotificationCard({ notification }: { notification: AppNotification }) {
  const iconName = notification.icon as React.ComponentProps<typeof Ionicons>['name'];

  return (
    <SoftCard style={styles.notifCard}>
      <View style={styles.notifRow}>
        <View style={[styles.notifIconWrap, { backgroundColor: `${notification.color}18` }]}>
          <Ionicons name={iconName} size={22} color={notification.color} />
        </View>
        <View style={styles.notifBody}>
          <View style={styles.notifTitleRow}>
            <Text style={styles.notifTitle}>{notification.title}</Text>
            <View style={[styles.typeDot, { backgroundColor: notification.color }]} />
          </View>
          <Text style={styles.notifMessage}>{notification.message}</Text>
          <Text style={styles.notifTime}>{getRelativeTime(notification.timestamp)}</Text>
        </View>
      </View>
    </SoftCard>
  );
}

export default function NotificationsScreen() {
  const { budgets, transactions, getCategoryById } = useStore();

  const notifications = useMemo(
    () => generateNotifications(budgets, transactions, getCategoryById),
    [budgets, transactions, getCategoryById]
  );

  const budgetAlerts = notifications.filter(
    (n) => n.type === 'budget_warning' || n.type === 'budget_exceeded'
  );
  const otherAlerts = notifications.filter(
    (n) => n.type !== 'budget_warning' && n.type !== 'budget_exceeded'
  );

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={22} color={SoftColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông báo</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{notifications.length}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {notifications.length === 0 ? (
            <SoftCard style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={36} color={SoftColors.primaryDark} />
              </View>
              <Text style={styles.emptyTitle}>Không có thông báo</Text>
              <Text style={styles.emptyText}>
                Mọi thứ đang ổn! Bạn sẽ nhận thông báo khi ngân sách sắp hết hoặc có cảnh báo quan trọng.
              </Text>
            </SoftCard>
          ) : (
            <>
              {budgetAlerts.length > 0 && (
                <>
                  <View style={styles.sectionRow}>
                    <Ionicons name="pie-chart-outline" size={16} color={SoftColors.muted} />
                    <Text style={styles.sectionLabel}>
                      Ngân sách ({budgetAlerts.length})
                    </Text>
                  </View>
                  {budgetAlerts.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </>
              )}

              {otherAlerts.length > 0 && (
                <>
                  <View style={styles.sectionRow}>
                    <Ionicons name="bulb-outline" size={16} color={SoftColors.muted} />
                    <Text style={styles.sectionLabel}>
                      Gợi ý ({otherAlerts.length})
                    </Text>
                  </View>
                  {otherAlerts.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </>
              )}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SoftColors.pageBase,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: SoftColors.text,
  },
  headerBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SoftColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    ...shadow.glow,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  content: {
    paddingBottom: 32,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.muted,
  },
  notifCard: {
    padding: 16,
    marginBottom: 12,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notifIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  notifBody: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifMessage: {
    fontSize: 14,
    color: SoftColors.muted,
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 12,
    color: 'rgba(110, 124, 142, 0.6)',
    fontWeight: '600',
  },
  emptyCard: {
    paddingVertical: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 32,
    backgroundColor: 'rgba(54, 216, 121, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: SoftColors.text,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: SoftColors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
