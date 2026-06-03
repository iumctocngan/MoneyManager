import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/app-store';
import { useMutations } from '@/hooks/useMutations';
import { Colors, SoftColors, shadow } from '@/constants/design';
import { SoftCard, SoftBackdrop } from '@/components/ui/soft';
import { formatCurrency, formatDate } from '@/utils';
import { getCategoryIconName } from '@/utils/iconography';
import { SoftAlert } from '@/components/ui/SoftAlert';
import { TransactionItem } from '@/components/TransactionItem';

/**
 * Màn hình Chi tiết Ngân sách (Budget Detail Screen)
 * 
 * Chức năng:
 * - Hiển thị chi tiết một ngân sách (dựa vào `id` truyền qua URL parameters).
 * - Tính toán số tiền đã chi, số tiền còn lại và tỷ lệ phần trăm tiến độ.
 * - Hiển thị cảnh báo nếu ngân sách sắp hết hoặc đã vượt mức.
 * - Liệt kê tất cả các giao dịch phát sinh thuộc danh mục của ngân sách này trong khung thời gian quy định.
 */
export default function BudgetDetailScreen() {
  // Lấy id ngân sách từ route parameters
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // Lấy dữ liệu global từ Zustand store
  const { budgets, transactions, wallets, getCategoryById } = useStore();
  const { deleteBudget } = useMutations();

  // Tìm ngân sách hiện tại dựa vào id
  const budget = budgets.find((b) => b.id === id);

  // Lấy thông tin danh mục tương ứng với ngân sách
  const category = getCategoryById(budget?.categoryId || '');
  const iconName = getCategoryIconName(category?.id);

  //=============================================================================
  // TÍNH TOÁN TIẾN ĐỘ VÀ LỌC GIAO DỊCH (Được cache bằng useMemo để tối ưu hiệu năng)
  //=============================================================================
  const { spent, remaining, pct, daysLeft, isOverBudget, matchingTransactions } = useMemo(() => {
    // Nếu ngân sách không tồn tại, trả về giá trị mặc định để tránh lỗi crash
    if (!budget) {
      return { spent: 0, remaining: 0, pct: 0, daysLeft: 0, isOverBudget: false, matchingTransactions: [] };
    }

    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate);

    // 1. Lọc ra các giao dịch khớp với điều kiện của ngân sách:
    // - Khớp categoryId
    // - Là khoản chi (expense)
    // - Nằm trong khoảng thời gian (startDate -> endDate)
    const matching = transactions.filter(
      (tx) =>
        tx.categoryId === budget.categoryId &&
        tx.type === 'expense' &&
        new Date(tx.date) >= start &&
        new Date(tx.date) <= end
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sắp xếp: Giao dịch mới nhất lên đầu

    // 2. Tính tổng số tiền đã chi
    const spentAmt = matching.reduce((sum, tx) => sum + tx.amount, 0);
    
    // 3. Tính số tiền còn lại và tỷ lệ % đã chi
    const remainingAmt = budget.amount - spentAmt;
    const pctVal = budget.amount > 0 ? (spentAmt / budget.amount) * 100 : 0;

    // 4. Tính số ngày còn lại của ngân sách
    const now = new Date();
    // Chuẩn hóa mốc thời gian về đầu ngày (00:00:00) để tính số ngày chính xác, bỏ qua giờ phút giây
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffTime = endDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Nếu diffDays < 0 nghĩa là đã quá hạn, gán thành -1 để dễ xử lý logic hiển thị
    const dLeft = diffDays < 0 ? -1 : diffDays;

    return {
      spent: spentAmt,
      remaining: remainingAmt,
      pct: pctVal,
      daysLeft: dLeft,
      isOverBudget: spentAmt > budget.amount, // Trạng thái vượt ngân sách
      matchingTransactions: matching,         // Danh sách giao dịch
    };
  }, [budget, transactions]);

  // Xác định màu sắc của thanh tiến độ dựa trên mức độ chi tiêu
  // - Đỏ: Đã vượt quá ngân sách
  // - Cam (Warning): Đã tiêu hơn 80% ngân sách
  // - Xanh (Primary): Còn an toàn
  const barColor = isOverBudget
    ? Colors.expense
    : pct > 80
    ? Colors.warning
    : SoftColors.primary;

  //=============================================================================
  // XỬ LÝ SỰ KIỆN: XOÁ NGÂN SÁCH
  //=============================================================================
  
  // Hàm thực thi lệnh xóa gọi xuống API/Store
  const handleDelete = async () => {
    if (!budget) return;
    try {
      await deleteBudget(budget.id);
      router.back(); // Quay về màn hình trước đó sau khi xóa thành công
    } catch (error) {
      SoftAlert.alert(
        'Không thể xoá ngân sách',
        error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
      );
    }
  };

  // Hàm hiển thị hộp thoại xác nhận trước khi xóa thật
  const confirmDelete = () => {
    SoftAlert.alert('Xoá ngân sách', 'Bạn có chắc muốn xoá ngân sách này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: handleDelete },
    ]);
  };

  // Xử lý màn hình lỗi (Fallback) nếu ngân sách bị xóa trong lúc đang xem hoặc id không hợp lệ
  if (!budget) {
    return (
      <View style={styles.root}>
        <SoftBackdrop />
        <SafeAreaView style={styles.container}>
          {/* Header Báo Lỗi */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
              <Ionicons name="arrow-back" size={24} color={SoftColors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lỗi</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={{ textAlign: 'center', marginTop: 50, color: SoftColors.text }}>
            Ngân sách không tồn tại hoặc đã bị xóa.
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  //=============================================================================
  // GIAO DIỆN CHÍNH
  //=============================================================================
  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.82} onPress={() => router.back()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color={SoftColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết ngân sách</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push({ pathname: '/budget/edit', params: { id: budget.id } } as any)}
              style={styles.headerIcon}
            >
              <Ionicons name="pencil-outline" size={22} color={SoftColors.text} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} onPress={confirmDelete} style={styles.headerIcon}>
              <Ionicons name="trash-outline" size={22} color={SoftColors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Hero Section */}
          <SoftCard style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={[styles.heroIconBg, { backgroundColor: `${category?.color || SoftColors.primary}22` }]}>
                <Ionicons name={iconName} size={32} color={category?.color || SoftColors.primaryDark} />
              </View>
              <Text style={styles.heroCategoryName}>{category?.name || 'Khác'}</Text>
              <Text style={styles.heroDateRange}>
                {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Tổng ngân sách</Text>
                <Text style={styles.statValue}>{formatCurrency(budget.amount)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Đã chi</Text>
                <Text style={[styles.statValue, { color: isOverBudget ? Colors.expense : SoftColors.text }]}>
                  {formatCurrency(spent)}
                </Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {isOverBudget ? 'Vượt quá' : 'Còn lại'}:{' '}
                  <Text style={{ color: isOverBudget ? Colors.expense : SoftColors.text }}>
                    {formatCurrency(Math.abs(remaining))}
                  </Text>
                </Text>
                <Text style={styles.progressLabel}>
                  {daysLeft > 0 ? `Còn ${daysLeft} ngày` : daysLeft === 0 ? 'Hết hạn hôm nay' : 'Đã kết thúc'}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                >
                  <Text style={styles.progressText}>{pct > 100 ? '>100%' : `${Math.round(pct)}%`}</Text>
                </View>
              </View>
            </View>
          </SoftCard>

          {/* Cảnh báo / Insight */}
          {isOverBudget && (
            <SoftCard style={[styles.insightCard, { borderColor: Colors.expense }]}>
              <Ionicons name="alert-circle" size={28} color={Colors.expense} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightTitle, { color: Colors.expense }]}>Tiêu quá tay rồi!</Text>
                <Text style={styles.insightText}>
                  Bạn đã vượt ngân sách {formatCurrency(Math.abs(remaining))}. Hãy điều chỉnh lại chi tiêu nhé.
                </Text>
              </View>
            </SoftCard>
          )}

          {!isOverBudget && pct > 80 && (
            <SoftCard style={[styles.insightCard, { borderColor: Colors.warning }]}>
              <Ionicons name="warning" size={28} color={Colors.warning} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightTitle, { color: Colors.warning }]}>Sắp hết ngân sách!</Text>
                <Text style={styles.insightText}>
                  Bạn đã dùng hết {Math.round(pct)}% ngân sách, hãy chi tiêu cẩn thận trong {daysLeft} ngày tới.
                </Text>
              </View>
            </SoftCard>
          )}

          {/* Danh sách giao dịch */}
          <Text style={styles.sectionTitle}>Các khoản đã chi ({matchingTransactions.length})</Text>
          {matchingTransactions.length === 0 ? (
            <SoftCard style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={32} color={SoftColors.muted} />
              <Text style={styles.emptyText}>Chưa có khoản chi nào trong ngân sách này.</Text>
            </SoftCard>
          ) : (
            <View style={styles.transactionsList}>
              {matchingTransactions.map((tx) => {
                const cat = getCategoryById(tx.categoryId);
                const wal = wallets.find(w => w.id === tx.walletId);
                return (
                  <TransactionItem 
                    key={tx.id} 
                    transaction={tx} 
                    category={cat}
                    wallet={wal}
                    onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } } as any)}
                  />
                );
              })}
            </View>
          )}
          
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SoftColors.pageBase },
  container: { flex: 1, paddingHorizontal: 18 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: SoftColors.text },
  content: { paddingBottom: 40 },
  heroCard: {
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroCategoryName: {
    fontSize: 22,
    fontWeight: '900',
    color: SoftColors.text,
    marginBottom: 4,
  },
  heroDateRange: {
    fontSize: 14,
    color: SoftColors.muted,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 12,
    borderRadius: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: SoftColors.muted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: SoftColors.text,
  },
  progressContainer: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SoftColors.muted,
  },
  progressTrack: {
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(174, 213, 188, 0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    minWidth: 50,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: SoftColors.text,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  transactionsList: {
    gap: 10,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: SoftColors.muted,
    textAlign: 'center',
  },
});
