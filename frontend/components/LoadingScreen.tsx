import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SoftColors } from '@/constants/design';
import { SoftBackdrop } from '@/components/ui/soft';

/**
 * Màn hình loading toàn trang — hiển thị trong khi app khởi tạo hoặc chờ dữ liệu.
 * Prop `text` cho phép tuỳ chỉnh thông điệp mà không cần tạo component mới.
 */
export function LoadingScreen({ text = 'Đang tải...' }: { text?: string }) {
  return (
    <View style={styles.container}>
      {/* Dùng SoftBackdrop để giữ nền gradient nhất quán với toàn bộ design system */}
      <SoftBackdrop />
      {/* Màu spinner lấy từ design token để đồng bộ với theme */}
      <ActivityIndicator size="large" color={SoftColors.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SoftColors.pageBase,
    gap: 14,
  },
  text: {
    fontSize: 14,
    color: SoftColors.muted,
    fontWeight: '500',
  },
});
