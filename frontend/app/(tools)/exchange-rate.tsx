import { SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { SoftColors, shadow } from '@/constants/design';
import { calculateVndEquivalent, fetchExchangeRates } from '@/services/exchange.service';
import { formatCurrency } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TARGET_CURRENCIES = [
  { code: 'USD', name: 'Đô la Mỹ', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'JPY', name: 'Yên Nhật', flag: '🇯🇵' },
  { code: 'CNY', name: 'Nhân dân tệ', flag: '🇨🇳' },
  { code: 'KRW', name: 'Won Hàn Quốc', flag: '🇰🇷' },
  { code: 'GBP', name: 'Bảng Anh', flag: '🇬🇧' },
  { code: 'SGD', name: 'Đô la Singapore', flag: '🇸🇬' },
  { code: 'THB', name: 'Baht Thái', flag: '🇹🇭' },
];

export default function ExchangeRateScreen() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const loadRates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchExchangeRates();
      setRates(data.rates);
      setLastUpdate(data.lastUpdate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRates();
  }, []);

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.82} onPress={() => router.back()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={22} color={SoftColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tỷ giá (VND)</Text>
          <TouchableOpacity activeOpacity={0.82} onPress={() => void loadRates()} style={styles.headerIcon}>
            <Ionicons name="refresh" size={22} color={SoftColors.primaryDark} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={SoftColors.primary} />
              <Text style={styles.loadingText}>Đang lấy dữ liệu thời gian thực...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Ionicons name="alert-circle-outline" size={48} color="#FF6B78" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void loadRates()}>
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={14} color={SoftColors.muted} />
                <Text style={styles.updateTime}>Cập nhật lúc: {lastUpdate}</Text>
              </View>

              <SoftCard style={styles.listCard}>
                {TARGET_CURRENCIES.map((item, index) => {
                  const vndValue = calculateVndEquivalent(item.code, rates);
                  const isLast = index === TARGET_CURRENCIES.length - 1;

                  return (
                    <View key={item.code} style={[styles.rateRow, isLast && styles.rateRowLast]}>
                      <View style={styles.rateLeft}>
                        <Text style={styles.flag}>{item.flag}</Text>
                        <View>
                          <Text style={styles.currencyCode}>{item.code}</Text>
                          <Text style={styles.currencyName}>{item.name}</Text>
                        </View>
                      </View>
                      <View style={styles.rateRight}>
                        <Text style={styles.vndValue}>{formatCurrency(vndValue)}</Text>
                        <Text style={styles.baseLabel}>1 {item.code}</Text>
                      </View>
                    </View>
                  );
                })}
              </SoftCard>
            </>
          )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: 10,
    marginBottom: 10,
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
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  centerBox: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: SoftColors.muted,
    fontSize: 14,
  },
  errorText: {
    marginTop: 16,
    color: SoftColors.text,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: SoftColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    ...shadow.glow,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },
  updateTime: {
    fontSize: 12,
    color: SoftColors.muted,
  },
  listCard: {
    paddingHorizontal: 16,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(174, 213, 188, 0.24)',
  },
  rateRowLast: {
    borderBottomWidth: 0,
  },
  rateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 28,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
  },
  currencyName: {
    fontSize: 12,
    color: SoftColors.muted,
    marginTop: 2,
  },
  rateRight: {
    alignItems: 'flex-end',
  },
  vndValue: {
    fontSize: 16,
    fontWeight: '900',
    color: SoftColors.primaryDark,
  },
  baseLabel: {
    fontSize: 11,
    color: SoftColors.muted,
    marginTop: 2,
  },
});