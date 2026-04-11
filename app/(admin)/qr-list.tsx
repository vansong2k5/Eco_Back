import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { Spacing, Radius } from '../../src/constants/spacing';
import { timeAgo } from '../../src/utils/formatters';

export default function AdminQRListScreen() {
  const [loading, setLoading] = useState(true);
  const [qrList, setQrList] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CONSUMED'>('ALL');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    const fetchQRs = async () => {
      try {
        const q = query(collection(db, 'qr_codes'), orderBy('createdAt', 'desc'), limit(300));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQrList(data);
      } catch (err) {
        console.warn('Lỗi lấy danh mục QR:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQRs();
  }, []);

  const filteredList = qrList.filter(qr => filter === 'ALL' || qr.status === filter);
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const paginatedList = filteredList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Danh mục Điểm QR</Text>
      <Text style={styles.subtitle}>Kiểm soát tình trạng mã đã phát hành</Text>

      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterBtn, filter === 'ALL' && styles.filterActive]} onPress={() => { setFilter('ALL'); setPage(1); }}>
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>Tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, filter === 'ACTIVE' && styles.filterActive]} onPress={() => { setFilter('ACTIVE'); setPage(1); }}>
          <Text style={[styles.filterText, filter === 'ACTIVE' && styles.filterTextActive]}>Chưa quét</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, filter === 'CONSUMED' && styles.filterActive]} onPress={() => { setFilter('CONSUMED'); setPage(1); }}>
          <Text style={[styles.filterText, filter === 'CONSUMED' && styles.filterTextActive]}>Đã quét</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : filteredList.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="qrcode-remove" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Chưa có mã QR nào trong mục này.</Text>
        </View>
      ) : (
        <>
          <View style={styles.list}>
            {paginatedList.map((qr) => {
              const isConsumed = qr.status === 'CONSUMED';
              const isExpired = qr.status === 'EXPIRED';
              const isActive = qr.status === 'ACTIVE';

              return (
                <View key={qr.id} style={styles.qrCard}>
                  <View style={[styles.qrIcon, { 
                    backgroundColor: isConsumed ? Colors.successSurface : isActive ? '#E3F2FD' : Colors.errorSurface 
                  }]}>
                    <MaterialCommunityIcons 
                      name={isConsumed ? 'qrcode-scan' : isActive ? 'qrcode' : 'qrcode-remove'} 
                      size={24} 
                      color={isConsumed ? Colors.success : isActive ? '#1976D2' : Colors.error} 
                    />
                  </View>
                  <View style={styles.qrInfo}>
                    <Text style={styles.qrDesc} numberOfLines={1}>{qr.businessName || 'Không tên'}</Text>
                    <Text style={styles.qrDetails}>Batch: {qr.batchId} | Nhãn: {qr.type === 'company' ? 'Công ty' : 'Cá nhân'}</Text>
                    <View style={styles.qrFooter}>
                      <Text style={styles.qrDate}>{qr.createdAt ? timeAgo(qr.createdAt) : 'Gần đây'}</Text>
                      
                      <Text style={[styles.statusBadge, 
                        isConsumed ? styles.badgeSuccess : isActive ? styles.badgeActive : styles.badgeError]}>
                        {isConsumed ? 'ĐÃ QUÉT' : isActive ? 'CHƯA QUÉT' : 'HẾT HẠN'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.qrPoints}>{qr.pointsValue} EP</Text>
                </View>
              )
            })}
          </View>
          
          <View style={styles.pagination}>
            <TouchableOpacity 
              style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} 
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color={page === 1 ? Colors.textTertiary : Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pageText}>Trang {page} / {totalPages}</Text>
            <TouchableOpacity 
              style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} 
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <MaterialCommunityIcons name="chevron-right" size={24} color={page === totalPages ? Colors.textTertiary : Colors.primary} />
            </TouchableOpacity>
          </View>
        </>
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
  qrCard: { flexDirection: 'row', backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.lg, elevation: 1, alignItems: 'center' },
  qrIcon: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  qrInfo: { flex: 1 },
  qrDesc: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  qrDetails: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  qrFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: Spacing.sm },
  qrDate: { fontSize: FontSize.xs, color: Colors.textTertiary },
  statusBadge: { fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold', overflow: 'hidden' },
  badgeActive: { backgroundColor: '#E3F2FD', color: '#1976D2' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: Colors.success },
  badgeError: { backgroundColor: '#FFEBEE', color: Colors.error },
  qrPoints: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary, marginLeft: Spacing.md },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  filterBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl, gap: Spacing.lg },
  pageBtn: { padding: Spacing.xs, backgroundColor: Colors.white, borderRadius: Radius.full, elevation: 1 },
  pageBtnDisabled: { opacity: 0.5 },
  pageText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary }
});
