import React, { useState } from 'react';
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
import { useStore } from '@/store/app-store';
import { useMutations } from '@/hooks/useMutations';
import { SoftColors } from '@/constants/design';
import { GlowButton, SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';
import { formatNumber } from '@/utils';
import { getWalletIconName } from '@/utils/iconography';

export default function TransferMoneyScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { wallets } = useStore();
  const { transferMoney } = useMutations();

  const [fromWalletId] = useState(from || wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets.filter(w => w.id !== fromWalletId)[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const fromWallet = wallets.find((w) => w.id === fromWalletId);


  const availableWalletsTo = wallets.filter(w => w.id !== fromWalletId);

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/[^0-9]/g, ''));
  };

  const handleTransfer = async () => {
    if (!amount || parseInt(amount, 10) === 0) {
      Alert.alert('Thiếu số tiền', 'Vui lòng nhập số tiền cần chuyển.');
      return;
    }

    if (!fromWalletId || !toWalletId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ví Nguồn và ví Đích.');
      return;
    }
    
    if (fromWalletId === toWalletId) {
      Alert.alert('Lỗi chọn ví', 'Ví nguồn và ví đích không được trùng nhau.');
      return;
    }

    const numericAmount = parseInt(amount, 10);
    
    if (fromWallet && numericAmount > fromWallet.balance) {
      Alert.alert('Số dư không đủ', 'Số tiền chuyển không được vượt quá số dư hiện tại của ví.');
      return;
    }

    try {
      await transferMoney(fromWalletId, toWalletId, numericAmount, note);
      Alert.alert('Thành công', 'Đã chuyển tiền.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert(
        'Không thể chuyển tiền',
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
              <Ionicons name="close" size={24} color={SoftColors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chuyển tiền</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.transferFlow}>
            <View style={styles.walletBox}>
              <Text style={styles.walletLabel}>Ví Nguồn</Text>
              <SoftCard style={styles.walletSelector}>
                <Ionicons name={getWalletIconName(fromWallet?.icon)} size={24} color={fromWallet?.color || SoftColors.text} />
                <View style={styles.walletInfo}>
                  <Text style={styles.walletName}>{fromWallet?.name || 'Chọn ví'}</Text>
                  <Text style={styles.walletBalance}>Số dư: {formatNumber(fromWallet?.balance || 0)} ₫</Text>
                </View>
              </SoftCard>
            </View>

            <View style={styles.flowArrow}>
              <Ionicons name="arrow-down-circle" size={32} color={SoftColors.primaryLight} />
            </View>

            <View style={styles.walletBox}>
              <Text style={styles.walletLabel}>Ví Đích</Text>
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletRow}>
                  {availableWalletsTo.map((wallet) => {
                    const isActive = toWalletId === wallet.id;
                    return (
                      <TouchableOpacity
                        key={wallet.id}
                        activeOpacity={0.82}
                        style={[styles.walletChip, isActive && { borderColor: wallet.color, backgroundColor: `${wallet.color}14` }]}
                        onPress={() => setToWalletId(wallet.id)}
                      >
                        <View style={[styles.walletChipIcon, { backgroundColor: `${wallet.color}22` }]}>
                          <Ionicons name={getWalletIconName(wallet.icon)} size={16} color={wallet.color} />
                        </View>
                        <Text style={styles.walletChipText}>{wallet.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>

          <SoftCard style={styles.amountCard}>
            <Text style={styles.amountLabel}>Số tiền chuyển</Text>
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

          <View style={styles.fieldBlock}>
            <Text style={styles.sectionTitle}>Ghi chú chuyển tiền</Text>
            <View style={softInputStyles.inputShell}>
              <View style={softInputStyles.inputIcon}>
                <Ionicons name="document-text-outline" size={18} color={SoftColors.muted} />
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Ví dụ: Chuyển tiền tiết kiệm tháng này"
                placeholderTextColor={SoftColors.muted}
                style={styles.input}
                selectionColor={SoftColors.primaryDark}
              />
            </View>
          </View>

          <GlowButton label="Thực hiện chuyển đổi" onPress={() => void handleTransfer()} style={styles.saveButton} />
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
    paddingBottom: 40,
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
  headerSpacer: {
    width: 42,
  },
  transferFlow: {
    marginBottom: 20,
  },
  walletBox: {
    marginBottom: 0,
  },
  walletLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  walletSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(54, 216, 121, 0.3)',
  },
  walletInfo: {
    marginLeft: 14,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '800',
    color: SoftColors.text,
  },
  walletBalance: {
    fontSize: 13,
    color: SoftColors.muted,
    marginTop: 2,
  },
  flowArrow: {
    alignItems: 'center',
    marginVertical: -10,
    zIndex: 10,
  },
  walletRow: {
    gap: 12,
    paddingVertical: 4,
  },
  walletChip: {
    minWidth: 140,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'rgba(174, 213, 188, 0.4)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  walletChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.text,
  },
  amountCard: {
    padding: 20,
    marginBottom: 20,
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
  fieldBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 10,
    marginLeft: 4,
  },
  input: {
    flex: 1,
    color: SoftColors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  saveButton: {
    marginBottom: 24,
  },
});
