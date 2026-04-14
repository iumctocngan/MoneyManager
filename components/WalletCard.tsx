import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '@/utils';
import { Wallet } from '@/constants/types';

interface Props {
  wallet: Wallet;
  onPress: () => void;
  showBalance?: boolean;
}

export default function WalletCard({ wallet, onPress, showBalance = true }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrapper}>
      <LinearGradient
        colors={[wallet.color, wallet.color + 'AA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.top}>
          <Text style={styles.icon}>{wallet.icon}</Text>

        </View>
        <Text style={styles.name} numberOfLines={1}>{wallet.name}</Text>
        <Text style={styles.balance}>
          {showBalance ? formatCurrency(wallet.balance) : '••••••••'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    minWidth: 170,
    minHeight: 100,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  icon: { fontSize: 28 },
  chip: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  name: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 4 },
  balance: { color: '#fff', fontSize: 18, fontWeight: '800' },
});

