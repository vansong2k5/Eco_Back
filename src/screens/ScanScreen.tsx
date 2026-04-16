import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Alert, ImageBackground, TouchableOpacity } from 'react-native';
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
  const [scannedData, setScannedData] = useState<{ points?: number; message?: string; recycleCount?: number } | null>(null);
  const isProcessing = useRef(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const { user, profile, setProfile } = useAuthStore();

  const showResult = (status: ScanStatus, data?: { points?: number; message?: string; recycleCount?: number }) => {
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
        const points = result.data.pointsEarned || 0;
        const recycleCount = result.data.recycleCount || 1;
        showResult('success', { points, recycleCount });
        
        // Removed: setProfile update. Points will be added after 3-5' validation as requested.
        // The transaction is recorded in Firestore with status PROCESSING/COMPLETED 
        // and will be reflected in history.
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
        {/* Top Mask */}
        <View style={[styles.maskBlock, styles.topSection]}>
          <Text style={styles.title}>Quét Mã QR Thu Gom</Text>
          <Text style={styles.subtitle}>Di chuyển camera đến mã QR tại điểm thu gom</Text>
        </View>

        {/* Middle Row with Scan Frame */}
        <View style={styles.middleRow}>
          <View style={styles.sideMask} />
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
          <View style={styles.sideMask} />
        </View>

        {/* Bottom Mask */}
        <View style={[styles.maskBlock, styles.bottomSection]}>
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
        </View>
      </View>

      {/* Result Popup - Absolute Centered */}
      {(scanStatus !== 'idle' && scanStatus !== 'loading') && (
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.resultCardContainer, { transform: [{ scale: scaleAnim }] }]}>
            {scanStatus === 'success' ? (
              <ImageBackground 
                source={{ uri: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=600&auto=format&fit=crop' }} 
                style={styles.greenBg} 
                imageStyle={{ borderRadius: Radius.xl, opacity: 0.8 }}
              >
                <View style={styles.resultCardOverlay}>
                  <TouchableOpacity style={styles.closeIcon} onPress={resetScan}>
                    <MaterialCommunityIcons name="close" size={24} color={Colors.white} />
                  </TouchableOpacity>

                  <MaterialCommunityIcons name="check-decagram" size={64} color={Colors.white} />
                  <Text style={styles.resultTitleSuccess}>🎉 Tuyệt vời!</Text>
                  
                  <View style={styles.pointsBadgeWrapper}>
                    <Text style={styles.resultPointsBadge}>+{scannedData?.points ?? 20} EP</Text>
                  </View>
                  
                  <Text style={styles.resultSubtitleSuccess}>Bạn vừa giúp giảm phát thải thêm một lượng CO2 vào môi trường.</Text>
                  
                  <View style={styles.validationNoteRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.validationNote}>Điểm sẽ được cộng sau 3-5 phút kiểm tra hợp lệ.</Text>
                  </View>

                  {scannedData?.recycleCount && (
                    <View style={styles.statsRow}>
                      <MaterialCommunityIcons name="recycle" size={20} color={Colors.white} />
                      <Text style={styles.statsText}>Đây là lần tái chế thứ <Text style={{fontWeight:'bold', color: Colors.warning}}>{scannedData.recycleCount}</Text> của bao bì này!</Text>
                    </View>
                  )}

                  <AppButton title="Quét tiếp" onPress={resetScan} style={styles.rescanBtn} variant="secondary" />
                </View>
              </ImageBackground>
            ) : (
              <View style={styles.resultCard}>
                <TouchableOpacity style={[styles.closeIcon, { top: 12, right: 12 }]} onPress={resetScan}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>

                {scanStatus === 'already_used' ? (
                  <>
                    <MaterialCommunityIcons name="qrcode-remove" size={56} color={Colors.warning} />
                    <Text style={styles.resultTitle}>Mã đã dùng</Text>
                    <Text style={styles.resultSubtitle}>Mã QR này đã được quét trước đó</Text>
                    <AppButton title="Quét mã khác" variant="outline" onPress={resetScan} style={styles.rescanBtn} />
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="alert-circle" size={56} color={Colors.error} />
                    <Text style={styles.resultTitle}>Không hợp lệ</Text>
                    <Text style={styles.resultSubtitle}>{scannedData?.message ?? 'Mã QR không hợp lệ hoặc đã hết hạn'}</Text>
                    <AppButton title="Thử lại" variant="outline" onPress={resetScan} style={styles.rescanBtn} />
                  </>
                )}
              </View>
            )}
          </Animated.View>
        </View>
      )}
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
  overlay: { flex: 1, justifyContent: 'space-between' },
  maskBlock: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', height: 250 },
  sideMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  topSection: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white, textAlign: 'center' },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: Spacing.sm },
  scanFrame: { width: 250, height: 250, backgroundColor: 'transparent', position: 'relative' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#4CAF50', backgroundColor: 'transparent' },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 8 },
  scanningIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(46,125,50,0.2)', borderRadius: 8 },
  scanningText: { color: Colors.white, fontWeight: FontWeight.semiBold, fontSize: FontSize.sm },
  bottomSection: { padding: Spacing.xl, paddingBottom: 40, justifyContent: 'flex-start' },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 1000,
  },
  resultCardContainer: {
    width: '100%',
    borderRadius: Radius.xl, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 15,
  },
  greenBg: { width: '100%', borderRadius: Radius.xl, overflow: 'hidden' },
  resultCardOverlay: {
    backgroundColor: 'rgba(27, 94, 32, 0.85)', // Darker forest green transparent overlay
    borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
    paddingTop: 40,
  },
  resultCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.md, paddingVertical: 40,
  },
  closeIcon: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  resultTitleSuccess: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.white, marginBottom: Spacing.xs },
  resultTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  pointsBadgeWrapper: { backgroundColor: Colors.white, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, elevation: 4 },
  resultPointsBadge: { fontSize: 32, fontWeight: FontWeight.extraBold, color: Colors.success },
  resultSubtitleSuccess: { fontSize: FontSize.md, color: Colors.white, textAlign: 'center', paddingHorizontal: Spacing.sm, opacity: 0.9 },
  validationNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm },
  validationNote: { fontSize: 11, color: Colors.white, fontWeight: FontWeight.medium },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, gap: Spacing.sm, marginTop: Spacing.sm },
  statsText: { color: Colors.white, fontSize: FontSize.sm },
  resultSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.md },
  rescanBtn: { width: '100%', marginTop: Spacing.md, height: 50 },
  hintCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: Radius.lg,
    padding: Spacing.md, alignSelf: 'center',
  },
  hintText: { color: Colors.white, fontSize: FontSize.sm },
});
