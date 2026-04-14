import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/app-store';
import { Colors, SoftColors, shadow } from '@/constants/design';
import { SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { formatCurrency, formatDateFull } from '@/utils';
import { getCategoryIconName, getWalletIconName } from '@/utils/iconography';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, wallets, getCategoryById, deleteTransaction } = useStore();

  const transaction = transactions.find((item) => item.id === id);

  if (!transaction) {
    return null;
  }

  const category = getCategoryById(transaction.categoryId);
  const wallet = wallets.find((item) => item.id === transaction.walletId);
  const typeColor = transaction.type === 'income' ? Colors.income : Colors.expense;

  const handleDelete = async () => {
    try {
      await deleteTransaction(transaction.id);
      router.back();
    } catch (error) {
      Alert.alert(
        'Không thể xoá giao dịch',
        error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
      );
    }
  };

  const confirmDelete = () => {
    Alert.alert('Xoá giao dịch', 'Bạn có chắc muốn xoá giao dịch này không?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => {
          void handleDelete();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity activeOpacity={0.82} onPress={() => router.back()} style={styles.headerIcon}>
              <Ionicons name="arrow-back" size={22} color={SoftColors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chi tiết giao dịch</Text>
            <TouchableOpacity activeOpacity={0.82} onPress={confirmDelete} style={styles.headerIcon}>
              <Ionicons name="trash-outline" size={20} color={SoftColors.text} />
            </TouchableOpacity>
          </View>

          <LinearGradient colors={[typeColor, `${typeColor}CC`]} style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons name={getCategoryIconName(category?.id)} size={28} color="#fff" />
            </View>
            <Text style={styles.heroCategory}>{category?.name || 'Khác'}</Text>
            <Text style={styles.heroAmount}>
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </Text>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>{transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}</Text>
            </View>
          </LinearGradient>

          <SoftCard style={styles.infoCard}>
            <DetailRow icon="calendar-outline" label="Ngày" value={formatDateFull(transaction.date)} />
            <DetailRow
              icon={getWalletIconName(wallet?.icon)}
              label="Ví"
              value={wallet?.name || 'Không xác định'}
            />
            {transaction.note ? <DetailRow icon="create-outline" label="Ghi chú" value={transaction.note} /> : null}
            <DetailRow
              icon="time-outline"
              label="Tạo lúc"
              value={new Date(transaction.createdAt).toLocaleString('vi-VN')}
              last
            />
          </SoftCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color={SoftColors.text} />
      </View>
      <View style={styles.detailBody}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
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
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 18,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: SoftColors.text,
  },
  heroCard: {
    borderRadius: 30,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginBottom: 18,
    ...shadow.card,
  },
  heroIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroCategory: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  infoCard: {
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(174, 213, 188, 0.24)',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginRight: 12,
  },
  detailBody: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: SoftColors.muted,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
    color: SoftColors.text,
    fontWeight: '700',
  },
});
