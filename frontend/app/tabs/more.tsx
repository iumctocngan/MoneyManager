import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useStore } from '@/store/app-store';
import { Colors, SoftColors, shadow } from '@/constants/design';
import { GlowButton, SectionHeading, SoftBackdrop, SoftCard } from '@/components/ui/soft';
import { formatCurrency } from '@/utils';


export default function MoreScreen() {
  const {
    wallets,
    transactions,
    user,
    signOut,
    getTotalBalance,
    setAiAssistantEnabled,
  } = useStore();

  const totalBalance = getTotalBalance();


  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi thiết bị này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <SoftBackdrop />
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <LinearGradient colors={[SoftColors.primary, '#5AE29A']} style={styles.hero}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={34} color={SoftColors.primaryDark} />
              </View>
              <View style={styles.statusDot} />
            </View>
            <Text style={styles.userName}>{user?.name || 'Người dùng'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'Chưa có email'}</Text>
            <GlowButton label="Chỉnh sửa hồ sơ" icon="create-outline" style={styles.editButton} />
          </LinearGradient>

          <View style={styles.statsRow}>
            <SoftCard style={styles.statCard}>
              <Text style={styles.statValue}>{wallets.length}</Text>
              <Text style={styles.statLabel}>Ví</Text>
            </SoftCard>
            <SoftCard style={styles.statCard}>
              <Text style={styles.statValue}>{transactions.length}</Text>
              <Text style={styles.statLabel}>Giao dịch</Text>
            </SoftCard>
            <SoftCard style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(totalBalance)}</Text>
              <Text style={styles.statLabel}>Tổng số dư</Text>
            </SoftCard>
          </View>

          <SectionHeading title="Ví của bạn" />
          <SoftCard style={styles.sectionCard}>
            <MenuRow icon="wallet-outline" color="#5FA7FF" label="Quản lý ví" onPress={() => router.push('/wallet/manage')} last />
          </SoftCard>

          <SectionHeading title="Tuỳ chọn" />
          <SoftCard style={styles.sectionCard}>
            <MenuRow 
              icon="sparkles-outline" 
              color={SoftColors.primary} 
              label="Hỏi đáp cùng Trợ lý AI" 
              onPress={() => {
                setAiAssistantEnabled(true);
                router.push('/ai-chat');
              }} 
            />
            <MenuRow icon="globe-outline" color="#56D98C" label="Tra cứu tỷ giá trực tiếp" onPress={() => router.push('/exchange-rate')} />
            <MenuRow icon="calculator-outline" color="#8C75FF" label="Tính thuế TNCN" onPress={() => router.push('/tax-calculator')} last />
          </SoftCard>

          <SectionHeading title="Tài khoản" />
          <SoftCard style={styles.sectionCard}>
            <MenuRow icon="mail-outline" color="#8A98AA" label="Email" value={user?.email || '-'} />
            <MenuRow icon="log-out-outline" color={Colors.expense} label="Đăng xuất" onPress={handleLogout} last destructive />
          </SoftCard>
        </ScrollView>
      </SafeAreaView>

    </View>
  );
}

function MenuRow({
  icon,
  color,
  label,
  value,
  onPress,
  rightElement,
  destructive,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.82 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.menuRow, last && styles.menuRowLast]}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.menuLabel, destructive && { color: Colors.expense }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value ? <Text style={styles.menuValue}>{value}</Text> : null}
        {rightElement || (onPress ? <Ionicons name="chevron-forward" size={16} color={SoftColors.muted} /> : null)}
      </View>
    </TouchableOpacity>
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
    paddingBottom: 112,
  },
  hero: {
    borderRadius: 34,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 18,
    ...shadow.glow,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    right: 6,
    bottom: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: SoftColors.primary,
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
    marginBottom: 14,
  },
  editButton: {
    minWidth: 220,
    backgroundColor: 'rgba(255,255,255,0.24)',
    shadowOpacity: 0,
    elevation: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: SoftColors.text,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: SoftColors.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  sectionCard: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(174, 213, 188, 0.24)',
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: SoftColors.text,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuValue: {
    fontSize: 13,
    color: SoftColors.muted,
  },

});
