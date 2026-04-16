import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppButton } from '@src/components/common/AppButton';
import { Colors } from '@src/constants/colors';
import { Radius, Spacing } from '@src/constants/spacing';
import { FontSize, FontWeight } from '@src/constants/typography';
import { RewardService } from '@src/services/firestore.service';
import { useAppStore, useEcoPoints } from '@src/store/app.store';
import { useAuthStore } from '@src/store/auth.store';
import { Reward } from '@src/types/models';
import { formatPoints } from '@src/utils/formatters';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal, Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Static fallback rewards updated from images ────────────────────────────
const DEFAULT_REWARDS: Reward[] = [
  { 
    id: 'r1', title: 'Voucher Starbucks 50K', brand: 'Starbucks', 
    description: 'Thưởng thức cà phê Starbucks đậm đà với ưu đãi 50.000đ.', 
    value: '50.000 VND', pointsRequired: 500, category: 'food', isActive: true, 
    quantity: 100, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/an_uong_1.jpg') 
  },
  { 
    id: 'r2', title: 'Gà Rán Jollibee', brand: 'Jollibee', 
    description: 'Thưởng thức combo gà rán giòn rụm tại Jollibee.', 
    value: '60.000 VND', pointsRequired: 600, category: 'food', isActive: true, 
    quantity: 80, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/an_uong_2.jpg') 
  },
  { 
    id: 'r3', title: 'Voucher GrabFood 30K', brand: 'GrabFood', 
    description: 'Giảm ngay 30.000đ khi đặt món qua GrabFood.', 
    value: '30.000 VND', pointsRequired: 300, category: 'food', isActive: true, 
    quantity: 200, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/an_uong_3.jpg') 
  },
  { 
    id: 'r4', title: 'Combo Lotteria', brand: 'Lotteria', 
    description: 'Thưởng thức Burger và gà rán tại hệ thống Lotteria.', 
    value: '75.000 VND', pointsRequired: 750, category: 'food', isActive: true, 
    quantity: 150, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/an_uong_4.jpg') 
  },
  { 
    id: 'r5', title: 'Voucher Katinat', brand: 'Katinat', 
    description: 'Ưu đãi đặc biệt cho các dòng trà và cà phê tại Katinat.', 
    value: '40.000 VND', pointsRequired: 400, category: 'food', isActive: true, 
    quantity: 120, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/an_uong_5.jpg') 
  },
  { 
    id: 'r6', title: 'Voucher Cheese Coffee', brand: 'Cheese Coffee', 
    description: 'Thưởng thức thức uống phong cách Châu Âu tại Cheese Coffee.', 
    value: '45.000 VND', pointsRequired: 450, category: 'food', isActive: true, 
    quantity: 90, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/an_uong_6.jpg') 
  },
  { 
    id: 'r7', title: 'Chuyến xe Grab 20K', brand: 'Grab', 
    description: 'Giảm 20.000đ cho dịch vụ di chuyển GrabBike/GrabCar.', 
    value: '20.000 VND', pointsRequired: 200, category: 'transport', isActive: true, 
    quantity: 300, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/di_chuyen_1.jpg') 
  },
  { 
    id: 'r8', title: 'Voucher Be 25K', brand: 'Be', 
    description: 'Giảm ngay 25.000đ cho chuyến xe đặt qua ứng dụng Be.', 
    value: '25.000 VND', pointsRequired: 250, category: 'transport', isActive: true, 
    quantity: 200, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/di_chuyen_2.jpg') 
  },
  { 
    id: 'r9', title: 'Overwatch 2 Coins', brand: 'Blizzard', 
    description: 'Nạp Overwatch Coins để sở hữu các trang phục và Battle Pass.', 
    value: '100.000 VND', pointsRequired: 1000, category: 'entertainment', isActive: true, 
    quantity: 50, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/giai_tri_1.jpeg') 
  },
  { 
    id: 'r10', title: 'Thẻ nạp Roblox (Robux)', brand: 'Roblox', 
    description: 'Đổi điểm lấy Robux để mua sắm vật phẩm trong Roblox.', 
    value: '100.000 VND', pointsRequired: 1000, category: 'entertainment', isActive: true, 
    quantity: 50, expiresAt: new Date('2026-12-31'), imageUrl: '', 
    fallbackImage: require('../../assets/images/gift/giai_tri_2.jpeg') 
  },
];

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',           label: 'Tất cả',     icon: 'view-grid',     color: Colors.primary,     bg: Colors.primarySurface },
  { key: 'food',          label: 'Ăn uống',    icon: 'food',          color: '#E65100',           bg: '#FFF3E0' },
  { key: 'transport',     label: 'Di chuyển',  icon: 'motorbike',     color: '#1565C0',           bg: '#E3F2FD' },
  { key: 'shopping',      label: 'Mua sắm',    icon: 'shopping',      color: '#7B1FA2',           bg: '#F3E5F5' },
  { key: 'entertainment', label: 'Giải trí',   icon: 'star-circle',   color: '#C62828',           bg: '#FFEBEE' },
] as const;

