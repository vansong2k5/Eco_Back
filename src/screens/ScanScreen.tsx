import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Alert, ImageBackground } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppButton } from '@src/components/common/AppButton';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Spacing, Radius } from '@src/constants/spacing';
import { useAuthStore } from '@src/store/auth.store';
import { redeemQRCode } from '@src/services/qr.service';

type ScanStatus = 'idle' | 'loading' | 'success' | 'already_used' | 'error';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scannedData, setScannedData] = useState<{ points?: number; message?: string } | null>(null);
  const isProcessing = useRef(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const { user } = useAuthStore();

  const showResult = (status: ScanStatus, data?: { points?: number; message?: string }) => {
    setScanStatus(status);
    setScannedData(data ?? null);
    // Animate result card in
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    // Debounce: don't reprocess while already handling
    if (isProcessing.current || scanStatus !== 'idle') return;
    isProcessing.current = true;

    setScanStatus('loading');

    try {
      const result = await redeemQRCode(data, user?.uid ?? '');

      if (result.success) {
        showResult('success', { points: result.data.pointsEarned });
      } else if (result.error?.code === 'already_used') {
        showResult('already_used', { message: result.error.message });
      } else {
        showResult('error', { message: result.error?.message ?? 'Lỗi xảy ra, thử lại.' });
      }
    } catch (e) {
      showResult('error', { message: 'Không kết nối được server. Vui lòng thử lại.' });
    }

    isProcessing.current = false;
  };

  const resetScan = () => {
    setScanStatus('idle');
    setScannedData(null);
    scaleAnim.setValue(0);
  };

  if (!permission) return <View style={styles.loadingContainer} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off" size={64} color={Colors.textTertiary} />
        <Text style={styles.permissionTitle}>Cần quyền Camera</Text>
        <Text style={styles.permissionSubtitle}>
          Cho phép EcoBack sử dụng camera để quét mã QR thu gom rác
        </Text>
        <AppButton title="Cấp quyền Camera" onPress={requestPermission} style={styles.permissionBtn} />
      </View>
    );
  }

  const isScanning = scanStatus === 'idle' || scanStatus === 'loading';

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={styles.overlay}>
        {/* Top */}
        <View style={styles.topSection}>
          <Text style={styles.title}>Quét Mã QR Thu Gom</Text>
          <Text style={styles.subtitle}>Di chuyển camera đến mã QR tại điểm thu gom</Text>
        </View>

        {/* Scan Frame */}
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          {scanStatus === 'loading' && (
            <View style={styles.scanningIndicator}>
              <Text style={styles.scanningText}>Đang xử lý...</Text>
            </View>
          )}
        </View>

        {/* Bottom Result Area */}
        <View style={styles.bottomSection}>
          {scanStatus === 'idle' && (
            <View style={styles.hintCard}>
              <MaterialCommunityIcons name="information-outline" size={20} color={Colors.white} />
              <Text style={styles.hintText}>Đặt mã QR vào khung quét</Text>
            </View>
          )}

          {scanStatus === 'loading' && (
            <View style={styles.hintCard}>
              <MaterialCommunityIcons name="loading" size={20} color={Colors.white} />
              <Text style={styles.hintText}>Đang kiểm tra mã QR...</Text>
            </View>
          )}

          {scanStatus === 'success' && (
            <Animated.View style={[styles.resultCardContainer, { transform: [{ scale: scaleAnim }] }]}>
              <ImageBackground 
                source={{ uri: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=600&auto=format&fit=crop' }} 
                style={styles.greenBg} 
                imageStyle={{ borderRadius: Radius.xl, opacity: 0.8 }}
              >
                <View style={styles.resultCardOverlay}>
                  <MaterialCommunityIcons name="check-decagram" size={60} color={Colors.white} />
                  <Text style={styles.resultTitleSuccess}>🎉 Tuyệt vời!</Text>
                  
                  <View style={styles.pointsBadgeWrapper}>
                    <Text style={styles.resultPointsBadge}>+{scannedData?.points ?? 20} EP</Text>
                  </View>
                  
                  <Text style={styles.resultSubtitleSuccess}>Bạn vừa giúp giảm phát thải thêm một lượng CO2 vào môi trường.</Text>
                  
                  <View style={styles.statsRow}>
                    <MaterialCommunityIcons name="recycle" size={20} color={Colors.white} />
                    <Text style={styles.statsText}>Đây là lần tái chế thứ <Text style={{fontWeight:'bold', color: Colors.warning}}>1,541</Text> của chiếc hộp này!</Text>
                  </View>

                  <AppButton title="Quét tiếp" onPress={resetScan} style={styles.rescanBtn} variant="secondary" />
                </View>
              </ImageBackground>
            </Animated.View>
          )}

          {scanStatus === 'already_used' && (
            <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
              <MaterialCommunityIcons name="qrcode-remove" size={52} color={Colors.warning} />
              <Text style={styles.resultTitle}>Mã đã dùng</Text>
              <Text style={styles.resultSubtitle}>Mã QR này đã được quét trước đó</Text>
              <AppButton title="Quét mã khác" variant="outline" onPress={resetScan} style={styles.rescanBtn} />
            </Animated.View>
          )}

          {scanStatus === 'error' && (
            <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
              <MaterialCommunityIcons name="alert-circle" size={52} color={Colors.error} />
              <Text style={styles.resultTitle}>Không hợp lệ</Text>
              <Text style={styles.resultSubtitle}>{scannedData?.message ?? 'Mã QR không hợp lệ hoặc đã hết hạn'}</Text>
              <AppButton title="Thử lại" variant="outline" onPress={resetScan} style={styles.rescanBtn} />
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: Colors.background },
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: Spacing.xl, backgroundColor: Colors.background, gap: Spacing.lg,
  },
  permissionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  permissionSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  permissionBtn: { marginTop: Spacing.lg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'space-between' },
  topSection: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white, textAlign: 'center' },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: Spacing.sm },
  scanFrame: { width: 250, height: 250, alignSelf: 'center', backgroundColor: 'transparent', position: 'relative' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#4CAF50', backgroundColor: 'transparent' },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 8 },
  scanningIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(46,125,50,0.2)', borderRadius: 8 },
  scanningText: { color: Colors.white, fontWeight: FontWeight.semiBold, fontSize: FontSize.sm },
  bottomSection: { padding: Spacing.xl, paddingBottom: 40 },
  resultCardContainer: {
    borderRadius: Radius.xl, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  greenBg: { width: '100%', borderRadius: Radius.xl, overflow: 'hidden' },
  resultCardOverlay: {
    backgroundColor: 'rgba(46, 125, 50, 0.75)', // Dark green transparent overlay
    borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
  },
  resultCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
  },
  resultTitleSuccess: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.white },
  resultTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  pointsBadgeWrapper: { backgroundColor: Colors.white, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, elevation: 4 },
  resultPointsBadge: { fontSize: 28, fontWeight: FontWeight.extraBold, color: Colors.success },
  resultPoints: { fontSize: 32, fontWeight: FontWeight.extraBold, color: Colors.primary },
  resultSubtitleSuccess: { fontSize: FontSize.sm, color: Colors.white, textAlign: 'center', paddingHorizontal: Spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, gap: Spacing.sm, marginTop: Spacing.xs },
  statsText: { color: Colors.white, fontSize: FontSize.sm },
  resultSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  rescanBtn: { width: '100%', marginTop: Spacing.sm },
  hintCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: Radius.lg,
    padding: Spacing.md, alignSelf: 'center',
  },
  hintText: { color: Colors.white, fontSize: FontSize.sm },
});
