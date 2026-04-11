import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@src/store/auth.store';
import { Card, Divider } from '@src/components/common/UI';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Spacing, Radius } from '@src/constants/spacing';
import { formatPoints, formatDate, getInitials } from '@src/utils/formatters';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, logout } = useAuthStore();

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Người dùng';
  const email = profile?.email || user?.email || '';

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm('Bạn có chắc muốn đăng xuất khỏi EcoBack?');
      if (confirm) {
        logout().then(() => router.replace('/login'));
      }
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi EcoBack?', [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
            router.replace('/login');
          } 
        },
      ]);
    }
  };

  const menuItems = [
    { icon: 'account-edit-outline', label: 'Chỉnh sửa thông tin', onPress: () => {} },
    { icon: 'bell-outline', label: 'Thông báo', onPress: () => {} },
    { icon: 'shield-check-outline', label: 'Bảo mật & Mật khẩu', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Trợ giúp & Phản hồi', onPress: () => {} },
    { icon: 'file-document-outline', label: 'Điều khoản dịch vụ', onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ</Text>
      </View>

      <View style={styles.profileSection}>
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{getInitials(displayName)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <Text style={styles.memberSince}>Thành viên từ {profile ? formatDate(profile.createdAt) : '--'}</Text>
            </View>
          </View>
          <Divider />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatPoints(profile?.ecoPoints ?? 0)}</Text>
              <Text style={styles.statLabel}>EcoPoint</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.totalRecycled ?? 0} kg</Text>
              <Text style={styles.statLabel}>Đã tái chế</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Xanh 🌱</Text>
              <Text style={styles.statLabel}>Hạng thành viên</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.menuSection}>
        <Card padding={0}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <MaterialCommunityIcons name={item.icon as any} size={24} color={Colors.textSecondary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </Card>
      </View>

      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, backgroundColor: Colors.white },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  profileSection: { padding: Spacing.lg },
  profileCard: {},
  profileTop: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  profileInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  profileName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  memberSince: { fontSize: FontSize.xs, color: Colors.textTertiary },
  statsRow: { flexDirection: 'row', paddingTop: Spacing.md },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.divider },
  menuSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  logoutSection: { paddingHorizontal: Spacing.lg },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.error, backgroundColor: Colors.errorSurface },
  logoutText: { color: Colors.error, fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
