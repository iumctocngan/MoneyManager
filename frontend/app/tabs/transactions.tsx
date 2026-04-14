import React, { useMemo, useState } from 'react';
import { Transaction } from '@/constants/types';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useStore } from '@/store/app-store';
import { Colors, SoftColors, shadow } from '@/constants/design';

import { SectionHeading, SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';
import { formatMonthYear } from '@/utils';

import { useMonthTransactions } from '@/hooks/useTransactions';
import { TransactionItem } from '@/components/TransactionItem';

export default function TransactionsScreen() {
  const { wallets, getCategoryById, deleteTransaction, settings } = useStore();
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { filtered: monthTransactions } = useMonthTransactions(viewYear, viewMonth);

  const dayOptions = useMemo(() => {
    const uniqueDays = [...new Set(monthTransactions.map((transaction: Transaction) => new Date(transaction.date).getDate()))]
      .sort((a: number, b: number) => a - b)
      .slice(0, 7);

    if (uniqueDays.length > 0) {
      return uniqueDays;
    }

    return [Math.min(new Date().getDate(), new Date(viewYear, viewMonth + 1, 0).getDate())];
  }, [monthTransactions, viewYear, viewMonth]);

  const activeDay = selectedDay && dayOptions.includes(selectedDay) ? selectedDay : dayOptions[0] ?? null;

  const filteredTransactions = useMemo(
    () =>
      monthTransactions.filter((transaction: Transaction) => {
        const category = getCategoryById(transaction.categoryId);
        const wallet = wallets.find((item) => item.id === transaction.walletId);
        const query = searchQuery.trim().toLowerCase();

        if (selectedType !== 'all' && transaction.type !== selectedType) {
          return false;
        }

        if (activeDay && new Date(transaction.date).getDate() !== activeDay) {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = [
          category?.name,
          wallet?.name,
          transaction.note,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      }),
    [activeDay, getCategoryById, monthTransactions, searchQuery, selectedType, wallets]
  );



  const previousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      setSelectedDay(null);
      return;
    }

    setViewMonth((month) => month - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      setSelectedDay(null);
      return;
    }

    setViewMonth((month) => month + 1);
    setSelectedDay(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch (error) {
      Alert.alert(
        'Không thể xoá giao dịch',
        error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
      );
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Xoá giao dịch', 'Bạn có chắc muốn xoá giao dịch này không?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => {
          void handleDelete(id);
        },
      },
    ]);
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => confirmDelete(id)} activeOpacity={0.82}>
      <Ionicons name="trash-outline" size={20} color="#fff" />
      <Text style={styles.deleteText}>Xoá</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Số giao dịch</Text>
            <Text style={styles.headerSub}>{formatMonthYear(viewYear, viewMonth)}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.82}
              style={[styles.headerIcon, showSearch && { backgroundColor: SoftColors.primary }]}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons name="search-outline" size={20} color={showSearch ? '#fff' : SoftColors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.monthRow}>
          <TouchableOpacity onPress={previousMonth} activeOpacity={0.82} style={styles.monthButton}>
            <Ionicons name="chevron-back" size={18} color={SoftColors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{formatMonthYear(viewYear, viewMonth)}</Text>
          <TouchableOpacity onPress={nextMonth} activeOpacity={0.82} style={styles.monthButton}>
            <Ionicons name="chevron-forward" size={18} color={SoftColors.text} />
          </TouchableOpacity>
        </View>

        <SoftCard style={styles.segmentWrap}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'income', label: 'Thu' },
            { key: 'expense', label: 'Chi' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.82}
              style={[styles.segmentButton, selectedType === item.key && styles.segmentButtonActive]}
              onPress={() => setSelectedType(item.key as 'all' | 'income' | 'expense')}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedType === item.key && styles.segmentTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </SoftCard>

        {showSearch && (
          <View style={[softInputStyles.inputShell, { marginBottom: 14 }]}>
            <View style={softInputStyles.inputIcon}>
              <Ionicons name="search-outline" size={18} color={SoftColors.muted} />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm giao dịch..."
              placeholderTextColor={SoftColors.muted}
              style={styles.searchInput}
              selectionColor={SoftColors.primaryDark}
              autoFocus
            />
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysContent}
          style={styles.daysScroll}
        >
          {dayOptions.map((day: number) => {
            const date = new Date(viewYear, viewMonth, day);
            const isActive = activeDay === day;

            return (
              <TouchableOpacity
                key={day}
                activeOpacity={0.82}
                style={[styles.dayChip, isActive && styles.dayChipActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayWeek, isActive && styles.dayWeekActive]}>
                  {date.toLocaleDateString('vi-VN', { weekday: 'short' }).toUpperCase()}
                </Text>
                <Text style={[styles.dayDate, isActive && styles.dayDateActive]}>
                  {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <SectionHeading title={activeDay ? `T${activeDay} ${formatMonthYear(viewYear, viewMonth)}` : 'Giao dịch'} />



        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <SoftCard style={styles.listCard}>
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={24} color={SoftColors.primaryDark} />
                </View>
                <Text style={styles.emptyTitle}>Không có giao dịch phù hợp</Text>
                <Text style={styles.emptyText}>Hãy đổi bộ lọc hoặc thêm giao dịch mới.</Text>
              </View>
            ) : (
              filteredTransactions.map((transaction: Transaction, index: number) => {
                const category = getCategoryById(transaction.categoryId);
                const wallet = wallets.find((item) => item.id === transaction.walletId);
                const isTransfer = transaction.type === 'transfer';
                const destWallet = isTransfer ? wallets.find(w => w.id === transaction.toWalletId) : null;


                return (
                    <Swipeable
                      key={transaction.id}
                      renderRightActions={() => renderRightActions(transaction.id)}
                      overshootRight={false}
                    >
                      <TransactionItem
                        transaction={transaction}
                        wallet={wallet}
                        destWallet={destWallet}
                        category={category}
                        settings={settings}
                        isLast={index === filteredTransactions.length - 1}
                        onPress={() => router.push(`/transaction/${transaction.id}`)}
                      />
                    </Swipeable>
                );
              })
            )}
          </SoftCard>
          <View style={{ height: 120 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: SoftColors.text,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 13,
    color: SoftColors.muted,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
  },
  segmentWrap: {
    flexDirection: 'row',
    padding: 6,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: SoftColors.primary,
    ...shadow.glow,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.muted,
  },
  segmentTextActive: {
    color: '#fff',
  },
  searchInput: {
    flex: 1,
    color: SoftColors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  daysScroll: {
    flexGrow: 0,
    marginTop: 14,
    marginBottom: 8,
  },
  daysContent: {
    gap: 12,
    paddingRight: 8,
    alignItems: 'flex-start',
  },
  dayChip: {
    width: 74,
    minHeight: 78,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.8)',
    ...shadow.card,
  },
  dayChipActive: {
    backgroundColor: SoftColors.primary,
    ...shadow.glow,
  },
  dayWeek: {
    fontSize: 11,
    fontWeight: '800',
    color: SoftColors.muted,
    marginBottom: 6,
  },
  dayWeekActive: {
    color: '#EFFFF5',
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '800',
    color: SoftColors.text,
  },
  dayDateActive: {
    color: '#fff',
  },

  list: {
    flex: 1,
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
    fontSize: 15,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: 'rgba(54, 216, 121, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: SoftColors.muted,
    textAlign: 'center',
  },
  deleteAction: {
    width: 74,
    marginVertical: 8,
    borderRadius: 22,
    backgroundColor: Colors.expense,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
