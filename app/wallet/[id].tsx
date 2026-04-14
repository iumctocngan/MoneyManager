import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/app-store';
import { Colors, SoftColors, shadow } from '@/constants/design';

import { SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { formatCurrency } from '@/utils';
import { getWalletIconName } from '@/utils/iconography';
import { useWalletStats } from '@/hooks/useTransactions';
import { TransactionItem } from '@/components/TransactionItem';

export default function WalletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wallets, transactions, getCategoryById, deleteWallet, settings } = useStore();

  const wallet = wallets.find((item) => item.id === id);

  const { monthIncome, monthExpense } = useWalletStats(id);
  
  const walletTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.walletId === id || transaction.toWalletId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, id]
  );

  if (!wallet) {
    return null;
  }

  const handleDelete = async () => {
    try {
      await deleteWallet(id);
      router.back();
    } catch (error) {
      Alert.alert(
        'Không thể xoá ví',
        error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
      );
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Xoá ví',
      `Bạn có chắc muốn xoá ví "${wallet.name}"? Tất cả giao dịch liên quan cũng sẽ bị xoá.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: () => {
            void handleDelete();
          },
        },
      ]
    );
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
            <Text style={styles.headerTitle}>Chi tiết ví</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity activeOpacity={0.82} onPress={() => router.push(`/wallet/edit?id=${id}`)} style={styles.headerIcon}>
                <Ionicons name="pencil-outline" size={20} color={SoftColors.text} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.82} onPress={confirmDelete} style={styles.headerIcon}>
                <Ionicons name="trash-outline" size={20} color={SoftColors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <LinearGradient colors={[wallet.color, `${wallet.color}CC`]} style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <Ionicons name={getWalletIconName(wallet.icon)} size={26} color="#fff" />
              </View>
              <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={styles.walletName}>{wallet.name}</Text>
            <Text style={styles.walletBalance}>{formatCurrency(wallet.balance)}</Text>

          </LinearGradient>

          <TouchableOpacity 
            activeOpacity={0.82} 
            style={styles.transferButton}
            onPress={() => router.push(`/wallet/transfer?from=${id}`)}
          >
            <Ionicons name="swap-horizontal" size={20} color={SoftColors.primaryDark} />
            <Text style={styles.transferButtonText}>Chuyển tiền sang ví khác</Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <SoftCard style={styles.statCard}>
              <Text style={styles.statLabel}>Thu tháng này</Text>
              <Text style={[styles.statValue, { color: Colors.income }]}>
                +{formatCurrency(monthIncome)}
              </Text>
            </SoftCard>
            <SoftCard style={styles.statCard}>
              <Text style={styles.statLabel}>Chi tháng này</Text>
              <Text style={[styles.statValue, { color: Colors.expense }]}>
                -{formatCurrency(monthExpense)}
              </Text>
            </SoftCard>
          </View>

          <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          <SoftCard style={styles.listCard}>
            {walletTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="swap-horizontal-outline" size={28} color={SoftColors.primaryDark} />
                <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
              </View>
            ) : (
              walletTransactions.map((transaction, index) => {
                const category = getCategoryById(transaction.categoryId);
                const destWallet = wallets.find(w => w.id === transaction.toWalletId);
                const sourceWallet = wallets.find(w => w.id === transaction.walletId);

                return (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    wallet={sourceWallet}
                    destWallet={destWallet}
                    category={category}
                    settings={settings}
                    isLast={index === walletTransactions.length - 1}
                    perspectiveWalletId={id}
                    onPress={() => router.push(`/transaction/${transaction.id}`)}
                  />
                );
              })
            )}
          </SoftCard>
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
    padding: 20,
    minHeight: 190,
    marginBottom: 16,
    ...shadow.glow,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  heroIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 10,
  },
  walletBalance: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
    ...shadow.card,
  },
  transferButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: SoftColors.primaryDark,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    color: SoftColors.muted,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 10,
  },
  listCard: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(174, 213, 188, 0.26)',
  },
  transactionRowLast: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionBody: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    color: SoftColors.muted,
  },
  transactionAmount: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 34,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
  },
});
