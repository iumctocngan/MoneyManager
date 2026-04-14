import { TransactionItem } from '@/components/TransactionItem';
import { DonutChart } from '@/components/ui/donut-chart';
import { SectionHeading, SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { Colors , SoftColors, shadow } from '@/constants/design';

import { filterTransactionsByPeriod, generateFinancialReport } from '@/services/report.service';
import { useStore } from '@/store/app-store';
import { Wallet, Transaction } from '@/constants/types';

import { formatCurrency } from '@/utils';
import { getWalletIconName } from '@/utils/iconography';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { wallets, transactions, getTotalBalance, getCategoryById, settings, refreshState, user } = useStore();
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);



  const [period, setPeriod] = useState('month');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const filteredTxs = useMemo(() => {
    return filterTransactionsByPeriod(transactions, period);
  }, [period, transactions]);

  const monthIncome = filteredTxs
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthExpense = filteredTxs
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalBalance = getTotalBalance();

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [transactions]
  );



  const {
    top4Cats: top4Exp,
    othersAmount,
    realTotal: totalExpense
  } = useMemo(() => {
    const txConverter = (tx: { walletId: string; amount: number }) => tx.amount;
    return generateFinancialReport(transactions, period, 'expense', txConverter);
  }, [transactions, period]);

  const COLORS = ['#FAD02C', Colors.expense, SoftColors.mint, SoftColors.purple];
  const donutData = top4Exp.map((item, idx) => ({
    percentage: item.amount / totalExpense,
    color: COLORS[idx % COLORS.length]
  }));

  if (othersAmount > 0) {
    donutData.push({
      percentage: othersAmount / totalExpense,
      color: 'rgba(174, 213, 188, 0.4)' // Soft neutral color
    });
  }

  const PERIOD_LABELS = {
    today: 'Hôm nay',
    week: 'Tuần này',
    month: 'Tháng này',
    quarter: 'Quý này',
    year: 'Năm nay',
  };
  const periodLabel = PERIOD_LABELS[period as keyof typeof PERIOD_LABELS] || 'Tháng này';

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshState();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SoftColors.primary} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Xin chào {user?.name || 'bạn'} 👋</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.headerIcon}
              onPress={() => router.push('/tabs/more')}
            >
              <Ionicons name="notifications-outline" size={20} color={SoftColors.text} />
              <View style={styles.dot} />
            </TouchableOpacity>
          </View>

          <LinearGradient colors={[SoftColors.primary, '#5FE59D']} style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceLabel}>Tổng số dư</Text>
                <Text style={styles.balanceValue}>
                  {showBalance ? formatCurrency(totalBalance) : '••••••••'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.84}
                style={styles.eyeButton}
                onPress={() => setShowBalance((current) => !current)}
              >
                <Ionicons name={showBalance ? 'eye-outline' : 'eye-off-outline'} size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceCoin}>
              <Ionicons name="wallet-outline" size={34} color="#fff" />
            </View>
          </LinearGradient>

          <View style={styles.summaryRow}>
            <SoftCard style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: `${Colors.income}20` }]}>
                <Ionicons name="arrow-up" size={16} color={Colors.income} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Thu nhập</Text>
                <Text style={[styles.summaryValue, { color: Colors.income }]}>
                  {showBalance ? formatCurrency(monthIncome) : '••••'}
                </Text>
              </View>
            </SoftCard>

            <SoftCard style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: `${Colors.expense}20` }]}>
                <Ionicons name="arrow-down" size={16} color={Colors.expense} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Chi tiêu</Text>
                <Text style={[styles.summaryValue, { color: Colors.expense }]}>
                  {showBalance ? formatCurrency(monthExpense) : '••••'}
                </Text>
              </View>
            </SoftCard>
          </View>

          {/* Ví của tôi */}
          <SectionHeading
            title="Ví của tôi"
            actionLabel="Quản lý ví"
            onAction={() => router.push('/wallet/manage')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walletsScroll}
          >
            {wallets.map((wallet: Wallet) => (
              <TouchableOpacity
                key={wallet.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/wallet/[id]', params: { id: wallet.id } } as any)}
              >
                <SoftCard style={styles.walletCard}>
                  <Ionicons name={getWalletIconName(wallet.icon)} size={24} color={SoftColors.primaryDark} />
                  <View>
                    <Text style={styles.walletName} numberOfLines={1}>{wallet.name}</Text>
                    <Text style={styles.walletBalance}>
                      {showBalance ? formatCurrency(wallet.balance) : '••••'}
                    </Text>
                  </View>
                </SoftCard>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addWalletCard}
              onPress={() => router.push('/wallet/add')}
            >
              <Ionicons name="add-circle-outline" size={24} color={SoftColors.muted} />
              <Text style={styles.addWalletText}>Thêm ví</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.reportSectionHeader}>
            <Text style={styles.reportTitleMain}>Tình hình thu chi</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.periodDropdownBtn} onPress={() => setShowPeriodMenu(!showPeriodMenu)}>
                <Text style={styles.periodDropdownText}>{periodLabel}</Text>
                <Ionicons name="chevron-down" size={16} color={SoftColors.muted} />
              </TouchableOpacity>
            </View>

            {showPeriodMenu && (
              <View style={styles.periodMenu}>
                {[
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'week', label: 'Tuần này' },
                  { id: 'month', label: 'Tháng này' },
                  { id: 'quarter', label: 'Quý này' },
                  { id: 'year', label: 'Năm nay' },
                ].map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.periodMenuItem}
                    onPress={() => { setPeriod(p.id); setShowPeriodMenu(false); }}
                  >
                    <Text style={[styles.periodMenuText, period === p.id && styles.periodMenuTextActive]}>{p.label}</Text>
                    {period === p.id && <Ionicons name="checkmark" size={16} color={SoftColors.primaryDark} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <SoftCard style={[styles.reportCard, { zIndex: -1 }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => router.push({ pathname: '/report', params: { period } } as any)}>
              <View style={styles.newReportTop}>
                <View style={styles.barChartContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: Colors.income,
                        height: `${Math.max((monthIncome / Math.max(monthIncome, monthExpense, 1)) * 100, 15)}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: Colors.expense,
                        height: `${Math.max((monthExpense / Math.max(monthIncome, monthExpense, 1)) * 100, 15)}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.newReportValues}>
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Thu</Text>
                    <Text style={[styles.valueAmount, { color: Colors.income }]}>
                      {formatCurrency(monthIncome)}
                    </Text>
                  </View>
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Chi</Text>
                    <Text style={[styles.valueAmount, { color: Colors.expense }]}>
                      {formatCurrency(monthExpense)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Chênh lệch</Text>
                    <Text style={[styles.valueAmount, { color: SoftColors.text, fontWeight: '900' }]}>
                      {formatCurrency(Math.abs(monthIncome - monthExpense))}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.newReportBottom}>
                <View style={styles.donutChartWrapper}>
                  <DonutChart data={donutData} size={100} strokeWidth={22} />
                </View>

                <View style={styles.legendContainer}>
                  {top4Exp.map((item, index) => {
                    const cat = getCategoryById(item.id);
                    const p = ((item.amount / totalExpense) * 100).toFixed(2).replace('.', ',');
                    return (
                      <View style={styles.legendRow} key={item.id}>
                        <View style={[styles.legendDot, { backgroundColor: COLORS[index % COLORS.length] }]} />
                        <Text style={styles.legendLabel}>{cat?.name || 'Các khoản còn lại'}</Text>
                        <Text style={styles.legendPercent}>{p} %</Text>
                      </View>
                    );
                  })}
                  {othersAmount > 0 && (
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: 'rgba(174, 213, 188, 0.4)' }]} />
                      <Text style={styles.legendLabel}>Các khoản còn lại</Text>
                      <Text style={styles.legendPercent}>{((othersAmount / totalExpense) * 100).toFixed(2).replace('.', ',')} %</Text>
                    </View>
                  )}
                  {top4Exp.length === 0 && (
                    <Text style={{ fontSize: 14, color: SoftColors.muted, fontStyle: 'italic' }}>Chưa có phát sinh chi tiêu</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </SoftCard>

          <SectionHeading
            title="Giao dịch gần đây"
            actionLabel="Xem tất cả"
            onAction={() => router.push('/tabs/transactions')}
          />

          <SoftCard style={styles.transactionsCard}>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="wallet-outline" size={28} color={SoftColors.primaryDark} />
                </View>
                <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
                <Text style={styles.emptyText}>Thêm giao dịch đầu tiên để bắt đầu theo dõi chi tiêu.</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.emptyButton}
                  onPress={() => router.push('/transaction/add')}
                >
                  <Text style={styles.emptyButtonText}>Thêm giao dịch</Text>
                </TouchableOpacity>
              </View>
            ) : (
              recentTransactions.map((transaction: Transaction, index: number) => {
                const category = getCategoryById(transaction.categoryId);
                const wallet = wallets.find((item: Wallet) => item.id === transaction.walletId);
                const isTransfer = transaction.type === 'transfer';
                const destWallet = isTransfer ? wallets.find((w: Wallet) => w.id === transaction.toWalletId) : null;

                return (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    wallet={wallet}
                    destWallet={destWallet}
                    category={category}
                    settings={settings}
                    isLast={index === recentTransactions.length - 1}
                    onPress={() => router.push(`/transaction/${transaction.id}`)}
                    showDate
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
  walletsScroll: {
    paddingBottom: 24,
    gap: 12,
  },
  walletCard: {
    width: 140,
    padding: 16,
    justifyContent: 'space-between',
    gap: 14,
    borderLeftWidth: 4,
    borderLeftColor: SoftColors.primary,
  },
  walletName: {
    fontSize: 13,
    color: SoftColors.muted,
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 15,
    fontWeight: '800',
    color: SoftColors.text,
  },
  addWalletCard: {
    width: 110,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(174, 213, 188, 0.4)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  addWalletText: {
    marginTop: 8,
    fontSize: 13,
    color: SoftColors.muted,
    fontWeight: '600'
  },
  root: {
    flex: 1,
    backgroundColor: SoftColors.pageBase,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 112,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 14,
    color: SoftColors.muted,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: SoftColors.text,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  dot: {
    position: 'absolute',
    top: 13,
    right: 13,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.expense,
  },
  balanceCard: {
    borderRadius: 30,
    padding: 22,
    minHeight: 150,
    marginBottom: 14,
    ...shadow.glow,
  },
  balanceTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 33,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  eyeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCoin: {
    position: 'absolute',
    right: 20,
    bottom: 18,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: SoftColors.muted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  reportCard: {
    padding: 18,
    marginBottom: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: SoftColors.text,
  },
  reportSub: {
    fontSize: 13,
    color: SoftColors.muted,
    marginTop: 4,
  },
  reportAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  reportStatBox: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.74)',
  },
  reportStatGreen: {
    backgroundColor: 'rgba(75, 221, 125, 0.14)',
  },
  reportStatRed: {
    backgroundColor: 'rgba(255, 107, 120, 0.14)',
  },
  reportStatLabel: {
    fontSize: 11,
    color: SoftColors.muted,
    marginBottom: 4,
  },
  reportStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: SoftColors.text,
  },
  periodRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodPillActive: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: SoftColors.primary,
  },
  periodPillActiveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  netChangeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  transactionsCard: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(174, 213, 188, 0.25)',
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
    fontWeight: '700',
    color: SoftColors.text,
  },
  transactionMeta: {
    fontSize: 12,
    color: SoftColors.muted,
    marginTop: 4,
  },
  transactionAmountWrap: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  transactionDate: {
    fontSize: 11,
    color: SoftColors.muted,
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(54, 216, 121, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: SoftColors.muted,
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyButton: {
    backgroundColor: SoftColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    ...shadow.glow,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  newReportTop: {
    flexDirection: 'row',
    marginBottom: 24,
    marginTop: 8,
  },
  barChartContainer: {
    width: 60,
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginRight: 24,
  },
  bar: {
    width: 24,
    borderRadius: 6,
  },
  newReportValues: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  valueLabel: {
    fontSize: 15,
    color: SoftColors.muted,
  },
  valueAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(174, 213, 188, 0.35)',
    marginVertical: 4,
  },
  reportSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 10,
  },
  reportTitleMain: {
    fontSize: 20,
    fontWeight: '800',
    color: SoftColors.text,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(174, 213, 188, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  periodDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(174, 213, 188, 0.5)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  periodDropdownText: {
    fontSize: 14,
    color: SoftColors.text,
    marginRight: 6,
  },
  periodMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    width: 140,
    ...shadow.card,
    zIndex: 100,
  },
  periodMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  periodMenuText: {
    fontSize: 14,
    color: SoftColors.text,
  },
  periodMenuTextActive: {
    color: SoftColors.primaryDark,
    fontWeight: '600',
  },
  newReportBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  donutChartWrapper: {
    marginRight: 28,
  },
  legendContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 10,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: SoftColors.text,
  },
  legendPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.text,
  },
  newReportAction: {
    alignItems: 'flex-end',
  },
  historyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(174, 213, 188, 0.4)',
  },
  historyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: SoftColors.text,
  },
});
