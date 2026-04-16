import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../../src/config/firebase';
import { Colors } from '../../src/constants/colors';
import { Radius, Spacing } from '../../src/constants/spacing';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { timeAgo } from '../../src/utils/formatters';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:   '🟡 Chưa quét',
  CONSUMED: '🟢 Đã quét',
  EXPIRED:  '🔴 Hết hạn',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   '#F59E0B',
  CONSUMED: Colors.success,
  EXPIRED:  Colors.error,
};
const STATUS_BG: Record<string, string> = {
  ACTIVE:   '#FFF9C4',
  CONSUMED: Colors.successSurface,
  EXPIRED:  Colors.errorSurface,
};

interface QRItem {
  id: string;
  batchId: string;
  businessName: string;
  type: 'company' | 'individual';
  pointsValue: number;
  status: string;
  createdAt: any;
  [key: string]: any;
}

interface EntityGroup {
  key: string;           // unique: `type::name`
  title: string;         // businessName
  type: 'company' | 'individual';
  total: number;
  consumed: number;
  active: number;
  data: QRItem[];
  collapsed: boolean;
}

export default function AdminQRListScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allQRs, setAllQRs] = useState<QRItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CONSUMED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'all' | 'company' | 'individual'>('all');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchQRs();
    }, [])
  );

  const fetchQRs = async () => {
    try {
      const q = query(collection(db, 'qr_codes'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as QRItem[];
      setAllQRs(data);
    } catch (err) {
      console.warn('Lỗi lấy mã QR:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchQRs(); }, []);

  // ── Export grouped QR codes as PDF ──────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      // Use the physically filtered sections currently shown in UI
      const groups = sections.filter(s => s.data.length > 0);

      if (groups.length === 0) {
        Alert.alert('Trống', 'Không có mã QR nào phù hợp với bộ lọc.');
        setExporting(false);
        return;
      }

      const typeLabel = typeFilter === 'all' ? 'Tất cả' : typeFilter === 'company' ? 'Công ty' : 'Cá nhân';

      // Prepare Logo DataUrl using exact same pattern as qr-gen
      const LOGO_SOURCE = require('../../assets/images/icon.png');
      let logoDataUrl = '';
      try {
        const logoAsset = await Asset.fromModule(LOGO_SOURCE).downloadAsync();
        if (Platform.OS === 'web') {
          logoDataUrl = logoAsset.uri;
        } else {
          try {
            const logoUri = logoAsset.localUri || logoAsset.uri;
            const logoFile = new File(logoUri);
            logoDataUrl = `data:image/png;base64,${await logoFile.base64()}`;
          } catch(e) {
            const FileSystemLegacy = require('expo-file-system/legacy');
            const b64 = await FileSystemLegacy.readAsStringAsync(logoAsset.localUri || logoAsset.uri, { encoding: FileSystemLegacy.EncodingType.Base64 });
            logoDataUrl = `data:image/png;base64,${b64}`;
          }
        }
      } catch (err) {
        console.warn('Could not read logo to Base64 in list:', err);
      }

      // Build HTML
      let groupsHtml = '';
      
      for (const group of groups) {
        const active = group.data.filter(q => q.status === 'ACTIVE').length;
        const consumed = group.data.filter(q => q.status === 'CONSUMED').length;
        const totalPoints = group.data.reduce((s, q) => s + (q.pointsValue || 0), 0);
        const typeIcon = group.type === 'company' ? '🏢' : '👤';

        let qrCardsHtml = '';
        for (const qr of group.data) {
          const qrId = qr.id;
          let finalQrImageSrc = '';
          try {
            const QRCodeLib = require('qrcode');
            const rawSvg = await QRCodeLib.toString(qrId, { 
              type: 'svg', 
              color: { dark: '#2E7D32', light: '#FFFFFF' }, 
              errorCorrectionLevel: 'H', 
              margin: 2 
            });

            let combinedSvg = rawSvg;
            if (logoDataUrl) {
              const match = rawSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
              if (match) {
                const vbWidth = parseInt(match[1]);
                const logoW = vbWidth * 0.25;
                const logoX = (vbWidth - logoW) / 2;
                const padding = 1;
                const maskRect = `<rect x="${logoX - padding}" y="${logoX - padding}" width="${logoW + padding*2}" height="${logoW + padding*2}" fill="#FFFFFF" rx="1" ry="1" />`;
                const imageTag = `<image href="${logoDataUrl}" x="${logoX}" y="${logoX}" width="${logoW}" height="${logoW}" preserveAspectRatio="xMidYMid slice" />`;
                combinedSvg = rawSvg.replace('</svg>', maskRect + imageTag + '</svg>');
              }
            }
            finalQrImageSrc = `data:image/svg+xml;utf8,${encodeURIComponent(combinedSvg)}`;
          } catch (svgErr) {
            console.warn('Lỗi gen SVG list:', svgErr);
            finalQrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrId)}&color=2E7D32&bgcolor=FFFFFF&margin=2&ecc=H`;
          }

          const statusText = qr.status === 'ACTIVE' ? '🟡 Chưa quét' : qr.status === 'CONSUMED' ? '🟢 Đã quét' : '🔴 Hết hạn';
          const labelText = group.type === 'company' ? 'Công ty' : 'Cá nhân';

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
                <img src="${finalQrImageSrc}" width="180" height="180" style="display: block; border-radius: 6px;" />
              </div>
              
              <div style="
                margin-top: 10px;
                font-family: 'Segoe UI', sans-serif;
              ">
                <div style="font-size: 20px; font-weight: bold; color: #2E7D32;">
                  ${qr.pointsValue || 10} EcoPoints
                </div>
                <div style="font-size: 11px; color: #5A705A; margin-top: 4px;">
                  ${labelText}: ${group.title}
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
                <div style="font-size: 10px; font-weight: bold; margin-top: 6px; color: ${qr.status === 'CONSUMED' ? '#2E7D32' : '#F59E0B'};">
                  ${statusText}
                </div>
              </div>
            </div>
          `;
        }

        groupsHtml += `
          <div style="margin-bottom: 40px; page-break-inside: avoid;">
            <div style="
              background: linear-gradient(135deg, #2E7D32, #1B5E20);
              color: white;
              padding: 14px 18px;
              border-radius: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            ">
              <div>
                <div style="font-size: 16px; font-weight: bold;">${typeIcon} ${group.title}</div>
                <div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">
                  ${group.type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'} · ${group.data.length} mã
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px;">✓ ${consumed} đã quét · ⏳ ${active} chưa quét</div>
                <div style="font-size: 11px;">Tổng: ${totalPoints} EP</div>
              </div>
            </div>
            
            <div style="text-align: center;">
              ${qrCardsHtml}
            </div>
          </div>
        `;
      }

      const exportedCount = groups.reduce((acc, g) => acc + g.data.length, 0);
      const totalActiveExport = groups.reduce((acc, g) => acc + g.data.filter(q => q.status === 'ACTIVE').length, 0);
      const totalConsumedExport = groups.reduce((acc, g) => acc + g.data.filter(q => q.status === 'CONSUMED').length, 0);
      const dateStr = new Date().toLocaleDateString('vi-VN');

      const html = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Xuất Kho QR - EcoBack</title>
            <style>
              @page { margin: 15mm; }
              body { font-family: 'Segoe UI', sans-serif; padding: 10px; color: #333; }
            </style>
          </head>
          <body>
            <div style="text-align: center; margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #2E7D32, #1B5E20); border-radius: 16px; color: white;">
              <h1 style="margin: 0; font-size: 22px;">Báo Cáo Kho Mã QR - EcoBack</h1>
              <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.85;">Nhóm: ${typeLabel} · Ngày xuất: ${dateStr}</p>
            </div>
            <div style="display: flex; gap: 12px; margin-bottom: 20px; justify-content: center;">
              <div style="background: #F1F8F1; padding: 10px 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 20px; font-weight: bold; color: #2E7D32;">${exportedCount}</div>
                <div style="font-size: 10px; color: #5A705A; text-transform: uppercase;">Tổng mã</div>
              </div>
              <div style="background: #E8F5E9; padding: 10px 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 20px; font-weight: bold; color: #2E7D32;">${totalConsumedExport}</div>
                <div style="font-size: 10px; color: #5A705A; text-transform: uppercase;">Đã quét</div>
              </div>
              <div style="background: #FFF9C4; padding: 10px 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 20px; font-weight: bold; color: #B45309;">${totalActiveExport}</div>
                <div style="font-size: 10px; color: #5A705A; text-transform: uppercase;">Chưa quét</div>
              </div>
              <div style="background: #E3F2FD; padding: 10px 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 20px; font-weight: bold; color: #1565C0;">${groups.length}</div>
                <div style="font-size: 10px; color: #5A705A; text-transform: uppercase;">Thực thể</div>
              </div>
            </div>
            ${groupsHtml}
            <div style="text-align: center; margin-top: 20px; padding: 10px; color: #94A894; font-size: 10px;">
              EcoBack Vietnam - Hệ thống quản lý tái chế · Xuất tự động ${dateStr}
            </div>
          </body>
        </html>
      `;

      // Print/share PDF
      if (typeof Platform !== 'undefined' && Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DanhSachQR-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Also trigger print dialog natively
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
      
      Alert.alert('✅ Xuất thành công', `Đã xuất ${exportedCount} mã QR từ các bộ lọc đang chọn.`);
    } catch (err: any) {
      if (err?.message?.includes('cancel')) {
        // User cancelled print dialog — not an error
      } else {
        console.warn('Export error:', err);
        Alert.alert('Lỗi', 'Không thể xuất danh sách. Vui lòng thử lại.');
      }
    } finally {
      setExporting(false);
    }
  };

  const showExportMenu = () => {
    Alert.alert(
      '📤 Xuất Danh Sách Đang Lọc',
      'Hệ thống sẽ gom toàn bộ mã QR dựa trên bộ lọc hiển thị (Công ty/Cá nhân, Chưa quét/Đã quét) và xuất thành 1 báo cáo PDF.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xác nhận Xuất PDF', onPress: () => handleExport() },
      ]
    );
  };

  const handleReactivateQR = async (qrId: string) => {
    try {
      await updateDoc(doc(db, 'qr_codes', qrId), { status: 'ACTIVE' });
      // Cập nhật lại UI nội bộ tức thời
      setAllQRs(prev => prev.map(q => q.id === qrId ? { ...q, status: 'ACTIVE' } : q));
      Alert.alert('Thành công', 'Đã kích hoạt lại mã QR. Có thể tiếp tục tái sử dụng!');
    } catch (err) {
      console.warn('Reactivate err:', err);
      Alert.alert('Lỗi', 'Không thể kích hoạt mã.');
    }
  };

  // Build grouped sections
  const sections: EntityGroup[] = useMemo(() => {
    let filtered = allQRs;

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(q => q.type === typeFilter);
    }
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(qr =>
        (qr.businessName || '').toLowerCase().includes(q) ||
        (qr.batchId || '').toLowerCase().includes(q) ||
        qr.id.toLowerCase().includes(q)
      );
    }

    // Group by entity
    const map = new Map<string, EntityGroup>();
    filtered.forEach(qr => {
      const name = qr.businessName || 'Không tên';
      const type: 'company' | 'individual' = qr.type === 'company' ? 'company' : 'individual';
      const key = `${type}::${name}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          title: name,
          type,
          total: 0, consumed: 0, active: 0,
          data: [],
          collapsed: collapsed[key] !== false, // default collapsed
        });
      }
      const group = map.get(key)!;
      group.total += 1;
      if (qr.status === 'CONSUMED') group.consumed += 1;
      else if (qr.status === 'ACTIVE') group.active += 1;
      group.data.push(qr);
    });

    return Array.from(map.values());
  }, [allQRs, statusFilter, typeFilter, search, collapsed]);

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Flatten sections for SectionList: hide items when collapsed
  const flatSections = sections.map(g => ({
    ...g,
    data: (collapsed[g.key] === false) ? g.data : [],
  }));

  const totalActive   = allQRs.filter(q => q.status === 'ACTIVE').length;
  const totalConsumed = allQRs.filter(q => q.status === 'CONSUMED').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{flex: 1}}>
            <Text style={styles.title}>Kho Mã QR</Text>
            <Text style={styles.subtitle}>Quản lý theo thực thể · {allQRs.length} mã tổng</Text>
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={showExportMenu}
            disabled={exporting || loading}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="file-export" size={16} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>Xuất PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryChip, { backgroundColor: '#FFF9C4' }]}>
          <MaterialCommunityIcons name="qrcode" size={14} color="#F59E0B" />
          <Text style={[styles.summaryChipText, { color: '#B45309' }]}>{totalActive} chưa quét</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: Colors.successSurface }]}>
          <MaterialCommunityIcons name="qrcode-scan" size={14} color={Colors.success} />
          <Text style={[styles.summaryChipText, { color: Colors.success }]}>{totalConsumed} đã quét</Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: Colors.infoSurface }]}>
          <MaterialCommunityIcons name="account-group" size={14} color={Colors.info} />
          <Text style={[styles.summaryChipText, { color: Colors.info }]}>{sections.length} thực thể</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên công ty, cá nhân, batch ID..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {/* Status */}
        {(['ALL', 'ACTIVE', 'CONSUMED'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {s === 'ALL' ? 'Tất cả' : s === 'ACTIVE' ? 'Chưa quét' : 'Đã quét'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.dividerV} />
        {/* Type */}
        {(['all', 'company', 'individual'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, typeFilter === t && styles.filterChipActive2]}
            onPress={() => setTypeFilter(t)}
          >
            <MaterialCommunityIcons
              name={t === 'all' ? 'view-grid' : t === 'company' ? 'domain' : 'account'}
              size={12}
              color={typeFilter === t ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>
              {t === 'all' ? 'Tất cả' : t === 'company' ? 'Công ty' : 'Cá nhân'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : sections.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="qrcode-remove" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Không tìm thấy mã QR nào</Text>
        </View>
      ) : (
        <SectionList
          sections={flatSections}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.primary} onRefresh={() => { setRefreshing(true); fetchQRs(); }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section: group }) => {
            const isExpanded = collapsed[group.key] === false;
            return (
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleCollapse(group.key)}
                activeOpacity={0.75}
              >
                {/* Left icon */}
                <View style={[
                  styles.groupIcon,
                  { backgroundColor: group.type === 'company' ? Colors.infoSurface : Colors.primarySurface }
                ]}>
                  <MaterialCommunityIcons
                    name={group.type === 'company' ? 'domain' : 'account-circle'}
                    size={24}
                    color={group.type === 'company' ? Colors.info : Colors.primary}
                  />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={styles.groupTitleRow}>
                    <Text style={styles.groupName} numberOfLines={1}>{group.title}</Text>
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: group.type === 'company' ? Colors.infoSurface : Colors.primarySurface }
                    ]}>
                      <Text style={[styles.typeBadgeText,
                        { color: group.type === 'company' ? Colors.info : Colors.primary }]}>
                        {group.type === 'company' ? 'Công ty' : 'Cá nhân'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.groupStats}>
                    <Text style={styles.groupStatText}>Tổng: {group.total} mã</Text>
                    <Text style={[styles.groupStatText, { color: Colors.success }]}>✓ {group.consumed}</Text>
                    <Text style={[styles.groupStatText, { color: '#F59E0B' }]}>⏳ {group.active}</Text>
                    {/* Progress Bar */}
                    <View style={styles.miniProgress}>
                      <View style={[styles.miniProgressFill, {
                        width: group.total > 0 ? `${Math.round((group.consumed / group.total) * 100)}%` : '0%'
                      }]} />
                    </View>
                  </View>
                </View>

                {/* Expand/Collapse */}
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={Colors.textTertiary}
                />
              </TouchableOpacity>
            );
          }}
          renderItem={({ item: qr }) => {
            const statusColor = STATUS_COLORS[qr.status] || Colors.textTertiary;
            const statusBg    = STATUS_BG[qr.status] || Colors.background;
            const statusLabel = STATUS_LABELS[qr.status] || qr.status;

            return (
              <View style={styles.qrItem}>
                <View style={[styles.qrStatusDot, { backgroundColor: statusColor }]} />
                <View style={styles.qrInfo}>
                  <Text style={styles.qrId} numberOfLines={1}>#{qr.id.slice(-10).toUpperCase()}</Text>
                  <Text style={styles.qrBatch}>Batch: {(qr.batchId || '').slice(-8)}</Text>
                  <Text style={styles.qrDate}>{qr.createdAt ? timeAgo(qr.createdAt) : 'Gần đây'}</Text>
                </View>
                <View style={[styles.qrRight, { flexDirection: 'row', alignItems: 'center' }]}>
                  {qr.status === 'CONSUMED' && (
                    <TouchableOpacity
                      style={{ padding: 6, marginRight: 12, backgroundColor: Colors.primarySurface, borderRadius: 8 }}
                      onPress={() => {
                        Alert.alert('Kích hoạt lại', 'Bạn muốn đặt mã QR này về trạng thái chưa quét để có thể tiếp tục sử dụng thu gom?', [
                          { text: 'Hủy', style: 'cancel' },
                          { text: 'Kích hoạt ngay', onPress: () => handleReactivateQR(qr.id) }
                        ]);
                      }}
                    >
                      <MaterialCommunityIcons name="refresh" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.qrPoints}>{qr.pointsValue} EP</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  header: {
    paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.sm,
    backgroundColor: '#1C2E20',
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, elevation: 2,
  },
  exportBtnText: {
    color: '#FFFFFF', fontSize: 12, fontWeight: FontWeight.bold,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 4 },

  summaryRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: '#1C2E20',
  },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
  },
  summaryChipText: { fontSize: 11, fontWeight: FontWeight.bold },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, marginHorizontal: Spacing.lg,
    marginTop: Spacing.md, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: Radius.full,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, paddingVertical: 2 },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  filterChipActive2: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 11, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  filterTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  dividerV: { width: 1, height: 20, backgroundColor: Colors.border },

  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120, paddingTop: Spacing.sm },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: 2,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2,
    marginTop: Spacing.sm,
  },
  groupIcon: {
    width: 46, height: 46, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  groupName: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  groupStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  groupStatText: { fontSize: 11, color: Colors.textSecondary },
  miniProgress: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', minWidth: 40 },
  miniProgressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },

  qrItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginBottom: 2, marginLeft: 10,
  },
  qrStatusDot: { width: 8, height: 8, borderRadius: 4 },
  qrInfo: { flex: 1 },
  qrId: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  qrBatch: { fontSize: 11, color: Colors.textSecondary },
  qrDate: { fontSize: 10, color: Colors.textTertiary },
  qrRight: { alignItems: 'flex-end', gap: 4 },
  qrPoints: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  statusPillText: { fontSize: 10, fontWeight: FontWeight.bold },

  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, marginTop: 60 },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
});
