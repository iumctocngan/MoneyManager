import { 
  useAudioRecorder, 
  useAudioRecorderState, 
  RecordingPresets, 
  requestRecordingPermissionsAsync, 
  setAudioModeAsync 
} from 'expo-audio';
import { router, Stack } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/app-store';
import { api } from '@/utils/api';
import { Transaction } from '@/constants/types';
import { generateId } from '@/utils';
import { SoftColors, shadow } from '@/constants/design';
import { SoftBackdrop } from '@/components/ui/soft';
export default function AiVoiceScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecording = useAudioRecorderState(recorder).isRecording;
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedItems, setTranscribedItems] = useState<Partial<Transaction>[]>([]);
  
  const { 
    authToken: token, 
    getCategoryById, 
    addTransactionsBatch, 
    selectedWalletId, 
    wallets, 
    setSelectedWallet 
  } = useStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    // Cleanup recorder and audio mode on unmount
    return () => {
      const cleanup = async () => {
        try {
          if (recorder.uri) {
            await recorder.stop();
          }
          await setAudioModeAsync({ allowsRecording: false });
        } catch {}
      };
      void cleanup();
    };
  }, [recorder]);

  async function startRecording() {
    try {
      const response = await requestRecordingPermissionsAsync();
      if (!response.granted) {
        Alert.alert('Lỗi', 'Cần cấp quyền microphone để ghi âm');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm');
    }
  }

  async function stopRecording() {
    if (!isRecording) return;

    setIsProcessing(true);

    try {
      await recorder.stop();

      await setAudioModeAsync({
        allowsRecording: false,
      });

      const uri = recorder.uri;

      if (!uri) throw new Error('Không tìm thấy file ghi âm');

      // Upload and transcribe
      if (!token) throw new Error('Yêu cầu đăng nhập');
      
      const items = await api.uploadAudio(token, uri);
      setTranscribedItems((prev) => [...prev, ...items]);
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes('429')) {
        console.warn('Rate limit hit (429):', error.message);
        Alert.alert('Thông báo', 'Bạn đã hết lượt dùng thử hôm nay. Vui lòng quay lại sau!');
      } else {
        console.error('Transcription error:', error);
        Alert.alert('Lỗi', error.message || 'Không thể xử lý giọng nói');
      }
    } finally {
      setIsProcessing(false);
    }
  }

  async function saveTransactions() {
    if (!selectedWalletId) {
      Alert.alert('Lỗi', 'Vui lòng chọn ví trước khi lưu');
      return;
    }

    try {
      setIsProcessing(true);
      const transactionsToSave = transcribedItems.map((item) => ({
        id: generateId(),
        walletId: selectedWalletId,
        type: item.type as any,
        categoryId: item.categoryId as string,
        amount: item.amount || 0,
        date: item.date || new Date().toISOString(),
        note: item.note || '',
        createdAt: new Date().toISOString(),
      }) as Transaction);

      await addTransactionsBatch(transactionsToSave);
      Alert.alert('Thành công', 'Đã lưu các giao dịch hợp lệ!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể lưu giao dịch');
      setIsProcessing(false);
    }
  }

  function removeItem(index: number) {
    setTranscribedItems((prev) => prev.filter((_, i) => i !== index));
  }

  const renderItem = ({ item, index }: { item: Partial<Transaction>, index: number }) => {
    const category = getCategoryById(item.categoryId || '');
    const isExpense = item.type === 'expense';
    
    return (
      <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: category?.color || '#ccc' }]}>
          <Ionicons name={category?.icon as any || 'help-outline'} size={24} color="#fff" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{category?.name || 'Không rõ'}</Text>
          <Text style={styles.cardSubtitle}>{new Date(item.date || '').toLocaleDateString('vi-VN')}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: isExpense ? SoftColors.red : SoftColors.primary }]}>
            {isExpense ? '-' : '+'}{item.amount?.toLocaleString('vi-VN')} đ
          </Text>
          {item.note && <Text style={styles.cardNote}>{item.note}</Text>}
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
        <View style={styles.header}>
          <Text style={styles.title}>ỨNG DỤNG AI</Text>
          <Text style={styles.subtitle}>Ghi chép bằng giọng nói{'\n'}cực nhanh</Text>
        </View>

        <View style={styles.walletSection}>
          <Text style={styles.sectionLabel}>Chọn ví để ghi nhận:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.walletsScroll}
          >
            {wallets.map(wallet => {
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

        {transcribedItems.length > 0 && (
          <View style={styles.listContainer}>
            <TouchableOpacity style={styles.doneBanner} onPress={saveTransactions}>
              <Ionicons name="checkmark-circle" size={20} color={SoftColors.primary} />
              <Text style={styles.doneText}>Đã ghi xong ({transcribedItems.length} mục) - Lưu ngay</Text>
            </TouchableOpacity>
            <FlatList
              data={transcribedItems}
              keyExtractor={(_, i) => i.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            />
          </View>
        )}

        <View style={styles.bottomArea}>
          <Text style={styles.hintText}>
            {isProcessing ? 'Đang xử lý...' : isRecording ? 'Đang nghe...' : 'Hôm nay tôi...'}
          </Text>
          <Text style={styles.subHintText}>
            {isRecording ? 'Chạm để kết thúc' : 'Chạm để nói'}
          </Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity 
              style={[styles.recordButton, isRecording && styles.recordingActive]} 
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={SoftColors.primaryDark} size="large" />
              ) : isRecording ? (
                <Ionicons name="stop" size={40} color={SoftColors.red} />
              ) : (
                <Ionicons name="mic" size={40} color={SoftColors.primaryDark} />
              )}
            </TouchableOpacity>
          </Animated.View>
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
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 20,
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
    marginRight: 8, // space for close button
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#fff',
    ...shadow.soft,
  },
  hintText: {
    fontSize: 20,
    fontWeight: '800',
    color: SoftColors.text,
    marginBottom: 4,
  },
  subHintText: {
    fontSize: 14,
    color: SoftColors.muted,
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  recordingActive: {
    backgroundColor: '#FFE5E5',
    transform: [{ scale: 1.1 }],
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
});
