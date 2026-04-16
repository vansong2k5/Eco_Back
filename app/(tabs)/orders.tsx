import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { Spacing, Radius } from '../../src/constants/spacing';
import { timeAgo, formatDate } from '../../src/utils/formatters';
import { TransactionService } from '../../src/services/transaction.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTxMeta(tx: any) {
  const isEarn   = tx.type === 'EARN';
  const isRedeem = tx.type === 'REDEEM';
  const isOrder  = tx.type === 'ORDER';

  const isApproved = tx.status === 'APPROVED' || tx.status === 'COMPLETED' || (!tx.status && isEarn);
  const isPending  = tx.status === 'PROCESSING' || tx.status === 'PENDING';
  const isExpired  = tx.status === 'EXPIRED' || tx.status === 'CANCELLED';

  // Friendly type labels
  const typeLabel = isEarn   ? '🌱 Quét QR tái chế'
                  : isOrder  ? '🚛 Đặt thu gom'
                  : isRedeem ? '🎁 Đổi phần thưởng'
                  : '💼 Giao dịch';

  // Status labels
  const statusLabel = isApproved ? 'Hoàn thành'
                    : isPending  ? 'Đang xử lý'
                    : isExpired  ? 'Đã hủy'
                    : 'Không rõ';

  // Colors
  const statusColor = isApproved ? Colors.success
                    : isPending  ? '#F59E0B'
                    : Colors.error;

  const amountSign = (isEarn || isOrder) ? '+' : '-';
  const amountColor = (isEarn || isOrder) ? Colors.success : Colors.error;

  // Icon
  const icon: any = isEarn   ? 'qrcode-scan'
                  : isOrder  ? 'truck-delivery'
                  : isRedeem ? 'gift'
                  : 'swap-horizontal';
  const iconBg = isApproved ? Colors.successSurface
               : isPending  ? '#FFF9C4'
               : Colors.errorSurface;
  const iconColor = isApproved ? Colors.success
                  : isPending  ? '#F59E0B'
                  : Colors.error;

  return { isEarn, isRedeem, isOrder, isApproved, isPending, isExpired,
           typeLabel, statusLabel, statusColor, amountSign, amountColor,
           icon, iconBg, iconColor };
}

function groupByDate(txs: any[]): { title: string; data: any[] }[] {
  const map = new Map<string, any[]>();
  txs.forEach(tx => {
    const key = formatDate(tx.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  });
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const { user } = useAuthStore();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'EARN' | 'ORDER' | 'REDEEM'>('all');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, snap => {
      let data = snap.docs.map(doc => {
        const raw = { id: doc.id, ...doc.data() } as any;
        const resolved = TransactionService.evaluateTransaction(raw);
        return {
          ...resolved,
          createdAt: doc.data().createdAt?.toDate?.() ?? new Date(),
        };
      });
      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setTxs(data);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filtered = filter === 'all' ? txs : txs.filter(t => t.type === filter);
  const sections = groupByDate(filtered);

  // Summary stats
  const totalEarned  = txs.filter(t => (t.type === 'EARN' || t.type === 'ORDER') &&
    (t.status === 'APPROVED' || t.status === 'COMPLETED'))
    .reduce((s, t) => s + (t.amount || 0), 0);
  const totalSpent   = txs.filter(t => t.type === 'REDEEM' && (t.status !== 'REJECTED' && t.status !== 'EXPIRED' && t.status !== 'CANCELLED')).reduce((s, t) => s + (t.amount || 0), 0);
  const totalKg      = txs.filter(t => t.kg).reduce((s, t) => s + (t.kg || 0), 0);

  const FILTERS = [
    { key: 'all',    label: 'Tất cả' },
    { key: 'EARN',   label: '🌱 Quét QR' },
    { key: 'ORDER',  label: '🚛 Thu gom' },
    { key: 'REDEEM', label: '🎁 Đổi quà' },
  ] as const;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử hoạt động</Text>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Colors.success }]}>+{totalEarned}</Text>
          <Text style={styles.summaryLabel}>EP Tích lũy</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Colors.error }]}>-{totalSpent}</Text>
          <Text style={styles.summaryLabel}>EP Đã dùng</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Colors.primary }]}>{totalKg.toFixed(1)} kg</Text>
          <Text style={styles.summaryLabel}>Đã tái chế</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key as any)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={72} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Chưa có hoạt động nào</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'all'
              ? 'Bắt đầu quét mã QR tái chế để tích EcoPoints!'
              : filter === 'EARN' ? 'Chưa có lần quét QR nào.'
              : filter === 'ORDER' ? 'Chưa có đơn thu gom nào.'
              : 'Chưa đổi phần thưởng nào.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.primary} onRefresh={() => setRefreshing(true)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionDate}>{section.title}</Text>
          )}
          renderItem={({ item: tx }) => {
            const meta = getTxMeta(tx);
            return (
              <View style={styles.txCard}>
                {/* Icon */}
                <View style={[styles.txIcon, { backgroundColor: meta.iconBg }]}>
                  <MaterialCommunityIcons name={meta.icon} size={22} color={meta.iconColor} />
                </View>

                {/* Info */}
                <View style={styles.txBody}>
                  <Text style={styles.txType}>{meta.typeLabel}</Text>
                  <Text style={styles.txDesc} numberOfLines={2}>
                    {tx.description || 'Giao dịch EcoBack'}
                  </Text>
                  <View style={styles.txMeta}>
                    <Text style={styles.txTime}>{timeAgo(tx.createdAt)}</Text>
                    {tx.kg ? (
                      <View style={styles.kgBadge}>
                        <MaterialCommunityIcons name="leaf" size={10} color={Colors.primary} />
                        <Text style={styles.kgText}>{tx.kg} kg</Text>
                      </View>
                    ) : null}
                    <View style={[styles.statusDot, { backgroundColor: meta.statusColor }]} />
                    <Text style={[styles.statusLabel, { color: meta.statusColor }]}>
                      {meta.statusLabel}
                    </Text>
                  </View>
                </View>

                {/* Amount */}
                <Text style={[
                  styles.txAmount,
                  { color: meta.amountColor, textDecorationLine: meta.isExpired ? 'line-through' : 'none' }
                ]}>
                  {meta.amountSign}{tx.amount || 0} EP
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60, paddingBottom: Spacing.md, paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  summaryBar: {
    flexDirection: 'row', backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    borderRadius: Radius.lg, paddingVertical: Spacing.md,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: FontSize.lg, fontWeight: FontWeight.extraBold },
  summaryLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2, textTransform: 'uppercase' },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, gap: Spacing.xs,
  },
  filterBtn: {
    flex: 1, paddingVertical: 6, alignItems: 'center',
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 11, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  filterTextActive: { color: Colors.white, fontWeight: FontWeight.bold },

  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  sectionDate: {
    fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: FontWeight.semiBold,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingVertical: Spacing.sm, marginTop: Spacing.sm,
  },

  txCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  txIcon: {
    width: 46, height: 46, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  txBody: { flex: 1, gap: 2 },
  txType: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  txDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  txTime: { fontSize: 10, color: Colors.textTertiary },
  kgBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.primarySurface, paddingHorizontal: 5,
    paddingVertical: 2, borderRadius: 6,
  },
  kgText: { fontSize: 10, color: Colors.primary, fontWeight: FontWeight.bold },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: FontWeight.semiBold },
  txAmount: { fontSize: FontSize.md, fontWeight: FontWeight.extraBold, marginLeft: Spacing.sm, minWidth: 50, textAlign: 'right' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center', lineHeight: 20 },
});
