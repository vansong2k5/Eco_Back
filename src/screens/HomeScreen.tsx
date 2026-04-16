import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@src/store/auth.store';
import { useAppStore, useEcoPoints } from '@src/store/app.store';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Spacing, Radius, Shadow } from '@src/constants/spacing';
import { Card, SectionHeader, Badge } from '@src/components/common/UI';
import { formatPoints, formatVND, timeAgo, getInitials } from '@src/utils/formatters';
import { Transaction, Reward } from '@src/types/models';
import { TransactionService } from '@src/services/transaction.service';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { transactions, rewards, subscribeTransactions, fetchRewards } = useAppStore();
  const dynamicPoints = useEcoPoints();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeTransactions(user.uid);
    fetchRewards();
    return () => unsub();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRewards();
    setRefreshing(false);
  };

  const points = Math.max(dynamicPoints, profile?.ecoPoints ?? 0);
  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Bạn';

  const quickActions = [
    { icon: 'qrcode-scan', label: 'Quét QR', color: '#E8F5E9', iconColor: Colors.primary, route: '/(tabs)/scan' },
    { icon: 'map-marker-radius', label: 'Điểm Thu\nGom', color: '#E0F2F1', iconColor: Colors.secondary, route: '/(tabs)/map' },
    { icon: 'gift-outline', label: 'Đổi Quà', color: '#FFF3E0', iconColor: '#E65100', route: '/(tabs)/rewards' },
    { icon: 'clipboard-list-outline', label: 'Lịch sử', color: '#EDE7F6', iconColor: '#5E35B1', route: '/(tabs)/orders' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notiBell}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.textPrimary} />
          <View style={styles.notiBadge} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceOuter}>
        <LinearGradient
          colors={['#2E7D32', '#1B5E20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Tổng EcoPoint của bạn</Text>
          <View style={styles.pointsRow}>
            <Text style={styles.pointsValue}>{formatPoints(points)}</Text>
            <MaterialCommunityIcons name="leaf" size={32} color="#A5D6A7" />
          </View>
          <Text style={styles.pointsSubtext}>≈ {formatVND(points * 100)} giá trị quy đổi</Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.greenActionBtn} onPress={() => router.push('/create-request' as any)}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={Colors.primary} />
              <Text style={styles.greenActionText}>Tạo Đơn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.greenActionBtn} onPress={() => router.push('/(tabs)/orders' as any)}>
              <MaterialCommunityIcons name="history" size={18} color={Colors.primary} />
              <Text style={styles.greenActionText}>Lịch sử</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <SectionHeader title="Dịch vụ" />
        <View style={styles.servicesGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity key={item.label} style={styles.serviceItem} onPress={() => router.push(item.route as any)} activeOpacity={0.7}>
              <View style={[styles.serviceIcon, { backgroundColor: item.color }]}>
                <MaterialCommunityIcons name={item.icon as any} size={28} color={item.iconColor} />
              </View>
              <Text style={styles.serviceLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Featured Rewards */}
      {rewards.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Phần Thưởng Nổi Bật"
            action={
              <TouchableOpacity onPress={() => router.push('/(tabs)/rewards' as any)}>
                <Text style={styles.seeAll}>Xem tất cả</Text>
              </TouchableOpacity>
            }
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rewardScroll}>
            {rewards.slice(0, 5).map((reward: Reward) => (
              <Card key={reward.id} style={styles.rewardCard} padding={Spacing.md}>
                <View style={styles.rewardImagePlaceholder}>
                  <MaterialCommunityIcons name="gift" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.brand}>{reward.brand}</Text>
                <Text style={styles.rewardTitle} numberOfLines={2}>{reward.title}</Text>
                <Badge label={`${formatPoints(reward.pointsRequired)} EP`} />
              </Card>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <SectionHeader title="Hoạt Động Gần Đây" />
        {transactions.length === 0 ? (
          <Card>
            <Text style={styles.emptyTx}>Chưa có giao dịch nào.</Text>
          </Card>
        ) : (
          transactions.slice(0, 5).map((tx: Transaction) => {
            const rawTx = tx;
            const resolvedTx = TransactionService.evaluateTransaction(rawTx);
            
            const isOrder = resolvedTx.type === 'ORDER';
            const isEarn = resolvedTx.type === 'EARN';
            
            const isPending = resolvedTx.status === 'PROCESSING' || resolvedTx.status === 'PENDING';
            const isApproved = resolvedTx.status === 'APPROVED' || resolvedTx.status === 'COMPLETED' || (!resolvedTx.status && isEarn); 
            const isExpired = resolvedTx.status === 'EXPIRED' || resolvedTx.status === 'CANCELLED';

            const iconBgColor = isApproved ? Colors.successSurface : isPending ? '#FFF9C4' : Colors.errorSurface;
            const iconColor = isApproved ? Colors.success : isPending ? '#FBC02D' : Colors.error;
            const amountColor = isApproved ? Colors.success : isPending ? '#FBC02D' : Colors.error;

            return (
            <Card key={resolvedTx.id} style={styles.txCard} padding={Spacing.md}>
              <View style={[styles.txIcon, { backgroundColor: iconBgColor }]}>
                <MaterialCommunityIcons 
                  name={isEarn ? 'qrcode-scan' : isOrder ? 'truck-delivery' : 'gift'} 
                  size={20} 
                  color={iconColor} 
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc}>{resolvedTx.description}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2}}>
                  <Text style={styles.txDate}>{timeAgo(resolvedTx.createdAt)}</Text>
                  <Text style={{
                    fontSize: 9, fontWeight: 'bold', 
                    color: isApproved ? Colors.success : isPending ? '#FBC02D' : Colors.error
                  }}>
                    • {isApproved ? 'Hoàn thành' : isPending ? 'Đang xử lý' : 'Đã hủy/Quá hạn'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.txAmount, { 
                color: amountColor, 
                textDecorationLine: isExpired ? 'line-through' : 'none' 
              }]}>
                {isEarn ? '+' : (isOrder ? '+' : '-')}{formatPoints(resolvedTx.amount)} EP
              </Text>
            </Card>
          )})
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, backgroundColor: Colors.white },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  greeting: { fontSize: FontSize.sm, color: Colors.textSecondary },
  userName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  notiBell: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  notiBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  balanceOuter: { margin: Spacing.lg, marginTop: Spacing.md },
  balanceCard: { borderRadius: Radius.xxl, padding: Spacing.xl, ...Shadow.lg },
  balanceLabel: { color: '#A5D6A7', fontSize: FontSize.sm, marginBottom: Spacing.sm },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pointsValue: { color: Colors.white, fontSize: 42, fontWeight: FontWeight.extraBold },
  pointsSubtext: { color: '#81C784', fontSize: FontSize.sm, marginTop: 4 },
  actionButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  greenActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.md },
  greenActionText: { color: Colors.primary, fontWeight: FontWeight.semiBold, fontSize: FontSize.sm },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  servicesGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  serviceItem: { alignItems: 'center', width: '22%', gap: Spacing.sm },
  serviceIcon: { width: 60, height: 60, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center' },
  serviceLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', fontWeight: FontWeight.medium },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semiBold },
  rewardScroll: { marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  rewardCard: { width: 150, marginRight: Spacing.md },
  rewardImagePlaceholder: { width: '100%', height: 80, backgroundColor: Colors.primarySurface, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  brand: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: 2 },
  rewardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  txIcon: { width: 40, height: 40, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  txDate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  txAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  emptyTx: { textAlign: 'center', color: Colors.textTertiary, padding: Spacing.xl },
});
