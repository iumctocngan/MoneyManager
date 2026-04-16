import { SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { shadow, SoftColors } from '@/constants/design';
import { Transaction } from '@/constants/types';
import { useStore } from '@/store/app-store';
import { generateId } from '@/utils';
import { api } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// FIX: Thay boolean isProcessing bằng step enum để UI hiển thị đúng trạng thái
type ProcessStep = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

const STEP_LABELS: Record<ProcessStep, string> = {
  idle: '',
  uploading: 'Đang tải ảnh lên...',
  analyzing: 'Đang nhận diện hóa đơn...',
  done: 'Hoàn tất',
  error: 'Mạng yếu hoặc có lỗi',
};

export default function ScanReceiptScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // FIX: Tách isProcessing thành step cụ thể
  const [step, setStep] = useState<ProcessStep>('idle');
  // FIX: Lưu lastUri để có thể retry mà không cần chọn lại ảnh
  const [lastUri, setLastUri] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<Partial<Transaction>[]>([]);

  const {
    authToken: token,
    getCategoryById,
    addTransactionsBatch,
    selectedWalletId,
    wallets,
    setSelectedWallet,
  } = useStore();

  const isProcessing = step === 'uploading' || step === 'analyzing';

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh để thực hiện');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Lỗi chọn ảnh:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  }

  async function takePhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền camera để thực hiện');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Lỗi chụp ảnh:', err);
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
  }

  async function processImage(uri: string) {
    setSelectedImage(uri);
    setLastUri(uri); // FIX: Lưu lại để retry
    await doProcess(uri);
  }

  // FIX: Tách logic xử lý ra hàm riêng để retry có thể gọi lại
  async function doProcess(uri: string) {
    setStep('uploading');

    try {
      if (!token) throw new Error('Yêu cầu đăng nhập');

      setStep('analyzing');
      const items = await api.uploadReceipt(token, uri);

      // FIX: Không clear items cũ khi lỗi — append vào list hiện tại
      setScannedItems((prev) => [...prev, ...items]);
      setStep('done');
    } catch (error: any) {
      // FIX: Không clear scannedItems khi lỗi — giữ kết quả scan trước đó
      setStep('error');

      if (error.status === 429 || error.message?.includes('429')) {
        Alert.alert('Thông báo', 'Bạn đã hết lượt dùng thử hôm nay. Vui lòng quay lại sau!');
      }
      // FIX: Không Alert cho lỗi khác — hiển thị inline với nút Thử lại thay vì popup
      console.error('Lỗi quét hóa đơn:', error);
    }
  }

  // FIX: Hàm retry — dùng lastUri đã lưu, không cần chọn lại ảnh
  async function retryProcess() {
    if (!lastUri) return;
    await doProcess(lastUri);
  }

  async function saveTransactions() {
    if (!selectedWalletId) {
      Alert.alert('Lỗi', 'Vui lòng chọn ví trước khi lưu');
      return;
    }

    try {
      setStep('uploading'); // tái dùng để disable các nút
      const transactionsToSave: Transaction[] = scannedItems.map((item) => ({
        id: generateId(),
        walletId: selectedWalletId,
        type: (item.type || 'expense') as any,
        categoryId: item.categoryId as string,
        amount: item.amount || 0,
        date: item.date || new Date().toISOString(),
        note: item.note || '',
        createdAt: new Date().toISOString(),
      }));

      await addTransactionsBatch(transactionsToSave);
      Alert.alert('Thành công', 'Đã lưu giao dịch từ hóa đơn!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể lưu giao dịch');
      setStep('idle');
    }
  }

  function removeItem(index: number) {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
    // FIX: Chỉ reset ảnh khi xóa hết toàn bộ items
    if (scannedItems.length <= 1) {
      setSelectedImage(null);
      setStep('idle');
    }
  }

  function handleReset() {
    setSelectedImage(null);
    setScannedItems([]);
    setLastUri(null);
    setStep('idle');
  }

  const renderItem = ({ item, index }: { item: Partial<Transaction>; index: number }) => {
    const category = getCategoryById(item.categoryId || '');
    const isExpense = item.type === 'expense';

    return (
      <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: category?.color || '#ccc' }]}>
          <Ionicons name={(category?.icon as any) || 'help-outline'} size={24} color="#fff" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{category?.name || 'Không rõ'}</Text>
          <Text style={styles.cardSubtitle}>
            {new Date(item.date || '').toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: isExpense ? SoftColors.red : SoftColors.primary }]}>
            {isExpense ? '-' : '+'}
            {item.amount?.toLocaleString('vi-VN')} đ
          </Text>
          {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
          <Ionicons name="close-circle" size={24} color={SoftColors.muted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTintColor: SoftColors.text,
          headerTitle: '',
          headerBackVisible: false,
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>QUÉT HÓA ĐƠN</Text>
          <Text style={styles.subtitle}>Tự động nhập liệu{'\n'}từ ảnh chụp</Text>
        </View>

        {/* Chọn ví */}
        <View style={styles.walletSection}>
          <Text style={styles.sectionLabel}>Chọn ví để ghi nhận:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walletsScroll}
          >
            {wallets.map((wallet) => {
              const isActive = wallet.id === selectedWalletId;
              return (
                <TouchableOpacity
                  key={wallet.id}
                  style={[styles.walletItem, isActive && styles.walletItemActive]}
                  onPress={() => setSelectedWallet(wallet.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="wallet"
                    size={20}
                    color={isActive ? '#fff' : SoftColors.primaryDark}
                  />
                  <Text style={[styles.walletName, isActive && styles.walletTextActive]}>
                    {wallet.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Ảnh và Kết quả */}
        <View style={styles.mainContainer}>
          {selectedImage ? (
            <SoftCard style={styles.imagePreviewWrapper}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
                contentFit="contain"
              />
              {/* FIX: Overlay phân biệt rõ đang xử lý vs lỗi */}
              {(isProcessing || step === 'error') && (
                <View style={styles.loadingOverlay}>
                  {step === 'error' ? (
                    // FIX: Hiển thị inline error + nút Thử lại thay vì Alert
                    <>
                      <Ionicons name="wifi-outline" size={40} color="#fff" />
                      <Text style={styles.loadingText}>{STEP_LABELS.error}</Text>
                      <TouchableOpacity style={styles.retryBtn} onPress={retryProcess}>
                        <Ionicons name="refresh" size={16} color={SoftColors.primary} />
                        <Text style={styles.retryText}>Thử lại</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // FIX: Hiển thị step label cụ thể thay vì "Đang nhận diện..." chung chung
                    <>
                      <ActivityIndicator color="#fff" size="large" />
                      <Text style={styles.loadingText}>{STEP_LABELS[step]}</Text>
                    </>
                  )}
                </View>
              )}
            </SoftCard>
          ) : (
            <View style={styles.emptyPlaceholder}>
              <Ionicons name="receipt-outline" size={80} color={SoftColors.muted} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyText}>Chưa có ảnh nào được chọn</Text>
            </View>
          )}

          {scannedItems.length > 0 && (
            <View style={styles.listContainer}>
              <TouchableOpacity style={styles.doneBanner} onPress={saveTransactions} disabled={isProcessing}>
                <Ionicons name="checkmark-circle" size={20} color={SoftColors.primary} />
                <Text style={styles.doneText}>
                  Đã nhận diện ({scannedItems.length} mục) — Lưu ngay
                </Text>
              </TouchableOpacity>
              <FlatList
                data={scannedItems}
                keyExtractor={(_, i) => i.toString()}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </View>

        {/* Điều khiển dưới cùng */}
        <View style={styles.bottomArea}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={pickImage} disabled={isProcessing}>
              <View style={[styles.btnIcon, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="images" size={24} color="#039BE5" />
              </View>
              <Text style={styles.btnLabel}>Chọn ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnMain]} onPress={takePhoto} disabled={isProcessing}>
              <View style={styles.mainIconCircle}>
                <Ionicons name="camera" size={32} color="#fff" />
              </View>
              <Text style={styles.btnLabel}>Chụp ảnh</Text>
            </TouchableOpacity>

            {/* FIX: Nút Làm mới gọi handleReset thay vì inline lambda để dễ track */}
            <TouchableOpacity style={styles.actionBtn} onPress={handleReset} disabled={isProcessing}>
              <View style={[styles.btnIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="refresh" size={24} color="#FB8C00" />
              </View>
              <Text style={styles.btnLabel}>Làm mới</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SoftColors.pageBase,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: SoftColors.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: SoftColors.muted,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.9,
  },
  walletSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.muted,
    marginBottom: 10,
    marginLeft: 4,
  },
  walletsScroll: {
    paddingHorizontal: 4,
    gap: 10,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    ...shadow.soft,
    gap: 8,
  },
  walletItemActive: {
    backgroundColor: SoftColors.primary,
  },
  walletName: {
    fontSize: 14,
    fontWeight: '600',
    color: SoftColors.text,
  },
  walletTextActive: {
    color: '#fff',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  imagePreviewWrapper: {
    height: 200,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  imagePreview: {
    flex: 1,
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  // FIX: Style cho nút Thử lại trong overlay
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  retryText: {
    color: SoftColors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  emptyText: {
    marginTop: 10,
    color: SoftColors.muted,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
    ...shadow.soft,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
    color: SoftColors.primary,
    marginLeft: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadow.card,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SoftColors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: SoftColors.muted,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardNote: {
    fontSize: 12,
    color: SoftColors.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  bottomArea: {
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...shadow.soft,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  actionBtnMain: {
    marginBottom: 5,
  },
  btnIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  mainIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: SoftColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SoftColors.text,
  },
});