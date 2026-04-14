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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SoftColors, shadow } from '@/constants/design';
import { GlowButton, SoftBackdrop, SoftCard, softInputStyles } from '@/components/ui/soft';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!email.trim()) {
      Alert.alert('Thiếu email', 'Vui lòng nhập email để nhận liên kết đặt lại mật khẩu.');
      return;
    }

    setSent(true);
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
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={SoftColors.text} />
            </TouchableOpacity>

            <View style={styles.heroIcon}>
              <Ionicons name="mail-open-outline" size={54} color={SoftColors.primaryDark} />
            </View>
            <Text style={styles.title}>Đặt lại mật khẩu</Text>
            <Text style={styles.subtitle}>Nhập email để nhận liên kết đặt lại mật khẩu.</Text>

            <SoftCard style={styles.formCard}>
              <View style={softInputStyles.inputShell}>
                <View style={softInputStyles.inputIcon}>
                  <Ionicons name="mail-outline" size={18} color={SoftColors.muted} />
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Nhập email của bạn"
                  placeholderTextColor={SoftColors.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                  selectionColor={SoftColors.primaryDark}
                />
              </View>

              <GlowButton label="Gửi liên kết reset" onPress={handleSend} style={styles.primaryButton} />

              {sent ? (
                <View style={styles.successCard}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </View>
                  <Text style={styles.successText}>
                    Liên kết reset đã được gửi. Vui lòng kiểm tra email của bạn.
                  </Text>
                </View>
              ) : null}
            </SoftCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  backButton: {
    position: 'absolute',
    top: 14,
    left: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 112,
    height: 112,
    borderRadius: 34,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    marginBottom: 18,
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
    marginBottom: 24,
  },
  formCard: {
    padding: 20,
  },
  input: {
    flex: 1,
    color: SoftColors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  primaryButton: {
    marginTop: 18,
  },
  successCard: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...shadow.card,
  },
  successIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SoftColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  successText: {
    fontSize: 15,
    lineHeight: 22,
    color: SoftColors.text,
    textAlign: 'center',
  },
});
