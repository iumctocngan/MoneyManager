import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/app-store';
import { Colors, SoftColors } from '@/constants/design';
import { DonutChart } from '@/components/ui/donut-chart';
import { formatCurrency } from '@/utils';
import { getCategoryIconName } from '@/utils/iconography';
import {
  buildDonutChartModel,
  generateFinancialReport,
} from '@/services/report.service';

type Tab = 'expense' | 'income';

export default function ReportScreen() {
  const { period = 'month' } = useLocalSearchParams<{ period: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('expense');
  const { transactions, getCategoryById } = useStore();

  const periodLabels = {
    today: 'Hôm nay',
    week: 'Tuần này',
    month: 'Tháng này',
    quarter: 'Quý này',
    year: 'Năm nay',
  };
  const periodLabel = periodLabels[period as keyof typeof periodLabels] || 'Tháng này';

  const { totalAmount, categoryBreakdown, top4Cats, othersAmount, realTotal } = useMemo(() => {
    return generateFinancialReport(transactions, period, activeTab);
  }, [transactions, period, activeTab]);

  const expenseColors = ['#FAD02C', Colors.expense, SoftColors.mint, SoftColors.purple];
  const incomeColors = [Colors.income, '#FFC08A', '#4EAFFF', '#C8A4FF'];
  const chartColors = activeTab === 'expense' ? expenseColors : incomeColors;
  const donutModel = useMemo(
    () => buildDonutChartModel(top4Cats, othersAmount, realTotal, chartColors),
    [top4Cats, othersAmount, realTotal, chartColors]
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={SoftColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{periodLabel}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'expense' && styles.tabButtonActive]}
            onPress={() => setActiveTab('expense')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActive]}>
              Chi tiền
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'income' && styles.tabButtonActive]}
            onPress={() => setActiveTab('income')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>
              Thu tiền
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng {activeTab === 'expense' ? 'chi' : 'thu'}</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
          </View>

          <View style={styles.chartArea}>
            <View style={styles.donutWrapper}>
              <DonutChart data={donutModel.data} size={110} strokeWidth={24} />
            </View>
            <View style={styles.legendWrapper}>
              {donutModel.legendItems.map((item) => {
                const cat = item.isOther ? null : getCategoryById(item.id);
                const percentage = item.percentage.toFixed(2).replace('.', ',');
                return (
                  <View style={styles.legendRow} key={item.id}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel} numberOfLines={1}>
                      {cat?.name || 'Các khoản còn lại'}
                    </Text>
                    <Text style={styles.legendPercent}>{percentage} %</Text>
                  </View>
                );
              })}
              {top4Cats.length === 0 && (
                <Text style={{ fontStyle: 'italic', color: SoftColors.muted }}>
                  Chưa có dữ liệu
                </Text>
              )}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.listContainer}>
            {categoryBreakdown.map((item, index) => {
              const cat = getCategoryById(item.id);
              const isTop4 = index < 4;
              const barColor = isTop4 ? chartColors[index % chartColors.length] : SoftColors.muted;
              const percentage = (item.amount / Math.max(totalAmount, 1)) * 100;

              return (
                <View key={item.id} style={styles.listItem}>
                  <View style={styles.listRowContent}>
                    <View
                      style={[
                        styles.listIcon,
                        { backgroundColor: cat?.color ? `${cat.color}20` : '#ccc' },
                      ]}
                    >
                      <Ionicons
                        name={getCategoryIconName(cat?.id)}
                        size={20}
                        color={cat?.color || '#999'}
                      />
                    </View>
                    <Text style={styles.listName}>{cat?.name || 'Các khoản còn lại'}</Text>
                    <Text style={styles.listRowPercent}>
                      ({percentage.toFixed(2).replace('.', ',')}%)
                    </Text>
                    <Text style={styles.listAmount}>{formatCurrency(item.amount)}</Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${percentage}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FDFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: SoftColors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#4EAFFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: SoftColors.muted,
  },
  tabTextActive: {
    color: SoftColors.text,
  },
  content: {
    paddingBottom: 40,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: SoftColors.muted,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: SoftColors.text,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  donutWrapper: {
    marginRight: 32,
  },
  legendWrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
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
  separator: {
    height: 6,
    backgroundColor: 'rgba(174, 213, 188, 0.1)',
  },
  listContainer: {
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 20,
  },
  listItem: {
    flexDirection: 'column',
  },
  listRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: SoftColors.text,
  },
  listRowPercent: {
    fontSize: 13,
    color: SoftColors.muted,
    marginRight: 8,
  },
  listAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(174, 213, 188, 0.25)',
    borderRadius: 3,
    marginLeft: 48,
    marginRight: 22,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
