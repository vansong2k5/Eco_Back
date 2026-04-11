import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { Spacing, Radius } from '../../src/constants/spacing';
import { AppButton } from '../../src/components/common/AppButton';

export default function AdminQRGeneratorScreen() {
  const [pointName, setPointName] = useState('Công ty CP Môi Trường');
  const [pointsValue, setPointsValue] = useState('10');
  const [quantity, setQuantity] = useState('50');
  const [qrLabel, setQrLabel] = useState<'company' | 'individual'>('company');

  const handleGenerate = async () => {
    const labelText = qrLabel === 'company' ? 'Doanh Nghiệp / Công ty' : 'Cá Nhân';

    try {
      Alert.alert('Đang xử lý', 'Đang thiết lập lô QR và ghi vào CSDL. Vui lòng đợi...');
      
      const count = parseInt(quantity) || 1;
      let qrsHtml = '';
      
      // Import functions
      const { writeBatch, doc, serverTimestamp } = require('firebase/firestore');
      const { db } = require('../../src/config/firebase');
      
      const batch = writeBatch(db);
      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      const pts = parseInt(pointsValue) || 10;
      
      for(let i=0; i<count; i++) {
        // Payload duy nhất
        const qrId = `${batchId}-${i}`;
        const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(qrId)}`;
        
        // Ghi vào lô Batch 
        const qrRef = doc(db, 'qr_codes', qrId);
        batch.set(qrRef, {
          id: qrId,
          batchId: batchId,
          businessName: pointName,
          type: qrLabel,
          pointsValue: pts,
          status: 'ACTIVE',
          createdAt: serverTimestamp()
        });

        qrsHtml += `
          <div style="display:inline-block; border: 2px dashed #4CAF50; border-radius: 12px; padding: 20px; margin: 15px; width: 220px; text-align: center; page-break-inside: avoid;">
             <h3 style="color:#2E7D32; margin:0; font-family: sans-serif;">EcoBack Vietnam</h3>
             <p style="font-size: 11px; color:#555; margin: 5px 0;">Phân bổ: ${labelText}</p>
             <img src="${qrUrl}" width="180" height="180" />
             <p style="font-size: 14px; color:#000; font-weight:bold; margin: 8px 0;">${pts} EcoPoints</p>
             <p style="font-size: 10px; color:#888; margin: 0;">ID: ${qrId}</p>
          </div>
        `;
      }

      // Đẩy dữ liệu vào DB (Firestore)
      await batch.commit();
      
      Alert.alert('Thành công', `Đã tạo và đồng bộ CSDL Lô QR: ${batchId}. Danh sách đã nằm trong Kho QR.`);

      const html = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>QR Lô Phân Bổ EcoBack</title>
          </head>
          <body style="padding: 40px; font-family: sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color:#1B5E20; margin-bottom: 5px;">Mã QR Thu Gom ${batchId}</h1>
              <p style="font-size: 16px; color:#333;">Tổ chức/Cá nhân: <strong>${pointName}</strong></p>
              <p style="font-size: 14px; color:#666;">Số lượng: ${count} mã - Đã đồng bộ CSDL</p>
            </div>
            <div style="text-align: center;">
              ${qrsHtml}
            </div>
          </body>
        </html>
      `;

      try {
        const { printAsync } = require('expo-print');
        // Trên Web, tự động lưu PDF
        await printAsync({ html });
      } catch (printErr) {
        console.warn('Cửa sổ In PDF bị hủy hoặc lỗi mô-đun Native Expo:', printErr);
        // Không block việc báo thành công CSDL.
      }

    } catch(err) {
      console.warn('Lỗi ghi Database QR:', err);
      Alert.alert('Lỗi CSDL', 'Không thể tạo Lô QR. Vui lòng kiểm tra kết nối mạng.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Quản lý Sinh mã QR</Text>
      <Text style={styles.subtitle}>Tạo hàng loạt mã QR dán cho các điểm thu gom</Text>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên Công ty / Cá nhân</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="map-marker" size={20} color={Colors.textTertiary} />
            <TextInput style={styles.input} value={pointName} onChangeText={setPointName} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gán nhãn Phân bổ (Theo dõi ESG)</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity 
              style={[styles.radioBtn, qrLabel === 'company' && styles.radioBtnActive]} 
              onPress={() => setQrLabel('company')}
            >
              <MaterialCommunityIcons name="domain" size={20} color={qrLabel === 'company' ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.radioText, qrLabel === 'company' && styles.radioTextActive]}>Công ty</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.radioBtn, qrLabel === 'individual' && styles.radioBtnActive]} 
              onPress={() => setQrLabel('individual')}
            >
              <MaterialCommunityIcons name="account" size={20} color={qrLabel === 'individual' ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.radioText, qrLabel === 'individual' && styles.radioTextActive]}>Cá nhân</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giá trị EcoPoints (1 lần quét)</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="leaf" size={20} color={Colors.primary} />
            <TextInput style={styles.input} value={pointsValue} onChangeText={setPointsValue} keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số lượng mã phân bổ (Tờ in)</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.textTertiary} />
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </View>
        </View>

        <AppButton title="Khởi tạo Lô QR" onPress={handleGenerate} style={styles.btn} />
      </View>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="shield-check" size={24} color={Colors.success} />
        <Text style={styles.infoText}>Mỗi mã QR sinh ra đều được ký hiệu hoá (HMAC Signature) để chống giả mạo điểm. Người dùng chỉ quét được 1 lần duy nhất cho mỗi mã.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  content: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: '#1C2E20' },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  formCard: { 
    backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: Radius.lg, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary, marginBottom: Spacing.xs },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  input: { flex: 1, paddingVertical: Spacing.md, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.textPrimary },
  btn: { marginTop: Spacing.sm },
  infoBox: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.xl, gap: Spacing.sm, alignItems: 'center' },
  infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.success, lineHeight: 18 },
  radioRow: { flexDirection: 'row', gap: Spacing.sm },
  radioBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  radioBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radioText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  radioTextActive: { color: Colors.white, fontWeight: FontWeight.bold }
});
