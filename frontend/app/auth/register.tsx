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
import { SoftColors, shadow } from '@/constants/design';
import { GlowButton, SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';

export default function RegisterScreen() {
  const signUp = useStore((state) => state.signUp);
  const isBusy = useStore((state) => state.isBusy);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại mật khẩu xác nhận.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Chưa đồng ý điều khoản', 'Bạn cần đồng ý điều khoản dịch vụ để tiếp tục.');
      return;
    }

    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    } catch (error) {
      Alert.alert('Đăng ký thất bại', error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
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
                <Ionicons name="sparkles-outline" size={50} color={SoftColors.primaryDark} />
              </View>
            </View>

            <Text style={styles.title}>Tạo tài khoản mới</Text>
            <Text style={styles.subtitle}>Nhập thông tin của bạn để bắt đầu hành trình tài chính.</Text>

            <SoftCard style={styles.formCard}>
              <AuthInput
                icon="person-outline"
                placeholder="Họ tên"
                value={name}
                onChangeText={setName}
              />
              <AuthInput
                icon="mail-outline"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <AuthInput
                icon="shield-checkmark-outline"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.82}
                onPress={() => setAcceptedTerms((current) => !current)}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <Text style={styles.checkboxText}>Tôi đồng ý điều khoản dịch vụ</Text>
              </TouchableOpacity>

              <GlowButton
                label={isBusy ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                onPress={() => void handleSubmit()}
                disabled={isBusy}
                style={styles.primaryButton}
              />

              <Link href={'/auth/login' as any} asChild>
                <TouchableOpacity style={styles.footerLink} activeOpacity={0.82}>
                  <Text style={styles.footerText}>Đã có tài khoản? Đăng nhập</Text>
                </TouchableOpacity>
              </Link>
            </SoftCard>
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
    width: 112,
    height: 112,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  title: {
    fontSize: 22,
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
    marginBottom: 26,
  },
  formCard: {
    padding: 20,
    paddingTop: 14,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: SoftColors.border,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: SoftColors.text,
    borderColor: SoftColors.text,
  },
  checkboxText: {
    flex: 1,
    color: SoftColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 18,
  },
  footerLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: SoftColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