// ── Reward Card Icon ──────────────────────────────────────────────────────────
function rewardIcon(category: string): { name: any; color: string; bg: string } {
  const cat = CATEGORIES.find(c => c.key === category);
  return { name: cat?.icon ?? 'gift', color: cat?.color ?? Colors.primary, bg: cat?.bg ?? Colors.primarySurface };
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function RewardsScreen() {
  const { rewards: firestoreRewards, isLoadingRewards, fetchRewards } = useAppStore();
  const { profile } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selected, setSelected] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => { fetchRewards(); }, []);

  // Use Firestore data if available, else fallback to defaults
  const rewards: Reward[] = firestoreRewards.length > 0 ? firestoreRewards : DEFAULT_REWARDS;

  const filtered = activeCategory === 'all'
    ? rewards
    : rewards.filter(r => r.category === activeCategory);

  const dynamicPoints = useEcoPoints();
  const myPoints = Math.max(dynamicPoints, profile?.ecoPoints ?? 0);
  const canRedeem = (r: Reward) => myPoints >= r.pointsRequired;

  const handleRedeem = async (reward: Reward) => {
    if (!profile) return;
    if (!canRedeem(reward)) {
      Alert.alert('Không đủ điểm', `Bạn cần ${formatPoints(reward.pointsRequired)} EP. Hiện có: ${formatPoints(myPoints)} EP.`);
      return;
    }
    setRedeeming(true);
    const result = await RewardService.redeemReward(profile.uid, reward);
    setRedeeming(false);
    if (result.success) {
      Alert.alert('🎉 Đổi quà thành công!', `Bạn đã đổi thành công "${reward.title}". Voucher sẽ được gửi qua email trong vòng 24h.`);
      setSelected(null);
    } else {
      Alert.alert('Lỗi', 'Không thể đổi phần thưởng lúc này. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Đổi Phần Thưởng</Text>
          <Text style={styles.headerSub}>Dùng EcoPoints để nhận ưu đãi hấp dẫn</Text>
        </View>
        <View style={styles.pointsBadge}>
          <MaterialCommunityIcons name="leaf" size={16} color={Colors.primary} />
          <Text style={styles.pointsText}>{formatPoints(myPoints)} EP</Text>
        </View>
      </View>

      {/* Category Bar */}
      <View style={styles.catBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catBar}>
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catChip, active && styles.catChipActive, active && { backgroundColor: cat.color }]}
                onPress={() => setActiveCategory(cat.key)}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={16}
                  color={active ? Colors.white : cat.color}
                />
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Reward Count */}
      <Text style={styles.countLabel}>{filtered.length} phần thưởng</Text>

      {/* Grid */}
      {isLoadingRewards ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="gift-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Không có phần thưởng</Text>
          <Text style={styles.emptyText}>Danh mục này chưa có phần thưởng nào.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={r => r.id}
          key="2cols"
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const { name: iconName, color, bg } = rewardIcon(item.category);
            const affordable = canRedeem(item);
            return (
              <TouchableOpacity
                style={[styles.card, !affordable && styles.cardDimmed]}
                onPress={() => setSelected(item)}
                activeOpacity={0.82}
              >
                {/* Image / Icon area */}
                <View style={[styles.cardImage, !item.imageUrl && !item.fallbackImage && { backgroundColor: bg }]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.cardRealImage} resizeMode="cover" />
                  ) : item.fallbackImage ? (
                    <Image source={item.fallbackImage} style={styles.cardRealImage} resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name={iconName} size={44} color={color} />
                  )}
                  {!affordable && (
                    <View style={styles.lockOverlay}>
                      <MaterialCommunityIcons name="lock" size={20} color="rgba(255,255,255,0.9)" />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardValue}>{item.value}</Text>

                  {/* Points */}
                  <View style={[styles.pointsChip, { backgroundColor: affordable ? Colors.primarySurface : Colors.errorSurface }]}>
                    <MaterialCommunityIcons
                      name="leaf"
                      size={12}
                      color={affordable ? Colors.primary : Colors.error}
                    />
                    <Text style={[styles.pointsChipText, { color: affordable ? Colors.primary : Colors.error }]}>
                      {formatPoints(item.pointsRequired)} EP
                    </Text>
                  </View>

                  <AppButton
                    title={affordable ? 'Đổi ngay' : 'Thiếu điểm'}
                    size="sm"
                    variant={affordable ? 'primary' : 'outline'}
                    disabled={!affordable}
                    onPress={() => setSelected(item)}
                    fullWidth
                    style={styles.redeemBtn}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)} />
        {selected && (() => {
          const { name: iconName, color, bg } = rewardIcon(selected.category);
          const affordable = canRedeem(selected);
          const shortage = selected.pointsRequired - myPoints;
          return (
            <View style={styles.modal}>
              {/* Close */}
              <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>

              {/* Icon Header */}
              <View style={[styles.modalIcon, !selected.imageUrl && !selected.fallbackImage && { backgroundColor: bg }]}>
                {selected.imageUrl ? (
                  <Image source={{ uri: selected.imageUrl }} style={styles.modalRealImage} resizeMode="contain" />
                ) : selected.fallbackImage ? (
                  <Image source={selected.fallbackImage} style={styles.modalRealImage} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name={iconName} size={64} color={color} />
                )}
              </View>

              <Text style={styles.modalBrand}>{selected.brand}</Text>
              <Text style={styles.modalTitle}>{selected.title}</Text>
              <Text style={styles.modalValue}>{selected.value}</Text>

              {/* Description */}
              <Text style={styles.modalDesc}>{selected.description}</Text>

              {/* Stats Row */}
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <MaterialCommunityIcons name="leaf" size={18} color={Colors.primary} />
                  <Text style={styles.modalStatVal}>{formatPoints(selected.pointsRequired)}</Text>
                  <Text style={styles.modalStatLabel}>EcoPoints cần</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStatItem}>
                  <MaterialCommunityIcons name="wallet" size={18} color={affordable ? Colors.success : Colors.error} />
                  <Text style={[styles.modalStatVal, { color: affordable ? Colors.success : Colors.error }]}>
                    {formatPoints(myPoints)}
                  </Text>
                  <Text style={styles.modalStatLabel}>EP của bạn</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStatItem}>
                  <MaterialCommunityIcons name="package-variant" size={18} color={Colors.secondary} />
                  <Text style={styles.modalStatVal}>{selected.quantity}</Text>
                  <Text style={styles.modalStatLabel}>Còn lại</Text>
                </View>
              </View>

              {!affordable && (
                <View style={styles.shortageBox}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.error} />
                  <Text style={styles.shortageText}>
                    Bạn cần thêm {formatPoints(shortage)} EP để đổi phần thưởng này.
                  </Text>
                </View>
              )}

              <AppButton
                title={redeeming ? 'Đang xử lý...' : affordable ? '🎁 Xác nhận đổi quà' : '🌱 Quét QR để tích thêm điểm'}
                variant={affordable ? 'primary' : 'secondary'}
                disabled={!affordable || redeeming}
                onPress={() => handleRedeem(selected)}
                fullWidth
                style={styles.modalBtn}
              />
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

const CARD_W = (SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primarySurface, paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: Radius.full,
  },
  pointsText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.sm },

  catBarWrapper: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catBar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.sm, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  catChipActive: { borderColor: 'transparent' },
  catLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  catLabelActive: { color: Colors.white, fontWeight: FontWeight.bold },

  countLabel: {
    fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: FontWeight.medium,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  gridRow: { gap: Spacing.md, marginBottom: Spacing.md },

  card: {
    width: CARD_W,
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09, shadowRadius: 6,
  },
  cardDimmed: { opacity: 0.75 },
  cardImage: {
    width: '100%', height: CARD_W * 0.7,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden'
  },
  cardRealImage: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { padding: Spacing.sm, gap: 3 },
  cardBrand: { fontSize: 10, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  cardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary, lineHeight: 17 },
  cardValue: { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.bold },
  pointsChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.sm,
    alignSelf: 'flex-start', marginTop: 2,
  },
  pointsChipText: { fontSize: 11, fontWeight: FontWeight.bold },
  redeemBtn: { marginTop: Spacing.xs },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptyText: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center' },

  // Modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
  },
  modal: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, paddingBottom: 48,
    elevation: 24,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute', top: Spacing.md, right: Spacing.lg,
    backgroundColor: Colors.background, borderRadius: Radius.full, padding: 6,
  },
  modalIcon: {
    width: 110, height: 110, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
    overflow: 'hidden', backgroundColor: Colors.white,
  },
  modalRealImage: {
    width: '90%', height: '90%',
  },
  modalBrand: { fontSize: FontSize.xs, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary, textAlign: 'center', marginTop: 4 },
  modalValue: { fontSize: FontSize.lg, color: Colors.success, fontWeight: FontWeight.bold, marginTop: 2 },
  modalDesc: {
    fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 20, marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  modalStats: {
    flexDirection: 'row', backgroundColor: Colors.background,
    borderRadius: Radius.lg, paddingVertical: Spacing.md,
    width: '100%', marginBottom: Spacing.md,
  },
  modalStatItem: { flex: 1, alignItems: 'center', gap: 4 },
  modalStatVal: { fontSize: FontSize.lg, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
  modalStatLabel: { fontSize: 10, color: Colors.textTertiary, textTransform: 'uppercase' },
  modalStatDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 8 },
  shortageBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.errorSurface, padding: Spacing.sm,
    borderRadius: Radius.md, width: '100%', marginBottom: Spacing.sm,
  },
  shortageText: { flex: 1, fontSize: FontSize.xs, color: Colors.error, lineHeight: 17 },
  modalBtn: { marginTop: Spacing.sm, width: '100%' },
});
