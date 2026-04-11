import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@src/store/auth.store';
import { Validators } from '@src/utils/validators';
import { AppButton } from '@src/components/common/AppButton';
import { AppInput, AppPasswordInput } from '@src/components/common/AppInput';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Spacing, Radius } from '@src/constants/spacing';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const validate = (): boolean => {
    const newErrors = {
      displayName: Validators.required(displayName, 'Họ tên'),
      email: Validators.email(email),
      password: Validators.password(password),
      confirmPassword: Validators.confirmPassword(password, confirmPassword),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;
    const success = await register(email.trim(), password, displayName.trim());
    if (success) router.replace('/(tabs)' as any);
  };

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Tạo Tài Khoản</Text>
        <Text style={styles.subtitle}>Bắt đầu hành trình sống xanh của bạn</Text>

        {error && (
          <View style={styles.serverError}>
            <Text style={styles.serverErrorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <AppInput label="Họ và tên" placeholder="Tên đầy đủ" value={displayName} onChangeText={setDisplayName} leftIcon="account-outline" returnKeyType="next" error={errors.displayName} />
          <AppInput label="Email" placeholder="Nhập email" value={email} onChangeText={(v) => { setEmail(v); clearError(); }} leftIcon="email-outline" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" error={errors.email} />
          <AppPasswordInput label="Mật khẩu" placeholder="Tối thiểu 6 ký tự" value={password} onChangeText={setPassword} leftIcon="lock-outline" returnKeyType="next" error={errors.password} />
          <AppPasswordInput label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} leftIcon="lock-check-outline" returnKeyType="done" onSubmitEditing={handleRegister} error={errors.confirmPassword} />
          <AppButton title="Đăng Ký" variant="secondary" onPress={handleRegister} isLoading={isLoading} style={styles.registerBtn} />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hoặc đăng ký bằng</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={() => Alert.alert("Sắp ra mắt", "Tính năng đăng nhập Google cần được cấp Client ID từ Google Cloud Console để hoạt động.")}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.googleIcon} />
            <Text style={styles.googleBtnText}>Đăng ký với Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.loginLink}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.white },
  container: { flexGrow: 1, padding: Spacing.xl, paddingTop: 60 },
  backBtn: { marginBottom: Spacing.xl, width: 40 },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  serverError: { backgroundColor: Colors.errorSurface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  serverErrorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center' },
  form: { gap: Spacing.md },
  registerBtn: { marginTop: Spacing.md },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  loginPrompt: { fontSize: FontSize.md, color: Colors.textSecondary },
  loginLink: { fontSize: FontSize.md, color: Colors.secondary, fontWeight: FontWeight.bold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  dividerText: { marginHorizontal: Spacing.md, color: Colors.textTertiary, fontSize: FontSize.sm },
  googleBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: Colors.white, borderRadius: Radius.md, 
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm
  },
  googleIcon: { width: 24, height: 24 },
  googleBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
});
