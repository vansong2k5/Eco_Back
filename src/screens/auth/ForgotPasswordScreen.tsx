import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@src/store/auth.store';
import { Validators } from '@src/utils/validators';
import { AppButton } from '@src/components/common/AppButton';
import { AppInput } from '@src/components/common/AppInput';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Spacing, Radius } from '@src/constants/spacing';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, isLoading, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    clearError();
    const err = Validators.email(email);
    if (err) { setEmailError(err); return; }
    const success = await forgotPassword(email.trim());
    if (success) setSent(true);
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <MaterialCommunityIcons name="email-check-outline" size={80} color={Colors.success} />
        <Text style={styles.successTitle}>Đã gửi email!</Text>
        <Text style={styles.successSubtitle}>Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới{'\n'}{email}</Text>
        <AppButton title="Quay lại Đăng nhập" onPress={() => router.replace('/login' as any)} style={styles.backToLoginBtn} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <MaterialCommunityIcons name="lock-reset" size={60} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>Quên Mật Khẩu?</Text>
        <Text style={styles.subtitle}>Nhập email của bạn, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.</Text>

        <AppInput
          label="Email"
          placeholder="Nhập email của bạn"
          value={email}
          onChangeText={(v) => { setEmail(v); setEmailError(null); clearError(); }}
          leftIcon="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          error={emailError}
          containerStyle={styles.input}
        />

        <AppButton title="Gửi Email" onPress={handleSubmit} isLoading={isLoading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.white },
  container: { flexGrow: 1, padding: Spacing.xl, paddingTop: 60 },
  navBackBtn: { width: 40, marginBottom: Spacing.xl },
  icon: { marginBottom: Spacing.xl },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xxl, lineHeight: 22 },
  input: { marginBottom: Spacing.xl },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl, backgroundColor: Colors.white, gap: Spacing.lg },
  successTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  successSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  backToLoginBtn: { marginTop: Spacing.xl },
});
