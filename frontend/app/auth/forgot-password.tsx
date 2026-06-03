import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SoftAlert } from '@/components/ui/SoftAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SoftColors, shadow } from '@/constants/design';
import { GlowButton, SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';
import { api } from '@/utils/api';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // BƯỚC 1: GỬI YÊU CẦU ĐẶT LẠI MẬT KHẨU
  const handleRequestOtp = async () => {
    if (!email.trim()) {
      SoftAlert.alert('Thiếu thông tin', 'Vui lòng nhập email của bạn.');
      return;
    }
    try {
      setIsBusy(true);
      await api.forgotPassword({ email: email.trim() });
      SoftAlert.alert('Thành công', 'Mã xác nhận đã được gửi đến email của bạn.');
      setStep(2);
    } catch (error: any) {
      SoftAlert.alert('Lỗi', error.message || 'Không thể gửi email lúc này.');
    } finally {
      setIsBusy(false);
    }
  };

  // BƯỚC 2: XÁC MINH MÃ OTP
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      SoftAlert.alert('Thiếu thông tin', 'Vui lòng nhập mã xác nhận.');
      return;
    }
    try {
      setIsBusy(true);
      await api.verifyResetOtp({ email: email.trim(), otp: otp.trim() });
      setStep(3);
    } catch (error: any) {
      SoftAlert.alert('Lỗi', error.message || 'Mã xác nhận không hợp lệ.');
    } finally {
      setIsBusy(false);
    }
  };

  // BƯỚC 3: ĐẶT LẠI MẬT KHẨU MỚI
  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      SoftAlert.alert('Thiếu thông tin', 'Vui lòng nhập mật khẩu mới.');
      return;
    }
    try {
      setIsBusy(true);
      await api.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword: newPassword,
      });
      SoftAlert.alert('Thành công', 'Mật khẩu của bạn đã được đặt lại thành công.');
      router.back(); // Quay về màn hình đăng nhập
    } catch (error: any) {
      SoftAlert.alert('Lỗi', error.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setIsBusy(false);
    }
  };

  // HÀM QUAY LẠI BƯỚC TRƯỚC
  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else router.back();
  };

  return (
    <View style={styles.container}>
      <SoftBackdrop />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={SoftColors.text} />
            </TouchableOpacity>

            <View style={styles.heroIcon}>
              <Ionicons 
                name={step === 1 ? "mail-open-outline" : step === 2 ? "keypad-outline" : "lock-closed-outline"} 
                size={54} 
                color={SoftColors.primaryDark} 
              />
            </View>

            <Text style={styles.title}>
              {step === 1 ? 'Đặt lại mật khẩu' : step === 2 ? 'Xác minh OTP' : 'Tạo mật khẩu mới'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Nhập email để nhận mã OTP khôi phục mật khẩu.' : 
               step === 2 ? `Chúng tôi đã gửi mã 6 số đến ${email}.` : 
               'Vui lòng nhập mật khẩu mới cho tài khoản của bạn.'}
            </Text>

            <SoftCard style={styles.formCard}>
              {step === 1 && (
                <>
                  <AuthInput
                    icon="mail-outline"
                    placeholder="Nhập email của bạn"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <GlowButton 
                    label={isBusy ? 'Đang gửi...' : 'Gửi mã xác nhận'} 
                    onPress={handleRequestOtp} 
                    disabled={isBusy}
                    style={styles.primaryButton} 
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <AuthInput
                    icon="keypad-outline"
                    placeholder="Nhập mã OTP 6 số"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <GlowButton 
                    label={isBusy ? 'Đang kiểm tra...' : 'Xác minh mã'} 
                    onPress={handleVerifyOtp} 
                    disabled={isBusy}
                    style={styles.primaryButton} 
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <AuthInput
                    icon="lock-closed-outline"
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  <GlowButton 
                    label={isBusy ? 'Đang lưu...' : 'Đặt lại mật khẩu'} 
                    onPress={handleResetPassword} 
                    disabled={isBusy}
                    style={styles.primaryButton} 
                  />
                </>
              )}
            </SoftCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function AuthInput({ icon, ...props }: { icon: React.ComponentProps<typeof Ionicons>['name'] } & React.ComponentProps<typeof TextInput>) {
  return (
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SoftColors.pageBase },
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  backButton: { position: 'absolute', top: 14, left: 10, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  heroIcon: { width: 112, height: 112, borderRadius: 34, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.78)', marginBottom: 18, ...shadow.soft },
  title: { fontSize: 22, fontWeight: '900', color: SoftColors.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 22, color: SoftColors.muted, textAlign: 'center', marginBottom: 24 },
  formCard: { padding: 20 },
  input: { flex: 1, color: SoftColors.text, fontSize: 16, paddingVertical: 0 },
  primaryButton: { marginTop: 18 },
});
