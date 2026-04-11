import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '@src/store/app.store';
import { useAuthStore } from '@src/store/auth.store';
import { Reward } from '@src/types/models';
import { Card, EmptyState, Badge } from '@src/components/common/UI';
import { AppButton } from '@src/components/common/AppButton';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Spacing, Radius } from '@src/constants/spacing';
import { formatPoints } from '@src/utils/formatters';

const CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'food', label: '🍵 Đồ ăn' },
  { key: 'transport', label: '🚗 Di chuyển' },
  { key: 'shopping', label: '🛍️ Mua sắm' },
  { key: 'entertainment', label: '🎉 Giải trí' },
];

export default function RewardsScreen() {
  const { rewards, isLoadingRewards, fetchRewards } = useAppStore();
  const { profile } = useAuthStore();
  const [activeCategory, setActiveCategory] = React.useState('all');

  useEffect(() => { fetchRewards(); }, []);

  const filtered = activeCategory === 'all'
    ? rewards
    : rewards.filter((r: Reward) => r.category === activeCategory);

  const canRedeem = (r: Reward) => (profile?.ecoPoints ?? 0) >= r.pointsRequired;

  const renderItem = ({ item }: { item: Reward }) => (
    <Card style={styles.rewardCard} padding={Spacing.md}>
      <View style={styles.rewardImage}>
        <MaterialCommunityIcons name="gift" size={40} color={Colors.primary} />
      </View>
      <View style={styles.rewardBody}>
        <Text style={styles.brand} numberOfLines={1}>{item.brand}</Text>
        <Text style={styles.rewardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.rewardValue}>{item.value}</Text>
        <View style={styles.rewardFooter}>
          <Badge label={`${formatPoints(item.pointsRequired)} EP`} />
        </View>
        <AppButton
          title={canRedeem(item) ? 'Đổi ngay' : 'Thiếu điểm'}
          size="sm"
          variant={canRedeem(item) ? 'primary' : 'outline'}
          disabled={!canRedeem(item)}
          onPress={() => {}}
          fullWidth={true}
          style={styles.redeemBtn}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đổi Quà</Text>
        <View style={styles.pointsBadge}>
          <MaterialCommunityIcons name="leaf" size={16} color={Colors.primary} />
          <Text style={styles.pointsText}>{formatPoints(profile?.ecoPoints ?? 0)} EP</Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveCategory(item.key)}
            style={[styles.categoryChip, activeCategory === item.key && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryLabel, activeCategory === item.key && styles.categoryLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoadingRewards ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(r) => r.id}
          key="2_cols"
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon="gift-outline" title="Không có phần thưởng" subtitle="Hiện tại chưa có phần thưởng trong danh mục này." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, backgroundColor: Colors.white },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primarySurface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  pointsText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  categoryList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  categoryChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  categoryLabelActive: { color: Colors.white },
  loader: { marginTop: Spacing.xxxl },
  list: { padding: Spacing.md, paddingBottom: 100 },
  columnWrapper: { gap: Spacing.md, justifyContent: 'space-between', paddingBottom: Spacing.md },
  rewardCard: { flex: 1, flexDirection: 'column', gap: Spacing.sm },
  rewardImage: { width: '100%', aspectRatio: 1, backgroundColor: Colors.primarySurface, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  rewardBody: { flex: 1, gap: 4, justifyContent: 'space-between' },
  brand: { fontSize: FontSize.xs, color: Colors.textTertiary },
  rewardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  rewardValue: { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.bold },
  rewardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, marginBottom: Spacing.sm },
  redeemBtn: { marginTop: Spacing.sm },
});
