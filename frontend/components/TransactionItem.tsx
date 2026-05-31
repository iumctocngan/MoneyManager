import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, Wallet } from '@/constants/types';
import { Colors, SoftColors } from '@/constants/design';
import { formatCurrency, formatDate } from '@/utils';
import { getCategoryIconName } from '@/utils/iconography';

/**
 * Props cho TransactionItem.
 * `perspectiveWalletId` dùng khi xem giao dịch từ góc nhìn của một ví cụ thể
 * — ví dụ, trong màn hình chi tiết ví, một giao dịch chuyển khoản có thể là "nhận" hoặc "chuyển".
 */
interface TransactionItemProps {
  transaction: Transaction;
  wallet: Wallet | undefined;
  destWallet?: Wallet | null;
  category: any;

  isLast?: boolean;
  onPress: () => void;
  showDate?: boolean;
  perspectiveWalletId?: string;
}

/**
 * Hiển thị một giao dịch dưới dạng hàng có icon, tên danh mục, ghi chú, và số tiền.
 * Hỗ trợ cả ba loại giao dịch: income, expense, transfer.
 */
export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  wallet,
  destWallet,
  category,

  isLast,
  onPress,
  showDate = false,
  perspectiveWalletId,
}) => {
  const isTransfer = transaction.type === 'transfer';
  // Giao dịch transfer dùng icon cố định; các loại khác lấy icon theo danh mục
  const iconName = isTransfer ? 'swap-horizontal-outline' : getCategoryIconName(category?.id);
  
  // Logic for signs and colors based on perspective
  let isIncome = transaction.type === 'income';
  let isExpense = transaction.type === 'expense';
  
  // Khi xem từ góc nhìn của một ví cụ thể, quyết định chiều của transfer
  // để hiển thị màu xanh (nhận) hay đỏ (chuyển đi) cho đúng ngữ cảnh
  if (isTransfer && perspectiveWalletId) {
    if (transaction.toWalletId === perspectiveWalletId) {
      isIncome = true;
    } else if (transaction.walletId === perspectiveWalletId) {
      isExpense = true;
    }
  }

  // Màu số tiền: xanh = thu nhập, đỏ = chi tiêu, tím = chuyển khoản trung lập
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
      {/* Nền icon dùng màu danh mục với độ mờ 12% (`20` hex) để tạo hiệu ứng pill mềm */}
      <View style={[styles.transactionIcon, { backgroundColor: isTransfer ? `${SoftColors.primary}20` : `${category?.color || SoftColors.primary}20` }]}>
        <Ionicons name={iconName as any} size={18} color={isTransfer ? SoftColors.primaryDark : (category?.color || SoftColors.primaryDark)} />
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionTitle}>
          {isTransfer 
            // Nếu có perspectiveWalletId, đổi nhãn thành "Nhận tiền" / "Chuyển tiền" cho rõ nghĩa hơn
            ? (perspectiveWalletId 
                ? (transaction.toWalletId === perspectiveWalletId ? 'Nhận tiền' : 'Chuyển tiền')
                : 'Chuyển khoản'
              )
            : (category?.name || 'Khác')
          }
        </Text>
        <Text style={styles.transactionMeta}>
          {isTransfer 
            // Hiển thị lộ trình ví nguồn → ví đích thay vì ghi chú
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
    // Xóa đường kẻ dưới cho item cuối cùng trong danh sách
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
