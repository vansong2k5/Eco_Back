import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { Spacing, Radius } from '../../src/constants/spacing';
import { timeAgo, formatPoints } from '../../src/utils/formatters';
import { TransactionService } from '../../src/services/transaction.service';
import { Transaction } from '../../src/types/models';

export default function AdminHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistory(data);
      } catch (err) {
        console.warn('Lỗi lấy lịch sử admin:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Quản lý Đổi Quà & Hoạt Động</Text>
      <Text style={styles.subtitle}>Nhật ký logic của hệ thống (Nhận điểm / Đổi quà)</Text>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : history.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Chưa có lịch sử giao dịch nào.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {history.map((tx) => {
            const rawTx = tx as Transaction;
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
            <View key={resolvedTx.id} style={styles.txCard}>
              <View style={[styles.txIcon, { backgroundColor: iconBgColor }]}>
                <MaterialCommunityIcons 
                  name={isEarn ? 'qrcode-scan' : isOrder ? 'truck-delivery' : 'gift'} 
                  size={24} 
                  color={iconColor} 
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc} numberOfLines={2}>{resolvedTx.description}</Text>
                <Text style={styles.txUser}>User: {resolvedTx.userId?.substring(0, 8)} | Code: #{resolvedTx.id?.substring(0, 5).toUpperCase()}</Text>
                {resolvedTx.kg && <Text style={styles.txUser}>Trọng lượng: {resolvedTx.kg} kg</Text>}
                <View style={styles.txFooter}>
                  <Text style={styles.txDate}>{resolvedTx.createdAt ? timeAgo(resolvedTx.createdAt) : 'Gần đây'}</Text>
                  
                  <Text style={[styles.statusBadge, isPending ? styles.badgePending : isApproved ? styles.badgeSuccess : styles.badgeError]}>
                    {isApproved ? '🟢 BÌNH THƯỜNG' : isPending ? '🟡 ĐANG XỬ LÝ' : '🔴 BỊ HỦY'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.txAmount, { 
                 color: amountColor,
                 textDecorationLine: isExpired ? 'line-through' : 'none'
              }]}>
                {isEarn ? '+' : (isOrder ? '+' : '-')}{formatPoints(resolvedTx.amount || 0)} EP
              </Text>
            </View>
          )})}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  content: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: '#1C2E20' },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, backgroundColor: Colors.white, borderRadius: Radius.lg },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  list: { gap: Spacing.md },
  txCard: { flexDirection: 'row', backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.lg, elevation: 2, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  txIcon: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  txInfo: { flex: 1 },
  txDesc: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  txUser: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  txFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: Spacing.sm },
  txDate: { fontSize: FontSize.xs, color: Colors.textTertiary },
  statusBadge: { fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold', overflow: 'hidden' },
  badgePending: { backgroundColor: '#FFF3E0', color: '#E65100' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: Colors.success },
  badgeError: { backgroundColor: '#FFEBEE', color: Colors.error },
  txAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.extraBold, marginLeft: Spacing.md },
});
