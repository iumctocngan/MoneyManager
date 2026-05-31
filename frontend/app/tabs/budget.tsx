import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SoftAlert } from '@/components/ui/SoftAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '@/store/app-store';
import { useMutations } from '@/hooks/useMutations';
import { Colors , SoftColors, shadow } from '@/constants/design';

import { GlowButton, SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { formatCurrency } from '@/utils';
import { getCategoryIconName } from '@/utils/iconography';

export default function BudgetScreen() {
  const { budgets, transactions, getCategoryById } = useStore();
  const { deleteBudget } = useMutations();

  // Tính toán tiến độ chi tiêu cho từng ngân sách — memo để tránh recompute khi re-render không liên quan
  const budgetsWithProgress = useMemo(
    () =>
      budgets.map((budget) => {
        const start = new Date(budget.startDate);
        const end = new Date(budget.endDate);

        // Chỉ tính các giao dịch CHI trong danh mục và khoảng thời gian của ngân sách
        const matchingTransactions = transactions.filter(
          (transaction) =>
            transaction.categoryId === budget.categoryId &&
            transaction.type === 'expense' &&
            new Date(transaction.date) >= start &&
            new Date(transaction.date) <= end
        );

        const spent = matchingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const remaining = budget.amount - spent;
        // pct = 0 khi budget.amount = 0 để tránh chia cho 0
        const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        // Tính toán số ngày còn lại của chu kỳ ngân sách
        const now = new Date();
        // Cắt giờ/phút/giây để so sánh ngày chính xác, tránh lệch múi giờ
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const diffTime = endDateOnly.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // daysLeft = -1 khi ngân sách đã hết hạn — dùng để hiển thị trạng thái "Đã kết thúc"
        const daysLeft = diffDays < 0 ? -1 : diffDays;

        return {
          ...budget,
          spent,
          remaining,
          pct,
          daysLeft,
        };
      }),
    [budgets, transactions]
  );

  // Tổng hợp toàn bộ ngân sách để hiển thị trên thẻ summary
  const totalBudget = budgetsWithProgress.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetsWithProgress.reduce((sum, b) => sum + b.spent, 0);
  // Clamp tối đa 100% để thanh tổng không tràn ra ngoài track
  const totalProgress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  // Thực hiện xóa sau khi người dùng xác nhận — lỗi hiển thị qua SoftAlert
  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
    } catch (error) {
      SoftAlert.alert(
        'Không thể xoá ngân sách',
        error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
      );
    }
  };

  // Hiện dialog xác nhận trước khi xóa để tránh thao tác nhầm
  const confirmDelete = (id: string) => {
    SoftAlert.alert('Xoá ngân sách', 'Bạn có chắc muốn xoá ngân sách này?', [
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

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ngân sách</Text>
          <TouchableOpacity activeOpacity={0.84} style={styles.addButton} onPress={() => router.push('/budget/add')}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Thẻ tổng chỉ hiện khi có ít nhất 1 ngân sách */}
          {budgets.length > 0 ? (
            <SoftCard style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Ngân sách tháng này</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalBudget)}</Text>
              <View style={styles.summaryStats}>
                <View>
                  <Text style={styles.summaryMetaLabel}>Đã chi</Text>
                  <Text style={[styles.summaryMetaValue, { color: Colors.expense }]}>
                    {formatCurrency(totalSpent)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.summaryMetaLabel}>Còn lại</Text>
                  {/* Màu xanh khi còn dư, đỏ khi vượt ngân sách */}
                  <Text style={[styles.summaryMetaValue, { color: totalBudget - totalSpent >= 0 ? Colors.income : Colors.expense }]}>
                    {formatCurrency(totalBudget - totalSpent)}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${totalProgress}%`,
                      // Đổi màu đỏ khi vượt 100% để cảnh báo trực quan
                      backgroundColor: totalProgress > 100 ? Colors.expense : SoftColors.primary,
                    },
                  ]}
                >
                  <Text style={styles.progressText}>{Math.round(totalProgress)}%</Text>
                </View>
              </View>
            </SoftCard>
          ) : null}

          {budgetsWithProgress.length === 0 ? (
            <SoftCard style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="pie-chart-outline" size={30} color={SoftColors.primaryDark} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có ngân sách</Text>
              <Text style={styles.emptyText}>Tạo ngân sách theo danh mục để kiểm soát chi tiêu tốt hơn.</Text>
              <GlowButton label="Tạo ngân sách" onPress={() => router.push('/budget/add')} style={styles.createButton} />
            </SoftCard>
          ) : (
            budgetsWithProgress.map((budget) => {
              const category = getCategoryById(budget.categoryId);
              const isOverBudget = budget.spent > budget.amount;
              // Màu thanh tiến độ: đỏ khi vượt, vàng khi > 80%, xanh khi an toàn
              const barColor = isOverBudget
                ? Colors.expense
                : budget.pct > 80
                  ? Colors.warning
                  : SoftColors.primary;
              const iconName = getCategoryIconName(category?.id);

              return (
                <SoftCard key={budget.id} style={styles.budgetCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.categoryIcon, { backgroundColor: `${category?.color || SoftColors.primary}22` }]}>
                        <Ionicons name={iconName} size={18} color={category?.color || SoftColors.primaryDark} />
                      </View>
                      <View>
                        <Text style={styles.categoryName}>{category?.name || 'Khác'}</Text>
                        <Text style={styles.categorySpent}>Đã chi: {formatCurrency(budget.spent)}</Text>
                        {/* Hiển thị cảnh báo màu vàng khi còn ≤ 3 ngày */}
                        <Text
                          style={[
                            styles.daysLeftText,
                            {
                              color:
                                budget.daysLeft >= 0 && budget.daysLeft <= 3
                                  ? Colors.warning
                                  : SoftColors.muted,
                              marginTop: 4,
                            },
                          ]}
                        >
                          {budget.daysLeft > 0
                            ? `Thời hạn: Còn ${budget.daysLeft} ngày`
                            : budget.daysLeft === 0
                              ? 'Thời hạn: Hôm nay hết hạn'
                              : 'Thời hạn: Đã kết thúc'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={styles.categoryBudget}>{formatCurrency(budget.amount)}</Text>
                      {/* Hiển thị số tiền vượt hoặc còn lại tùy trạng thái */}
                      <Text
                        style={[
                          styles.categoryRemaining,
                          { color: isOverBudget ? Colors.expense : SoftColors.text },
                        ]}
                      >
                        {isOverBudget
                          ? `Vượt ${formatCurrency(Math.abs(budget.remaining))}`
                          : `Còn lại ${formatCurrency(budget.remaining)}`}
                      </Text>
                    </View>
                  </View>

                  {/* Thanh tiến độ: clamp tối đa 100% width để không tràn track */}
                  <View style={styles.budgetTrack}>
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: `${Math.min(budget.pct, 100)}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    >
                      {/* Hiển thị ">100%" khi vượt để phân biệt với trường hợp đúng 100% */}
                      <Text style={styles.budgetFillText}>
                        {budget.pct > 100 ? '>100%' : `${Math.round(budget.pct)}%`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        router.push({
                          pathname: '/budget/edit',
                          params: { id: budget.id },
                        } as any)
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={16} color={SoftColors.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => confirmDelete(budget.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={16} color={SoftColors.muted} />
                    </TouchableOpacity>
                  </View>
                </SoftCard>
              );
            })
          )}
          {/* Padding cuối để nội dung không bị tab bar che */}
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: SoftColors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SoftColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  content: {
    paddingBottom: 110,
  },
  summaryCard: {
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(54, 216, 121, 0.6)',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: SoftColors.text,
    textAlign: 'center',
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: SoftColors.text,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryMetaLabel: {
    fontSize: 13,
    color: SoftColors.muted,
    marginBottom: 4,
  },
  summaryMetaValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressTrack: {
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(174, 213, 188, 0.22)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  budgetCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySpent: {
    fontSize: 13,
    color: SoftColors.muted,
  },
  bullet: {
    color: SoftColors.muted,
    fontSize: 12,
    marginHorizontal: 4,
  },
  daysLeftText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryBudget: {
    fontSize: 16,
    fontWeight: '900',
    color: SoftColors.text,
    marginBottom: 4,
  },
  categoryRemaining: {
    fontSize: 12,
    fontWeight: '700',
  },
  budgetTrack: {
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(174, 213, 188, 0.22)',
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    minWidth: 52,
  },
  budgetFillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  actionsRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    padding: 2,
  },
  emptyCard: {
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(54, 216, 121, 0.16)',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: SoftColors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: SoftColors.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  createButton: {
    alignSelf: 'stretch',
  },
});
