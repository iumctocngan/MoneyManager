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
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/app-store';
import { Colors , SoftColors, shadow } from '@/constants/design';

import { GlowButton, SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';

export default function LoginScreen() {
  const signIn = useStore((state) => state.signIn);
  const isBusy = useStore((state) => state.isBusy);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    try {
      await signIn(email.trim(), password);
    } catch (error) {
      Alert.alert('Đăng nhập thất bại', error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
    }
  };

  return (
    <View style={styles.container}>
      <SoftBackdrop />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroIconWrap}>
              <View style={styles.heroIcon}>
                <Ionicons name="wallet-outline" size={54} color={SoftColors.primaryDark} />
              </View>
            </View>

            <Text style={styles.title}>Chào mừng trở lại</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục quản lý tài chính của bạn.</Text>

            <SoftCard style={styles.formCard}>
              <AuthInput
                icon="mail-outline"
                placeholder="Nhập email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Nhập mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Link href={'/auth/forgot-password' as any} asChild>
                <TouchableOpacity activeOpacity={0.8} style={styles.forgotLink}>
                  <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </Link>

              <GlowButton
                label={isBusy ? 'Đang đăng nhập...' : 'Đăng nhập'}
                onPress={() => void handleSubmit()}
                disabled={isBusy}
                style={styles.primaryButton}
              />

              <Link href={'/auth/register' as any} asChild>
                <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.82}>
                  <Text style={styles.secondaryButtonText}>Tạo tài khoản</Text>
                </TouchableOpacity>
              </Link>
            </SoftCard>

            <View style={styles.socialWrap}>
              <Text style={styles.socialLabel}>Hoặc đăng nhập bằng</Text>
              <View style={styles.socialRow}>
                <TouchableOpacity activeOpacity={0.82} style={styles.socialButton}>
                  <Ionicons name="logo-google" size={22} color="#4285F4" />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.82} style={styles.socialButton}>
                  <Ionicons name="logo-apple" size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function AuthInput({
  icon,
  ...props
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputBlock}>
      <View style={softInputStyles.inputShell}>
        <View style={softInputStyles.inputIcon}>
          <Ionicons name={icon} size={18} color={SoftColors.muted} />
        </View>
        <TextInput
          {...props}
          style={styles.input}
          placeholderTextColor={SoftColors.muted}
          selectionColor={SoftColors.primaryDark}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SoftColors.pageBase,
  },
  safeArea: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  heroIconWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  heroIcon: {
    width: 116,
    height: 116,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: SoftColors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: SoftColors.muted,
    textAlign: 'center',
    marginBottom: 28,
  },
  formCard: {
    padding: 20,
    paddingTop: 16,
  },
  inputBlock: {
    marginTop: 12,
  },
  input: {
    flex: 1,
    color: SoftColors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 14,
  },
  forgotText: {
    color: SoftColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 18,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: 'rgba(21, 32, 50, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  secondaryButtonText: {
    color: SoftColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  socialWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  socialLabel: {
    fontSize: 14,
    color: SoftColors.text,
    marginBottom: 14,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 14,
  },
  socialButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});
