import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Alert, TouchableOpacity, Modal, Pressable, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { Spacing, Radius } from '../../src/constants/spacing';
import { AppButton } from '../../src/components/common/AppButton';
import { Asset } from 'expo-asset';

// Brand colors from logo
const QR_GREEN = '#2E7D32';
const QR_BG    = '#FFFFFF';

// Logo as base64 for embedding in QR center — uses the actual app icon
const LOGO_SOURCE = require('../../assets/images/icon.png');

export default function AdminQRGeneratorScreen() {
  const [pointName, setPointName] = useState('Công ty CP Môi Trường');
  const [pointsValue, setPointsValue] = useState('10');
  const [quantity, setQuantity] = useState('50');
  const [qrLabel, setQrLabel] = useState<'company' | 'individual'>('company');
  const [generating, setGenerating] = useState(false);
  const [previewQR, setPreviewQR] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const qrRef = useRef<any>(null);

  // Download the Preview QR as PNG directly
  const handleDownloadPreviewPNG = async () => {
    if (!qrRef.current) return;
    
    qrRef.current.toDataURL(async (base64Data: string) => {
      const dataUrl = `data:image/png;base64,${base64Data}`;
      const fileName = `qr-code-${Date.now()}.png`;

      if (Platform.OS === 'web') {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          Alert.alert('✅ Thành công', 'Đã lưu file PNG vệ máy tính');
        } catch (err) {
          console.warn('Web download err:', err);
          Alert.alert('Lỗi', 'Không thể lưu file trên trình duyệt này');
        }
      } else {
        try {
          // Use New Expo FileSystem APIs File/Directory
          if (Directory && Paths && Paths.cache) {
            const cacheDir = new Directory(Paths.cache);
            const savedFile = cacheDir.createFile(fileName, 'image/png');
            savedFile.write(base64Data, { encoding: 'base64' });
            await Sharing.shareAsync(savedFile.uri);
          } else {
            throw new Error('New Expo-File-System API missing Paths');
          }
        } catch (err) {
          console.warn('New File fallback:', err);
          // Fallback to legacy
          try {
            const FileSystemLegacy = require('expo-file-system/legacy');
            const fileUri = FileSystemLegacy.cacheDirectory + fileName;
            await FileSystemLegacy.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystemLegacy.EncodingType.Base64 });
            await Sharing.shareAsync(fileUri);
          } catch (eFallback) {
            console.warn('Fallback File error:', eFallback);
            Alert.alert('Lỗi', 'Không thể lưu hoặc share ảnh.');
          }
        }
      }
    });
  };

  // Preview a single QR before batch generation
  const handlePreview = () => {
    const previewId = `PREVIEW-${Date.now().toString(36).toUpperCase()}-0`;
    setPreviewQR(previewId);
    setShowPreview(true);
  };

  const handleGenerate = async () => {
    const labelText = qrLabel === 'company' ? 'Doanh Nghiệp / Công ty' : 'Cá Nhân';
    const count = parseInt(quantity) || 1;
    const pts = parseInt(pointsValue) || 10;

    if (!pointName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên công ty / cá nhân.');
      return;
    }

    setGenerating(true);

    try {
      const { writeBatch, doc, serverTimestamp } = require('firebase/firestore');
      const { db } = require('../../src/config/firebase');

      const batch = writeBatch(db);
      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;

      // Get logo as base64 for embedding in downloaded batch QR
      let logoDataUrl = '';
      try {
        const logoAsset = await Asset.fromModule(LOGO_SOURCE).downloadAsync();
        if (Platform.OS === 'web') {
          logoDataUrl = logoAsset.uri;
        } else {
          const logoUri = logoAsset.localUri || logoAsset.uri;
          try {
            const logoFile = new File(logoUri);
            const base64Logo = await logoFile.base64();
            logoDataUrl = `data:image/png;base64,${base64Logo}`;
          } catch(e) {
            console.warn('Falling back to legacy expo-file-system for logo:', e);
            const FileSystemLegacy = require('expo-file-system/legacy');
            const base64Logo = await FileSystemLegacy.readAsStringAsync(logoUri, { encoding: FileSystemLegacy.EncodingType.Base64 });
            logoDataUrl = `data:image/png;base64,${base64Logo}`;
          }
        }
      } catch (err) {
        console.warn('Could not read logo to Base64:', err);
      }

      // Build HTML with branded QR cards for PDF export
      let qrCardsHtml = '';

      for (let i = 0; i < count; i++) {
        const qrId = `${batchId}-${i}`;

        // Write to Firestore
        const qrRef = doc(db, 'qr_codes', qrId);
        batch.set(qrRef, {
          id: qrId,
          batchId,
          businessName: pointName.trim(),
          type: qrLabel,
          pointsValue: pts,
          status: 'ACTIVE',
          createdAt: serverTimestamp(),
        });

        // 1) Tạo SVG base của mã QR
        let finalQrImageSrc = '';
        try {
          const QRCodeLib = require('qrcode');
          const rawSvg = await QRCodeLib.toString(qrId, { 
            type: 'svg', 
            color: { dark: '#2E7D32', light: '#FFFFFF' }, 
            errorCorrectionLevel: 'H', 
            margin: 2 
          });

          // 2) Chèn Logo vào giữa SVG
          let combinedSvg = rawSvg;
          if (logoDataUrl) {
             const match = rawSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
             if (match) {
               const vbWidth = parseInt(match[1]);
               const logoW = vbWidth * 0.25; // Chiếm 25% diện tích để đảm bảo quét tốt (Ecc=H)
               const logoX = (vbWidth - logoW) / 2;
               
               // Nền trắng phía sau logo để không bị nhiễu nét của QR
               const padding = 1;
               const maskRect = `<rect x="${logoX - padding}" y="${logoX - padding}" width="${logoW + padding*2}" height="${logoW + padding*2}" fill="#FFFFFF" rx="1" ry="1" />`;
               const imageTag = `<image href="${logoDataUrl}" x="${logoX}" y="${logoX}" width="${logoW}" height="${logoW}" preserveAspectRatio="xMidYMid slice" />`;
               
               combinedSvg = rawSvg.replace('</svg>', maskRect + imageTag + '</svg>');
             }
          }
          finalQrImageSrc = `data:image/svg+xml;utf8,${encodeURIComponent(combinedSvg)}`;
        } catch (svgErr) {
          console.warn('Lỗi gen SVG:', svgErr);
          // Fallback dự phòng
          finalQrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrId)}&color=2E7D32&bgcolor=FFFFFF&margin=2&ecc=H`;
        }

        qrCardsHtml += `
          <div style="
            display: inline-block;
            border: 3px solid #2E7D32;
            border-radius: 16px;
            padding: 20px 16px;
            margin: 12px;
            width: 240px;
            text-align: center;
            page-break-inside: avoid;
            background: linear-gradient(135deg, #f7faf7 0%, #ffffff 100%);
            box-shadow: 0 2px 8px rgba(46,125,50,0.15);
          ">
            <div style="
              background: #2E7D32;
              color: white;
              font-family: 'Segoe UI', sans-serif;
              font-size: 15px;
              font-weight: bold;
              padding: 6px 12px;
              border-radius: 8px;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            ">EcoBack Vietnam</div>
            
            <div style="
              display: inline-block;
              padding: 8px;
              background: white;
              border-radius: 12px;
              border: 2px solid #E8F5E9;
            ">
              <!-- Bức ảnh QR ở đây giờ LÀ 1 TỆP DUY NHẤT BAO GỒM CẢ LOGO! Người dùng có thể save trực tiếp bức hình này -->
              <img src="${finalQrImageSrc}" width="180" height="180" style="display: block; border-radius: 6px;" />
            </div>
            
            <div style="
              margin-top: 10px;
              font-family: 'Segoe UI', sans-serif;
            ">
              <div style="font-size: 20px; font-weight: bold; color: #2E7D32;">
                ${pts} EcoPoints
              </div>
              <div style="font-size: 11px; color: #5A705A; margin-top: 4px;">
                ${labelText}: ${pointName.trim()}
              </div>
              <div style="
                font-size: 9px;
                color: #94A894;
                margin-top: 6px;
                padding: 3px 8px;
                background: #F1F8F1;
                border-radius: 4px;
                display: inline-block;
              ">
                ID: ${qrId}
              </div>
            </div>
          </div>
        `;
      }

      // Commit to Firestore
      await batch.commit();

      // Build full branded PDF HTML
      const fullHtml = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>EcoBack QR - ${batchId}</title>
            <style>
              @page { margin: 20mm; }
              body {
                font-family: 'Segoe UI', sans-serif;
                padding: 20px;
                background: #f7faf7;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(135deg, #2E7D32, #1B5E20);
                border-radius: 16px;
                color: white;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .header p {
                margin: 5px 0 0;
                opacity: 0.85;
                font-size: 14px;
              }
              .grid {
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🌿 Mã QR Thu Gom - ${batchId}</h1>
              <p>${labelText}: <strong>${pointName.trim()}</strong> · ${count} mã · ${pts} EP/mã</p>
            </div>
            <div class="grid">
              ${qrCardsHtml}
            </div>
          </body>
        </html>
      `;

      // Print/Save as PDF
      try {
        const Print = require('expo-print');
        if (Platform.OS === 'web') {
          // Web printing flow
          await Print.printAsync({ html: fullHtml });
        } else {
          const { uri: pdfUri } = await Print.printToFileAsync({ html: fullHtml });
          await Sharing.shareAsync(pdfUri, { UTI: '.pdf', mimeType: 'application/pdf' });
        }
      } catch (printErr) {
        console.warn('Print cancelled or failed:', printErr);
      }

      Alert.alert('✅ Thành công', `Đã tạo ${count} mã QR branded với logo EcoBack.\nLô: ${batchId}\nĐã đồng bộ Firestore.`);
    } catch (err) {
      console.warn('Lỗi ghi Database QR:', err);
      Alert.alert('Lỗi CSDL', 'Không thể tạo Lô QR. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tạo Mã QR Thương Hiệu</Text>
      <Text style={styles.subtitle}>QR xanh lá với logo EcoBack ở giữa</Text>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên Công ty / Cá nhân</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="domain" size={20} color={Colors.textTertiary} />
            <TextInput style={styles.input} value={pointName} onChangeText={setPointName} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phân loại (Theo dõi ESG)</Text>
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
          <Text style={styles.label}>Giá trị EcoPoints (mỗi lần quét)</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="leaf" size={20} color={Colors.primary} />
            <TextInput style={styles.input} value={pointsValue} onChangeText={setPointsValue} keyboardType="numeric" />
            <Text style={styles.inputSuffix}>EP</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số lượng mã cần tạo</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.textTertiary} />
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            <Text style={styles.inputSuffix}>mã</Text>
          </View>
        </View>

        {/* QR Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Xem trước QR mẫu</Text>
          <View style={styles.qrPreviewBox}>
            <QRCode
              getRef={(c) => (qrRef.current = c)}
              value={`PREVIEW-${pointName.trim()}`}
              size={160}
              color={QR_GREEN}
              backgroundColor={QR_BG}
              logo={LOGO_SOURCE}
              logoSize={36}
              logoBackgroundColor={QR_BG}
              logoBorderRadius={8}
              logoMargin={4}
            />
            <Text style={styles.qrPreviewLabel}>{parseInt(pointsValue) || 10} EcoPoints</Text>
            <Text style={styles.qrPreviewSub}>{pointName.trim()}</Text>
            
            <TouchableOpacity style={styles.downloadPreviewBtn} onPress={handleDownloadPreviewPNG}>
              <MaterialCommunityIcons name="download" size={16} color={Colors.primary} />
              <Text style={styles.downloadPreviewText}>Tải ảnh QR (.png)</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.btnRow}>
          <AppButton
            title={generating ? 'Đang tạo...' : '🌿 Tạo Lô QR'}
            onPress={handleGenerate}
            isLoading={generating}
            style={styles.btn}
          />
        </View>
      </View>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="shield-check" size={24} color={Colors.success} />
        <Text style={styles.infoText}>
          Mã QR có logo EcoBack ở giữa, màu xanh thương hiệu (#2E7D32). Mỗi mã chỉ quét được 1 lần, chống giả mạo.
        </Text>
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary, marginBottom: Spacing.xs },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, paddingVertical: Spacing.md, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.textPrimary },
  inputSuffix: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: FontWeight.bold },
  radioRow: { flexDirection: 'row', gap: Spacing.sm },
  radioBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  radioBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radioText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  radioTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  previewSection: { marginTop: Spacing.sm, marginBottom: Spacing.lg },
  previewLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  qrPreviewBox: {
    alignItems: 'center', padding: Spacing.lg, backgroundColor: '#F7FAF7',
    borderRadius: Radius.lg, borderWidth: 2, borderColor: '#E8F5E9', borderStyle: 'dashed',
  },
  qrPreviewLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: QR_GREEN, marginTop: Spacing.md },
  qrPreviewSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  btnRow: { gap: Spacing.sm },
  btn: {},
  downloadPreviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.primarySurface, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary },
  downloadPreviewText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#E8F5E9', padding: Spacing.md,
    borderRadius: Radius.md, marginTop: Spacing.xl, gap: Spacing.sm, alignItems: 'center',
  },
  infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.success, lineHeight: 18 },
});
