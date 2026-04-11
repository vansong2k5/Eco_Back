import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { FontSize, FontWeight } from '../src/constants/typography';
import { Spacing, Radius } from '../src/constants/spacing';
import { AppButton } from '../src/components/common/AppButton';
import { useAuthStore } from '../src/store/auth.store';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/config/firebase';

export default function CreateRequestScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [kg, setKg] = useState('');
  const [method, setMethod] = useState<'PICKUP' | 'DROPOFF'>('PICKUP');
  
  // Google Maps address emphasis
  const [address, setAddress] = useState(profile?.address || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);

  // Logic: Base 10 EP / kg. If DROPOFF (bring to station), +20% bonus.
  const basePoints = (Number(kg) || 0) * 10;
  const estimatedPoints = method === 'DROPOFF' ? Math.round(basePoints * 1.2) : basePoints;

  const handleSubmit = async () => {
    if (!kg || Number(kg) <= 0) return Alert.alert('Lỗi', 'Vui lòng nhập số kg rác hợp lệ');
    if (method === 'PICKUP' && !address) return Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ Google Maps');
    if (!phone) return Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');

    setLoading(true);
    try {
      // 1. Create the Request in collection_requests
      const reqRef = await addDoc(collection(db, 'collection_requests'), {
        userId: user?.uid,
        userName: profile?.displayName || user?.email,
        kg: Number(kg),
        method,
        address: method === 'PICKUP' ? address : 'Mang đến Trạm thu gom',
        phone,
        status: 'PENDING',
        estimatedPoints,
        createdAt: serverTimestamp(),
      });
      
      // 2. Add Activity Log to transactions so it mirrors to User's History & Admin Logs
      await addDoc(collection(db, 'transactions'), {
        userId: user?.uid,
        type: 'ORDER', 
        amount: estimatedPoints,
        description: `Tạo đơn rác ${kg}kg (${method === 'PICKUP' ? 'Thu gom tận nơi' : 'Mang đến chốt'})`,
        requestId: reqRef.id,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });
      
      Alert.alert(
        'Tạo đơn thành công',
        `Đơn rác ${kg}kg đã được gửi! Bạn dự kiến nhận ${estimatedPoints} EcoPoints.`,
        [{ text: 'Đóng', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tạo đơn lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Tạo Đơn</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitle}>Điền thông tin và chọn phương thức bàn giao rác để tích điểm.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hình thức bàn giao (Quan trọng)</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity 
              style={[styles.methodCard, method === 'PICKUP' && styles.methodCardActive]} 
              onPress={() => setMethod('PICKUP')}
            >
              <MaterialCommunityIcons name="truck-delivery" size={24} color={method === 'PICKUP' ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.methodText, method === 'PICKUP' && styles.methodTextActive]}>Thu tận nơi</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.methodCard, method === 'DROPOFF' && styles.methodCardActive]} 
              onPress={() => setMethod('DROPOFF')}
            >
              <View style={styles.badgeTop}><Text style={styles.badgeTopText}>+20% Điểm</Text></View>
              <MaterialCommunityIcons name="store-marker" size={24} color={method === 'DROPOFF' ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.methodText, method === 'DROPOFF' && styles.methodTextActive]}>Tự mang đến</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số lượng rác dự kiến (Kg)</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="weight" size={20} color={Colors.primary} />
            <TextInput style={styles.input} placeholder="VD: 5" value={kg} onChangeText={setKg} keyboardType="numeric" />
          </View>
          {Number(kg) > 0 && (
            <Text style={styles.rewardHint}>
              👉 Quy đổi quy định: Base = {basePoints} EP {method === 'DROPOFF' && <Text style={{color: Colors.secondary}}>+ {basePoints * 0.2} EP Thưởng </Text>}
              {'\n'}🎉 Dự kiến bạn sẽ nhận: <Text style={{fontWeight: 'bold', color: Colors.success, fontSize: 16}}>{estimatedPoints} EcoPoints</Text>
            </Text>
          )}
        </View>

        {method === 'PICKUP' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa chỉ lấy rác (Gắn Google Map locator)</Text>
            <View style={[styles.inputWrapper, { borderColor: Colors.secondary }]}>
              <MaterialCommunityIcons name="google-maps" size={20} color={Colors.secondary} />
              <TextInput
                style={styles.input}
                placeholder="Số nhà, Tên Đường, Phường, Quận, TP"
                value={address}
                onChangeText={setAddress}
              />
            </View>
            <Text style={{fontSize: 11, color: Colors.textTertiary, marginTop: 4}}>
              * Gợi ý: Nhập chính xác cú pháp địa chỉ Google Maps để tự động tọa độ hóa.
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số điện thoại liên hệ</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="phone-outline" size={20} color={Colors.textTertiary} />
            <TextInput style={styles.input} placeholder="Nhập SĐT của bạn" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
        </View>

        <AppButton title="Xác nhận tạo đơn" onPress={handleSubmit} isLoading={loading} style={{ marginTop: Spacing.md }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  content: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  backBtn: { padding: Spacing.xs },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#1C2E20' },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 22 },
  card: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: Radius.lg, elevation: 2 },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  input: { flex: 1, paddingVertical: Spacing.md, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.textPrimary },
  rewardHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 20 },
  methodRow: { flexDirection: 'row', gap: Spacing.md },
  methodCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, position: 'relative' },
  methodCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  methodText: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.textSecondary, marginTop: Spacing.xs },
  methodTextActive: { color: Colors.white },
  badgeTop: { position: 'absolute', top: -10, right: -10, backgroundColor: Colors.secondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, zIndex: 2 },
  badgeTopText: { fontSize: 9, color: Colors.white, fontWeight: 'bold' }
});
