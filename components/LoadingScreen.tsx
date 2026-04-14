import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SoftColors } from '@/constants/design';
import { SoftBackdrop } from '@/components/ui/soft';

export function LoadingScreen({ text = 'Đang tải...' }: { text?: string }) {
  return (
    <View style={styles.container}>
      <SoftBackdrop />
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
