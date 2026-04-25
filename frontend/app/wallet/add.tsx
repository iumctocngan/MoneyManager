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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMutations } from '@/hooks/useMutations';
import { WALLET_COLORS, WALLET_ICONS } from '@/constants';
import { SoftColors, shadow } from '@/constants/design';
import { GlowButton, SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';
import { formatNumber, generateId } from '@/utils';
import { getWalletIconName } from '@/utils/iconography';

export default function AddWalletScreen() {
  const { addWallet } = useMutations();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [selectedColor, setSelectedColor] = useState(WALLET_COLORS[0]);
  const [selectedIcon] = useState(WALLET_ICONS[0]);
  const [includeInTotal, setIncludeInTotal] = useState(true);

  const handleBalanceChange = (text: string) => {
    setBalance(text.replace(/[^0-9]/g, ''));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu tên ví', 'Vui lòng nhập tên ví.');
      return;
    }

    try {
      await addWallet({
        id: generateId(),
        name: name.trim(),
        balance: balance ? parseInt(balance, 10) : 0,
        color: selectedColor,
        icon: selectedIcon,
        includeInTotal,
        hasTransactions: false,
        createdAt: new Date().toISOString(),
      });
      router.back();
    } catch (error) {
      Alert.alert(
        'Không thể tạo ví',
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
            <Text style={styles.headerTitle}>Tạo ví mới</Text>
            <View style={styles.headerSpacer} />
          </View>

          <LinearGradient colors={[selectedColor, `${selectedColor}CC`]} style={styles.previewCard}>
            <View style={styles.previewTop}>
              <View style={styles.previewIconWrap}>
                <Ionicons name={getWalletIconName(selectedIcon)} size={24} color="#fff" />
              </View>
              <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={styles.previewName}>{name || 'Ví mới'}</Text>
            <Text style={styles.previewBalance}>
              {balance ? formatNumber(parseInt(balance, 10)) : '0'} ₫
            </Text>
          </LinearGradient>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Tên ví</Text>
            <View style={softInputStyles.inputShell}>
              <View style={softInputStyles.inputIcon}>
                <Ionicons name="wallet-outline" size={18} color={SoftColors.muted} />
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên ví"
                placeholderTextColor={SoftColors.muted}
                style={styles.input}
                selectionColor={SoftColors.primaryDark}
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Số dư ban đầu</Text>
            <View style={softInputStyles.inputShell}>
              <View style={softInputStyles.inputIcon}>
                <Ionicons name="cash-outline" size={18} color={SoftColors.muted} />
              </View>
              <TextInput
                value={balance ? formatNumber(parseInt(balance, 10)) : ''}
                onChangeText={handleBalanceChange}
                placeholder="0"
                placeholderTextColor={SoftColors.muted}
                keyboardType="numeric"
                style={styles.input}
                selectionColor={SoftColors.primaryDark}
              />
            </View>
          </View>



          <Text style={styles.sectionTitle}>Màu ví</Text>
          <SoftCard style={styles.colorCard}>
            <View style={styles.colorsRow}>
              {WALLET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  activeOpacity={0.82}
                  style={[styles.colorDot, { backgroundColor: color }, selectedColor === color && styles.colorDotSelected]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </TouchableOpacity>
              ))}
            </View>
          </SoftCard>

          <SoftCard style={styles.toggleCard}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Tính vào tổng số dư</Text>
              <Text style={styles.toggleText}>Ví này sẽ được cộng vào số dư hiển thị trên trang chủ.</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setIncludeInTotal((current) => !current)}
              style={[styles.toggle, includeInTotal && { backgroundColor: SoftColors.primary }]}
            >
              <View style={[styles.toggleThumb, includeInTotal && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </SoftCard>

          <GlowButton label="Lưu ví" onPress={() => void handleSave()} style={styles.saveButton} />
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
  previewCard: {
    borderRadius: 28,
    padding: 20,
    minHeight: 180,
    marginBottom: 20,
    ...shadow.glow,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  previewIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 10,
  },
  previewBalance: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: SoftColors.text,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    color: SoftColors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 10,
    marginTop: 4,
  },

  iconsCard: {
    padding: 16,
    marginBottom: 14,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(174, 213, 188, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCard: {
    padding: 16,
    marginBottom: 14,
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    ...shadow.card,
  },
  toggleCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 4,
  },
  toggleText: {
    fontSize: 13,
    lineHeight: 19,
    color: SoftColors.muted,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(174, 213, 188, 0.4)',
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    marginBottom: 24,
  },
});
