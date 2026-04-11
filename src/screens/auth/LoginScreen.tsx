import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  KeyboardAvoidingView, Platform, TouchableOpacity, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@src/store/auth.store';
import { Validators } from '@src/utils/validators';
import { AppButton } from '@src/components/common/AppButton';
import { AppInput, AppPasswordInput } from '@src/components/common/AppInput';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Spacing, Radius } from '@src/constants/spacing';

const SAVED_CREDENTIALS_KEY = '@ecoback_saved_credentials';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Load saved credentials on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SAVED_CREDENTIALS_KEY);
        if (saved) {
          const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
          setEmail(savedEmail ?? '');
          setPassword(savedPassword ?? '');
          setRememberMe(true);
        }
      } catch (_) {}
    })();
  }, []);

  const validate = (): boolean => {
    const newErrors = {
      email: Validators.email(email),
      password: Validators.password(password),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    const success = await login(email.trim(), password);
    if (success) {
      // Auto-save credentials if remember me is on
      if (rememberMe) {
        await AsyncStorage.setItem(
          SAVED_CREDENTIALS_KEY,
          JSON.stringify({ email: email.trim(), password })
        );
      } else {
        await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../../assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>EcoBack</Text>
          <Text style={styles.tagline}>Sống xanh · Tích điểm · Đổi quà</Text>
        </View>

        <Text style={styles.title}>Đăng Nhập</Text>
        <Text style={styles.subtitle}>Chào mừng bạn quay trở lại!</Text>

        {error && (
          <View style={styles.serverError}>
            <Text style={styles.serverErrorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <AppInput
            label="Email"
            placeholder="Nhập email của bạn"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError(); }}
            leftIcon="email-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            error={errors.email}
          />

          <AppPasswordInput
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError(); }}
            leftIcon="lock-outline"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            error={errors.password}
          />

          {/* Remember Me Toggle */}
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Lưu mật khẩu</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/forgot-password' as any)} style={styles.forgotLink}>
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <AppButton title="Đăng Nhập" onPress={handleLogin} isLoading={isLoading} style={styles.loginBtn} />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hoặc đăng nhập bằng</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={() => Alert.alert("Sắp ra mắt", "Tính năng đăng nhập Google cần được cấp Client ID từ Google Cloud Console để hoạt động.")}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.googleIcon} />
            <Text style={styles.googleBtnText}>Đăng nhập với Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push('/register' as any)}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>


      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.white },
  container: { flexGrow: 1, padding: Spacing.xl, paddingTop: 60 },
  logoSection: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoImage: { width: 100, height: 100, borderRadius: 24, marginBottom: Spacing.md },
  appName: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold, color: Colors.primary },
  tagline: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  serverError: { backgroundColor: Colors.errorSurface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  serverErrorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center' },
  form: { gap: Spacing.md },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold },
  rememberText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  forgotLink: { alignSelf: 'flex-end' },
  forgotText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  loginBtn: { marginTop: Spacing.md },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  registerPrompt: { fontSize: FontSize.md, color: Colors.textSecondary },
  registerLink: { fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.bold },
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
