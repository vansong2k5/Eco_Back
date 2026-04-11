import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { Spacing, Radius } from '../../src/constants/spacing';
import { timeAgo } from '../../src/utils/formatters';

export default function OrdersScreen() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // We fetch without orderBy first to avoid needing composite index, 
    // sorting array client-side.
    const q = query(collection(db, 'collection_requests'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      let data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setOrders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.methodBadge}>
          <MaterialCommunityIcons 
            name={item.method === 'DROPOFF' ? 'store-marker' : 'truck-delivery'} 
            size={16} color={Colors.white} 
          />
          <Text style={styles.methodText}>
            {item.method === 'DROPOFF' ? 'Tự mang đến' : 'Thu tận nơi'}
          </Text>
        </View>
        <Text style={[styles.statusText, item.status === 'COMPLETED' ? {color: Colors.success} : {}]}>
          {item.status === 'PENDING' ? 'Đang chờ' : item.status === 'COMPLETED' ? 'Hoàn tất' : item.status}
        </Text>
      </View>
      
      <Text style={styles.orderTitle}>Đơn tái chế {item.kg} Kg</Text>
      <Text style={styles.orderDate}>{timeAgo(item.createdAt)}</Text>
      
      {item.method === 'PICKUP' && (
        <Text style={styles.orderAddress} numberOfLines={2}>
          📍 {item.address}
        </Text>
      )}

      <View style={styles.rewardBox}>
        <Text style={styles.rewardLabel}>Dự kiến nhận:</Text>
        <Text style={styles.rewardValue}>+{item.estimatedPoints} EP</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Đơn của bạn</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 50}} />
      ) : orders.length === 0 ? (
        <View style={styles.content}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={80} color={Colors.textTertiary} />
          <Text style={styles.title}>Chưa có đơn nào</Text>
          <Text style={styles.subtitle}>Bạn chưa tạo đơn nào. Hãy tạo đơn để nhân viên thu gom hệ thống ghi nhận và cộng điểm rác của bạn.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  
  listContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  orderCard: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: Radius.lg, elevation: 1 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  methodBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, gap: 4 },
  methodText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  statusText: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.secondary },
  orderTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  orderDate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: Spacing.sm },
  orderAddress: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md, backgroundColor: Colors.background, padding: Spacing.sm, borderRadius: Radius.md },
  rewardBox: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.background, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  rewardLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  rewardValue: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.success }
});
