import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useStore } from '@/store/app-store';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants';
import { TransactionType } from '@/constants/types';
import { SoftColors } from '@/constants/design';
import { GlowButton, SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';
import { formatNumber, generateId } from '@/utils';
import { getCategoryIconName, getWalletIconName } from '@/utils/iconography';

export default function AddTransactionScreen() {
  const { wallets, addTransaction } = useStore();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(wallets[0]?.id || '');
  const [date] = useState(new Date());

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleAmountChange = (text: string) => {
    setAmount(text.replace(/[^0-9]/g, ''));
  };

  const handleSave = async () => {
    if (!amount || parseInt(amount, 10) === 0) {
      Alert.alert('Thiếu số tiền', 'Vui lòng nhập số tiền giao dịch.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Thiếu danh mục', 'Vui lòng chọn danh mục.');
      return;
    }

    if (!selectedWallet) {
      Alert.alert('Thiếu ví', 'Vui lòng chọn ví.');
      return;
    }

    try {
      await addTransaction({
        id: generateId(),
        type,
        amount: parseInt(amount, 10),
        categoryId: selectedCategory,
        walletId: selectedWallet,
        note,
        date: date.toISOString(),
        createdAt: new Date().toISOString(),
      });
      router.back();
    } catch (error) {
      Alert.alert(
        'Không thể tạo giao dịch',
        error instanceof Error ? error.message : 'Đã có lỗi xảy ra.'
      );
    }
  };

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity activeOpacity={0.82} onPress={() => router.back()} style={styles.headerIcon}>
                <Ionicons name="close" size={24} color={SoftColors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Thêm giao dịch</Text>
              <View style={styles.headerSpacer} />
            </View>

            <SoftCard style={styles.typeWrap}>
              {[
                { key: 'expense', label: 'Chi' },
                { key: 'income', label: 'Thu' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.82}
                  style={[styles.typeButton, type === item.key && styles.typeButtonActive]}
                  onPress={() => {
                    setType(item.key as TransactionType);
                    setSelectedCategory('');
                  }}
                >
                  <Text style={[styles.typeText, type === item.key && styles.typeTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </SoftCard>

            <SoftCard style={styles.amountCard}>
              <Text style={styles.amountLabel}>Nhập số tiền</Text>
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
              <Text style={styles.sectionTitle}>Ghi chú</Text>
              <View style={softInputStyles.inputShell}>
                <View style={softInputStyles.inputIcon}>
                  <Ionicons name="create-outline" size={18} color={SoftColors.muted} />
                </View>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Thêm ghi chú"
                  placeholderTextColor={SoftColors.muted}
                  style={styles.input}
                  selectionColor={SoftColors.primaryDark}
                />
              </View>
            </View>

            <SoftCard style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color={SoftColors.muted} />
                <Text style={styles.infoText}>
                  {date.toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </SoftCard>

            <Text style={styles.sectionTitle}>Chọn ví</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletRow}>
              {wallets.map((wallet) => {
                const isActive = selectedWallet === wallet.id;
                return (
                  <TouchableOpacity
                    key={wallet.id}
                    activeOpacity={0.82}
                    style={[styles.walletChip, isActive && { borderColor: wallet.color, backgroundColor: `${wallet.color}14` }]}
                    onPress={() => setSelectedWallet(wallet.id)}
                  >
                    <View style={[styles.walletChipIcon, { backgroundColor: `${wallet.color}22` }]}>
                      <Ionicons name={getWalletIconName(wallet.icon)} size={16} color={wallet.color} />
                    </View>
                    <View>
                      <Text style={styles.walletChipText}>{wallet.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Danh mục</Text>
            <View style={styles.grid}>
              {categories.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    activeOpacity={0.82}
                    style={[styles.categoryItem, isActive && { backgroundColor: `${category.color}18`, borderColor: category.color }]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: `${category.color}22` }]}>
                      <Ionicons name={getCategoryIconName(category.id)} size={20} color={category.color} />
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <GlowButton label="Lưu giao dịch" onPress={() => void handleSave()} style={styles.saveButton} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <View style={styles.floatingActionGroup}>
        <TouchableOpacity 
          style={styles.fabActionButton} 
          activeOpacity={0.85}
          onPress={() => router.push('/ai-voice')}
        >
          <Ionicons name="mic" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.fabActionButton} 
          activeOpacity={0.85}
        >
          <Ionicons name="scan" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
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
  typeWrap: {
    flexDirection: 'row',
    padding: 6,
    marginBottom: 18,
  },
  typeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: SoftColors.primary,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.muted,
  },
  typeTextActive: {
    color: '#fff',
  },
  amountCard: {
    padding: 20,
    marginBottom: 16,
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
  conversionHint: {
    fontSize: 12,
    color: SoftColors.muted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  amountInput: {
    flex: 1,
    fontSize: 38,
    fontWeight: '900',
    color: SoftColors.text,
    paddingVertical: 0,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    color: SoftColors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  infoCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: SoftColors.text,
    flex: 1,
  },
  walletRow: {
    gap: 12,
    paddingBottom: 14,
  },
  walletChip: {
    minWidth: 150,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(174, 213, 188, 0.28)',
    backgroundColor: 'rgba(255,255,255,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  walletChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.text,
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
  floatingActionGroup: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    alignItems: 'center',
    gap: 12,
  },
  fabActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4EAFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4EAFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
