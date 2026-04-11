import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { Spacing, Radius } from '../../src/constants/spacing';
import { useAuthStore } from '../../src/store/auth.store';
import { AppButton } from '../../src/components/common/AppButton';
import { collection, getCountFromServer, getAggregateFromServer, sum } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useRouter } from 'expo-router';
import { TransactionService } from '../../src/services/transaction.service';

export default function AdminDashboardScreen() {
  const { profile, logout } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, issuedPoints: 0, totalRecycled: 0, co2Saved: 0, fraudCount: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartFilter, setChartFilter] = useState<'all' | 'company' | 'individual'>('all');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersRef = collection(db, 'users');
        const countSnap = await getCountFromServer(usersRef);
        const usersCount = countSnap.data().count || 0;

        import('firebase/firestore').then(async ({ getDocs, collection }) => {
           let totalKg = 0;
           let validIssuedPoints = 0;
           let monthlyTotals = Array(6).fill(0); // [Tháng hiện tại - 5, ..., Tháng hiện tại]
           const currentMonth = new Date().getMonth();
           
           let fraudMap = new Map<string, number>();
           
           const txSnap = await getDocs(collection(db, 'transactions'));
           
           txSnap.forEach(doc => {
             const rawTx = { id: doc.id, ...doc.data() } as any;
             const parsedTx = TransactionService.evaluateTransaction(rawTx);

             let riskTraits = 0;
             const safeAmount = parsedTx.amount || 0;

             if (parsedTx.status === 'APPROVED' || parsedTx.status === 'COMPLETED') {
                if (parsedTx.type === 'EARN' || parsedTx.type === 'ORDER') {
                   validIssuedPoints += safeAmount;
                }
                if (parsedTx.kg) {
                   totalKg += parsedTx.kg;
                }
             }

             // Check Fraud signals
             if (safeAmount > 100) riskTraits += 1;
             if (parsedTx.kg && parsedTx.kg > 20) riskTraits += 1;
             if (!parsedTx.qrId && parsedTx.type === 'EARN') riskTraits += 2;
             if (parsedTx.status === 'EXPIRED' || parsedTx.status === 'CANCELLED') riskTraits += 1;
             
             if (riskTraits > 0 && parsedTx.userId) {
                fraudMap.set(parsedTx.userId, (fraudMap.get(parsedTx.userId) || 0) + riskTraits);
             }

             if (parsedTx.createdAt) {
               const docDate = (parsedTx.createdAt as any).toDate ? (parsedTx.createdAt as any).toDate() : new Date(parsedTx.createdAt);
               let monthDiff = currentMonth - docDate.getMonth();
               if (monthDiff < 0) monthDiff += 12;
               
               if (monthDiff < 6) {
                 monthlyTotals[5 - monthDiff] += (parsedTx.kg || 0);
               }
             }
           });

           let fraudUsers = 0;
           fraudMap.forEach(score => {
             if (score >= 2) fraudUsers++;
           });

           setStats({
             totalUsers: usersCount,
             issuedPoints: validIssuedPoints,
             totalRecycled: totalKg,
             co2Saved: totalKg * 2.5,
             fraudCount: fraudUsers
           });

           // Format ra giao diện
           const newChartData = monthlyTotals.map((val, idx) => {
             let labelMonth = currentMonth - 5 + idx;
             if (labelMonth < 0) labelMonth += 12;
             return {
               label: `T${labelMonth + 1}`,
               value: val,
               height: val === 0 ? '5%' : `${Math.min(Math.max((val / 50) * 100, 10), 100)}%`
             };
           });
           setChartData(newChartData);
        });

      } catch (error) {
        console.warn('Lỗi lấy thống kê:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch(e) {
      console.log('Logout error', e);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản trị hệ thống</Text>
          <Text style={styles.subtitle}>Xin chào, {profile?.displayName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Chỉ số ESG & Rác thải</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.cardRow}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="leaf" size={28} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats.totalRecycled}</Text>
            <Text style={styles.statDesc}>Kg Rác tái chế</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="cloud-check" size={28} color="#03A9F4" />
            <Text style={styles.statNumber}>{stats.co2Saved.toFixed(1)} Kg</Text>
            <Text style={styles.statDesc}>CO2 Giảm thải</Text>
          </View>
        </View>
      )}

      <View style={styles.fullCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Xu hướng Tái chế (6 tháng qua)</Text>
        </View>
        
        {/* Toggle Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterChip, chartFilter === 'all' && styles.filterChipActive]} 
            onPress={() => setChartFilter('all')}
          >
            <Text style={[styles.filterText, chartFilter === 'all' && styles.filterTextActive]}>Toàn hệ thống</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, chartFilter === 'company' && styles.filterChipActive]} 
            onPress={() => setChartFilter('company')}
          >
            <Text style={[styles.filterText, chartFilter === 'company' && styles.filterTextActive]}>Công ty</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, chartFilter === 'individual' && styles.filterChipActive]} 
            onPress={() => setChartFilter('individual')}
          >
            <Text style={[styles.filterText, chartFilter === 'individual' && styles.filterTextActive]}>Cá nhân</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartContainer}>
          {chartData.length > 0 ? chartData.map((item, index) => (
            <View key={index} style={styles.barWrapper}>
              <Text style={styles.barValue}>{item.value}</Text>
              <View style={[styles.bar, { height: item.height as `${number}%` }]} />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          )) : <ActivityIndicator size="small" /> }
        </View>

        <AppButton 
          title={`Xuất báo cáo ESG (${chartFilter === 'all' ? 'Tổng hợp' : chartFilter === 'company' ? 'Doanh Nghiệp' : 'Cá Nhân'})`} 
          variant="secondary" 
          size="sm" 
          onPress={() => Alert.alert('Đang xuất báo cáo', 'File PDF báo cáo ESG đang được tạo và sẽ tải xuống ngay.')} 
          style={{marginTop: Spacing.lg}} 
        />
      </View>

      <Text style={styles.sectionTitle}>Quản lý Fraud Detection</Text>
      
      <View style={styles.fullCard}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="shield-alert-outline" size={24} color={Colors.error} />
          <Text style={[styles.cardTitle, { color: Colors.error }]}>Cảnh báo Bất thường</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tổng người dùng:</Text>
          <Text style={styles.statValue}>{loading ? '...' : stats.totalUsers}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>EcoPoints đã phát hành:</Text>
          <Text style={[styles.statValue, { color: Colors.success }]}>{loading ? '...' : stats.issuedPoints.toLocaleString()}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tài khoản nghi ngờ (Fraud):</Text>
          <Text style={[styles.statValue, { color: Colors.error }]}>{loading ? '...' : stats.fraudCount} tài khoản</Text>
        </View>
        <AppButton title="Xem danh sách đen" variant="outline" size="sm" onPress={() => {}} style={{marginTop: Spacing.md}} />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  content: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: '#1C2E20' },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4 },
  logoutBtn: { backgroundColor: '#1C2E20', padding: Spacing.sm, borderRadius: Radius.full },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#1C2E20', marginBottom: Spacing.md, marginTop: Spacing.md },
  cardRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: { 
    flex: 1, backgroundColor: Colors.white, padding: Spacing.md, 
    borderRadius: Radius.lg, alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  statNumber: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, color: '#1C2E20', marginVertical: Spacing.xs },
  statDesc: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase' },
  fullCard: { 
    backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: Radius.lg, elevation: 2,
    marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.background },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#1C2E20' },
  statValueError: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.error },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  filterTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180, marginTop: Spacing.sm, paddingHorizontal: Spacing.sm },
  barWrapper: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: 30, backgroundColor: Colors.primary, borderRadius: 6, marginVertical: Spacing.xs },
  barLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.xs },
  barValue: { fontSize: 10, color: Colors.textPrimary, fontWeight: FontWeight.bold },
});
