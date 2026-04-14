import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '@/store/app-store';
import { SoftColors, shadow } from '@/constants/design';
import { SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { formatCurrency } from '@/utils';
import { getWalletIconName } from '@/utils/iconography';

export default function WalletManageScreen() {
  const { wallets, getTotalBalance } = useStore();

  const totalBalance = getTotalBalance();

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.82} onPress={() => router.back()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={22} color={SoftColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý ví</Text>
          <TouchableOpacity activeOpacity={0.82} onPress={() => router.push('/wallet/add')} style={styles.headerIcon}>
            <Ionicons name="add" size={24} color={SoftColors.primaryDark} />
          </TouchableOpacity>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Tổng tài sản</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalBalance)}</Text>
          <Text style={styles.totalSub}>{wallets.length} ví hoạt động</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {wallets.map((wallet, index) => (
            <TouchableOpacity 
              key={wallet.id} 
              activeOpacity={0.82}
              onPress={() => router.push(`/wallet/${wallet.id}`)}
            >
              <SoftCard style={[styles.walletCard, index === wallets.length - 1 && styles.lastCard]}>
                <View style={[styles.walletIconWrap, { backgroundColor: `${wallet.color}22` }]}>
                  <Ionicons name={getWalletIconName(wallet.icon)} size={24} color={wallet.color} />
                </View>
                <View style={styles.walletBody}>
                  <Text style={styles.walletName} numberOfLines={1}>{wallet.name}</Text>
                  {!wallet.includeInTotal && (
                    <Text style={styles.excludedText}>Không tính vào tổng</Text>
                  )}
                </View>
                <View style={styles.walletRight}>
                  <Text style={styles.walletBalance}>{formatCurrency(wallet.balance)}</Text>

                </View>
              </SoftCard>
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            style={styles.addButton}
            activeOpacity={0.82}
            onPress={() => router.push('/wallet/add')}
          >
            <Ionicons name="add-circle-outline" size={24} color={SoftColors.primaryDark} />
            <Text style={styles.addButtonText}>Thêm ví mới</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
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
  totalCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 24,
    marginBottom: 20,
    ...shadow.card,
  },
  totalLabel: {
    fontSize: 14,
    color: SoftColors.muted,
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '900',
    color: SoftColors.text,
    marginBottom: 6,
  },
  totalSub: {
    fontSize: 13,
    color: SoftColors.primaryDark,
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  lastCard: {
    marginBottom: 16,
  },
  walletIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  walletBody: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 4,
  },
  excludedText: {
    fontSize: 12,
    color: SoftColors.muted,
  },
  walletRight: {
    alignItems: 'flex-end',
  },
  walletBalance: {
    fontSize: 15,
    fontWeight: '800',
    color: SoftColors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(54, 216, 121, 0.4)',
    borderStyle: 'dashed',
    gap: 10,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: SoftColors.primaryDark,
  },
});
