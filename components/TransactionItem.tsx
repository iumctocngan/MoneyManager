import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, Wallet, AppSettings } from '@/constants/types';
import { Colors, SoftColors } from '@/constants/design';
import { formatCurrency, formatDate } from '@/utils';
import { getCategoryIconName } from '@/utils/iconography';

interface TransactionItemProps {
  transaction: Transaction;
  wallet: Wallet | undefined;
  destWallet?: Wallet | null;
  category: any;
  settings: AppSettings;
  isLast?: boolean;
  onPress: () => void;
  showDate?: boolean;
  perspectiveWalletId?: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  wallet,
  destWallet,
  category,
  settings,
  isLast,
  onPress,
  showDate = false,
  perspectiveWalletId,
}) => {
  const isTransfer = transaction.type === 'transfer';
  const iconName = isTransfer ? 'swap-horizontal-outline' : getCategoryIconName(category?.id);
  
  // Logic for signs and colors based on perspective
  let isIncome = transaction.type === 'income';
  let isExpense = transaction.type === 'expense';
  
  if (isTransfer && perspectiveWalletId) {
    if (transaction.toWalletId === perspectiveWalletId) {
      isIncome = true;
    } else if (transaction.walletId === perspectiveWalletId) {
      isExpense = true;
    }
  }

  const amountColor = isIncome 
    ? Colors.income 
    : (isExpense ? Colors.expense : SoftColors.primaryDark);

  const sign = isIncome ? '+' : (isExpense ? '-' : '');

  return (
    <TouchableOpacity
      style={[styles.transactionRow, isLast && styles.transactionRowLast]}
      activeOpacity={0.82}
      onPress={onPress}
    >
      <View style={[styles.transactionIcon, { backgroundColor: isTransfer ? `${SoftColors.primary}20` : `${category?.color || SoftColors.primary}20` }]}>
        <Ionicons name={iconName as any} size={18} color={isTransfer ? SoftColors.primaryDark : (category?.color || SoftColors.primaryDark)} />
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionTitle}>
          {isTransfer 
            ? (perspectiveWalletId 
                ? (transaction.toWalletId === perspectiveWalletId ? 'Nhận tiền' : 'Chuyển tiền')
                : 'Chuyển khoản'
              )
            : (category?.name || 'Khác')
          }
        </Text>
        <Text style={styles.transactionMeta}>
          {isTransfer 
            ? `${wallet?.name ?? 'Unknown'} ➔ ${destWallet?.name || '?'}`
            : (transaction.note || wallet?.name || 'Không có ghi chú')
          }
        </Text>
      </View>
      <View style={styles.transactionAmountWrap}>
        <Text
          style={[
            styles.transactionAmount,
            { color: amountColor },
          ]}
        >
          {sign}
          {formatCurrency(transaction.amount)}
        </Text>

        {showDate && <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});
