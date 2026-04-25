import React, { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useMutations } from '@/hooks/useMutations';
import { useStore } from '@/store/app-store';
import { EXPENSE_CATEGORIES } from '@/constants';
import { SoftColors } from '@/constants/design';
import { GlowButton, SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { formatNumber } from '@/utils';
import { getCategoryIconName } from '@/utils/iconography';

type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

export default function EditBudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { budgets } = useStore();
  const { updateBudget } = useMutations();

  const budget = budgets.find((item) => item.id === id);
  const [amount, setAmount] = useState(budget ? String(budget.amount) : '');
  const [selectedCategory, setSelectedCategory] = useState(budget?.categoryId || '');
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period || 'monthly');

  useEffect(() => {
    if (!budget) {
      Alert.alert('Lỗi', 'Không tìm thấy ngân sách', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [budget]);

  if (!budget) {
    return null;
  }

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/[^0-9]/g, ''));
  };

  const getDateRange = () => {
    const now = new Date();

    if (period === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start, end };
    }

    if (period === 'weekly') {
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { start, end };
  };

  const handleSave = async () => {
    if (!amount || parseInt(amount, 10) === 0) {
      Alert.alert('Thiếu số tiền', 'Vui lòng nhập số tiền ngân sách.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Thiếu danh mục', 'Vui lòng chọn danh mục cần theo dõi.');
      return;
    }

    const { start, end } = getDateRange();

    try {
      await updateBudget(id, {
        categoryId: selectedCategory,
        amount: parseInt(amount, 10),
        period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      router.back();
    } catch (error) {
      Alert.alert(
        'Không thể cập nhật ngân sách',
        error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
      );
    }
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
            <Text style={styles.headerTitle}>Sửa ngân sách</Text>
            <View style={styles.headerSpacer} />
          </View>

          <SoftCard style={styles.amountCard}>
            <Text style={styles.amountLabel}>Số tiền ngân sách</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>₫</Text>
              <TextInput
                value={amount ? formatNumber(parseInt(amount, 10)) : ''}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={SoftColors.muted}
                style={styles.amountInput}
                selectionColor={SoftColors.primaryDark}
              />
            </View>
          </SoftCard>

          <Text style={styles.sectionTitle}>Chu kỳ</Text>
          <SoftCard style={styles.periodWrap}>
            {[
              { key: 'monthly', label: 'Tháng' },
              { key: 'weekly', label: 'Tuần' },
              { key: 'yearly', label: 'Năm' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.82}
                style={[styles.periodButton, period === item.key && styles.periodButtonActive]}
                onPress={() => setPeriod(item.key as BudgetPeriod)}
              >
                <Text style={[styles.periodText, period === item.key && styles.periodTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </SoftCard>

          <Text style={styles.sectionTitle}>Danh mục chi tiêu</Text>
          <View style={styles.grid}>
            {EXPENSE_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  activeOpacity={0.82}
                  style={[
                    styles.categoryItem,
                    isActive && {
                      backgroundColor: `${category.color}18`,
                      borderColor: category.color,
                    },
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${category.color}22` },
                      isActive && { backgroundColor: `${category.color}28` },
                    ]}
                  >
                    <Ionicons name={getCategoryIconName(category.id)} size={20} color={category.color} />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <GlowButton label="Cập nhật ngân sách" onPress={() => void handleSave()} style={styles.saveButton} />
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
    paddingBottom: 36,
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
  headerSpacer: {
    width: 42,
  },
  amountCard: {
    padding: 20,
    marginBottom: 18,
  },
  amountLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: SoftColors.text,
    marginBottom: 14,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currency: {
    fontSize: 20,
    fontWeight: '800',
    color: SoftColors.primaryDark,
  },
  amountInput: {
    flex: 1,
    fontSize: 38,
    fontWeight: '900',
    color: SoftColors.text,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 10,
  },
  periodWrap: {
    flexDirection: 'row',
    padding: 6,
    marginBottom: 18,
  },
  periodButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: SoftColors.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.muted,
  },
  periodTextActive: {
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  categoryItem: {
    width: '30.8%',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(174, 213, 188, 0.26)',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: SoftColors.text,
    textAlign: 'center',
  },
  saveButton: {
    marginBottom: 18,
  },
});
