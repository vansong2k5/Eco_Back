import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
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

  const fetchHistory = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUpdateStatus = async (tx: Transaction, newStatus: string) => {
    Alert.alert('Xác nhận', `Bạn có chắc chắn ${newStatus === 'APPROVED' ? 'Duyệt' : 'Từ chối'} giao dịch này?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đồng ý', onPress: async () => {
           try {
             if (newStatus === 'APPROVED') {
               // Chạy Atomic Transaction để cộng điểm an toàn
               import('firebase/firestore').then(async ({ runTransaction, doc, Timestamp }) => {
                 await runTransaction(db, async (t) => {
                   const txRef = doc(db, 'transactions', tx.id);
                   const userRef = doc(db, 'users', tx.userId);
                   
                   const userSnap = await t.get(userRef);
                   
                   const userData = userSnap.exists() ? userSnap.data() : null;
                   
                   t.update(txRef, { 
                     status: newStatus,
                     approvedAt: Timestamp.now()
                   });

                   if (userData) {
                     // Nâng cấp số liệu user nếu user tồn tại
                     let finalPoints = userData.ecoPoints || 0;
                     if (tx.type === 'EARN' || tx.type === 'ORDER') {
                        finalPoints += (tx.amount || 0);
                     }
                     let finalRecycled = userData.totalRecycled || 0;
                     if (tx.kg) {
                        finalRecycled += tx.kg;
                     }
                     
                     t.update(userRef, {
                       ecoPoints: finalPoints,
                       totalRecycled: finalRecycled
                     });
                   }
                 });
                 Alert.alert('Thành công', 'Đã duyệt giao dịch thành công (các thông số hợp lệ đã được cộng)!');
                 fetchHistory();
               }).catch(e => {
                 console.warn(e);
                 Alert.alert('Lỗi', 'Không thể hoàn tất Transaction.');
               });
             } else {
               // Từ chối (Cancelled): Chỉ cần đổi trạng thái thành CANCELLED
               import('firebase/firestore').then(async ({ updateDoc, doc, Timestamp }) => {
                 await updateDoc(doc(db, 'transactions', tx.id), { status: newStatus });
                 Alert.alert('Đã từ chối', 'Giao dịch đã được hủy.');
                 fetchHistory();
               });
             }
           } catch(e) {
             console.warn(e);
             Alert.alert('Lỗi', 'Không thể thao tác lúc này.');
           }
      }}
    ]);
  };

  const handleCheckRisk = (tx: Transaction) => {
    let riskScore = 0;
    let issues = [];
    const safeAmount = tx.amount || 0;
    
    if (safeAmount > 100) {
      riskScore += 50;
      issues.push(`Lượng điểm thưởng quá cao bất thường (${safeAmount} EP).`);
    }
    if (tx.kg && tx.kg > 20) {
      riskScore += 40;
      issues.push(`Dữ liệu khối lượng khai khống lớn (> 20kg).`);
    }
    if (!tx.qrId && tx.type === 'EARN') {
      riskScore += 90;
      issues.push("Giao dịch phát sinh điểm mờ, không gắn QR vật lý hợp lệ.");
    }
    if (tx.description?.toLowerCase().includes('test')) {
      riskScore += 20;
      issues.push("Hành vi test thử công cụ hệ thống.");
    }

    if (riskScore < 30) {
      Alert.alert('Kết quả quét', '✅ An toàn: Không phát hiện dấu hiệu lừa đảo hoặc trục lợi mờ ám.');
    } else {
      Alert.alert(`⚠️ Nguy cơ Fraud (${riskScore}%)`, `Cảnh báo bất thường:\n- ${issues.join('\n- ')}\n\n💡 Đề xuất: Click "Từ chối" để Block tiến trình của User.`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Quản lý Đổi Quà & Hoạt Động</Text>
      <Text style={styles.subtitle}>Kiểm duyệt tự động & Nhận diện rủi ro Fraud</Text>

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
            const isApproved = resolvedTx.status === 'APPROVED' || resolvedTx.status === 'COMPLETED';
            const isExpired = resolvedTx.status === 'EXPIRED' || resolvedTx.status === 'CANCELLED';

            const iconBgColor = isApproved ? Colors.successSurface : isPending ? '#FFF9C4' : Colors.errorSurface;
            const iconColor = isApproved ? Colors.success : isPending ? '#FBC02D' : Colors.error;
            const amountColor = isApproved ? Colors.success : isPending ? '#FBC02D' : Colors.error;

            return (
            <View key={resolvedTx.id} style={styles.txCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
              
              {isPending && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.btnAccept]} onPress={() => handleUpdateStatus(resolvedTx, 'APPROVED')}>
                    <MaterialCommunityIcons name="check" size={12} color={Colors.white} />
                    <Text style={styles.actionText}>Duyệt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.btnReject]} onPress={() => handleUpdateStatus(resolvedTx, 'CANCELLED')}>
                    <MaterialCommunityIcons name="close" size={12} color={Colors.white} />
                    <Text style={styles.actionText}>Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.btnRisk]} onPress={() => handleCheckRisk(resolvedTx)}>
                    <MaterialCommunityIcons name="shield-alert-outline" size={12} color={Colors.white} />
                    <Text style={styles.actionText}>Scan Fraud</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  txCard: { backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.lg, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
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
  txAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.extraBold, marginLeft: Spacing.md, alignSelf: 'center', position: 'absolute', right: Spacing.md, top: Spacing.md },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.background, paddingTop: Spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.sm, gap: 4, flex: 1, justifyContent: 'center' },
  btnAccept: { backgroundColor: Colors.success },
  btnReject: { backgroundColor: Colors.error },
  btnRisk: { backgroundColor: '#1C2E20' },
  actionText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' }
});
