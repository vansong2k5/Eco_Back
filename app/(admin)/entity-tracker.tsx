import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Dimensions, Alert, Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { Colors } from '../../src/constants/colors';
import { FontSize, FontWeight } from '../../src/constants/typography';
import { Spacing, Radius } from '../../src/constants/spacing';
import { AppButton } from '../../src/components/common/AppButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KG_PER_POINT = 0.1;

interface EntityStat {
  name: string;
  type: 'company' | 'individual';
  totalQR: number;
  consumedQR: number;
  totalKg: number;
  totalPoints: number;
  activeQR: number;
  completionRate: number;
  qrs: any[]; // Store raw QR data for editing & charting
}

export default function EntityTrackerScreen() {
  const [loading, setLoading] = useState(true);
  const [allEntities, setAllEntities] = useState<EntityStat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'company' | 'individual'>('all');
  const [sortBy, setSortBy] = useState<'kg' | 'qr' | 'name'>('kg');
  
  const [selectedEntity, setSelectedEntity] = useState<EntityStat | null>(null);
  const [editingPoints, setEditingPoints] = useState(false);
  const [newPointsVal, setNewPointsVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchEntityData();
  }, []);

  const fetchEntityData = async () => {
    setLoading(true);
    try {
      const qrSnap = await getDocs(collection(db, 'qr_codes'));
      const entityMap = new Map<string, EntityStat>();

      qrSnap.forEach((docSnap: any) => {
        const qr = docSnap.data();
        qr.id = docSnap.id; // embed ID for batch operations
        const name: string = qr.businessName || 'Không tên';
        const type: 'company' | 'individual' = qr.type === 'company' ? 'company' : 'individual';
        const key = `${type}::${name}`;
        const pts: number = typeof qr.pointsValue === 'number' ? qr.pointsValue : 0;

        if (!entityMap.has(key)) {
          entityMap.set(key, {
            name, type,
            totalQR: 0, consumedQR: 0, totalKg: 0, totalPoints: 0, activeQR: 0, completionRate: 0,
            qrs: []
          });
        }

        const stat = entityMap.get(key)!;
        stat.totalQR += 1;
        stat.qrs.push(qr);

        if (qr.status === 'CONSUMED') {
          stat.consumedQR += 1;
          stat.totalPoints += pts;
          const kgValue = typeof qr.kg === 'number' ? qr.kg : pts * KG_PER_POINT;
          stat.totalKg += kgValue;
        } else if (qr.status === 'ACTIVE') {
          stat.activeQR += 1;
        }

        stat.completionRate = stat.totalQR > 0 ? Math.round((stat.consumedQR / stat.totalQR) * 100) : 0;
      });

      setAllEntities(Array.from(entityMap.values()));
      // If modal is open, refresh selected entity data
      if (selectedEntity) {
        const key = `${selectedEntity.type}::${selectedEntity.name}`;
        setSelectedEntity(entityMap.get(key) || null);
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntities = useMemo(() => {
    let list = allEntities;
    if (typeFilter !== 'all') list = list.filter(e => e.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'kg') return b.totalKg - a.totalKg;
      if (sortBy === 'qr') return b.consumedQR - a.consumedQR;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [allEntities, searchQuery, typeFilter, sortBy]);

  const summary = useMemo(() => {
    const src = filteredEntities;
    return {
      totalKg: src.reduce((s, e) => s + e.totalKg, 0),
      totalConsumed: src.reduce((s, e) => s + e.consumedQR, 0),
      totalPoints: src.reduce((s, e) => s + e.totalPoints, 0),
      count: src.length,
    };
  }, [filteredEntities]);

  // Chart calculation logic for selected entity
  const entityChartData = useMemo(() => {
    if (!selectedEntity) return [];
    
    // Create an array of last 4-6 months
    const dataObj: Record<string, number> = {};
    const now = new Date();
    // Initialize last 5 months
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `T${d.getMonth() + 1}`;
      dataObj[label] = 0;
    }

    selectedEntity.qrs.forEach((qr: any) => {
      if (qr.status === 'CONSUMED' && qr.createdAt) {
        const date = qr.createdAt.toDate ? qr.createdAt.toDate() : new Date(qr.createdAt);
        const label = `T${date.getMonth() + 1}`;
        if (dataObj[label] !== undefined) {
          const kg = typeof qr.kg === 'number' ? qr.kg : (qr.pointsValue * KG_PER_POINT);
          dataObj[label] += kg;
        }
      }
    });

    const maxKg = Math.max(...Object.values(dataObj), 10);
    return Object.keys(dataObj).map(label => ({
      label,
      value: dataObj[label].toFixed(1),
      height: Math.max((dataObj[label] / maxKg) * 100, 5) // At least 5% height to show something
    }));
  }, [selectedEntity]);

  // Actions
  const closeDetail = () => setSelectedEntity(null);

  const handleDeleteEntity = () => {
    if (!selectedEntity) return;
    Alert.alert(
      'Cảnh báo',
      `Bạn có chắc muốn xóa TẤT CẢ ${selectedEntity.totalQR} mã QR của ${selectedEntity.name}? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const batch = writeBatch(db);
              selectedEntity.qrs.forEach(qr => {
                batch.delete(doc(db, 'qr_codes', qr.id));
              });
              await batch.commit();
              Alert.alert('Thành công', 'Đã xóa toàn bộ dữ liệu.');
              closeDetail();
              fetchEntityData();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa thực thể.');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleUpdatePoints = async () => {
    if (!selectedEntity || !newPointsVal) return;
    const pts = parseInt(newPointsVal, 10);
    if (isNaN(pts) || pts < 1) {
      Alert.alert('Lỗi', 'Số điểm phải lớn hơn 0.');
      return;
    }

    Alert.alert(
      'Sác nhận',
      `Cập nhật giá trị điểm của tất cả mã QR CHƯA QUÉT thành ${pts} EP?`,
      [
        { text: 'Hủy' },
        {
          text: 'Cập nhật',
          onPress: async () => {
            setEditingPoints(false);
            setIsProcessing(true);
            try {
              const batch = writeBatch(db);
              let count = 0;
              selectedEntity.qrs.forEach(qr => {
                if (qr.status === 'ACTIVE') {
                  batch.update(doc(db, 'qr_codes', qr.id), { pointsValue: pts });
                  count++;
                }
              });
              if (count > 0) await batch.commit();
              Alert.alert('Thành công', `Đã cập nhật ${count} mã QR.`);
              fetchEntityData();
            } catch (error) {
              Alert.alert('Lỗi', 'Cập nhật thất bại.');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteActiveQRs = () => {
    if (!selectedEntity) return;
    Alert.alert(
      'Giảm số lượng',
      `Xóa toàn bộ ${selectedEntity.activeQR} mã QR chưa quét? Việc này giúp dọn kho mã rác.`,
      [
        { text: 'Hủy' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const batch = writeBatch(db);
              selectedEntity.qrs.forEach(qr => {
                if (qr.status === 'ACTIVE') {
                  batch.delete(doc(db, 'qr_codes', qr.id));
                }
              });
              await batch.commit();
              Alert.alert('Thành công', 'Đã dọn dẹp mã chưa quét.');
              fetchEntityData();
            } catch (e) {
              Alert.alert('Lỗi', 'Chưa thể thực hiện.');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Theo dõi Thực thể</Text>
        <Text style={styles.subtitle}>Phân tích & Quản lý tổ chức tái chế</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={styles.typeFilters}>
          {(['all', 'company', 'individual'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, typeFilter === t && styles.filterChipActive]}
              onPress={() => setTypeFilter(t)}
            >
              <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>
                {t === 'all' ? 'Tất cả' : t === 'company' ? 'Công ty' : 'Cá nhân'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sortFilters}>
          {(['kg', 'qr', 'name'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.sortText, sortBy === s && styles.sortTextActive]}>
                {s === 'kg' ? '↓ Kg' : s === 'qr' ? '↓ QR' : 'A-Z'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary */}
      {!loading && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.count}</Text>
            <Text style={styles.summaryLabel}>Thực thể</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{summary.totalKg.toFixed(1)}k</Text>
            <Text style={styles.summaryLabel}>Tổng Rác</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.accent }]}>{summary.totalConsumed}</Text>
            <Text style={styles.summaryLabel}>QR đã quét</Text>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : filteredEntities.length === 0 ? (
        <View style={styles.center}><Text style={styles.emptyText}>Không tìm thấy</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredEntities.map((entity, idx) => (
            <TouchableOpacity
              key={`${entity.type}-${entity.name}-${idx}`}
              style={styles.entityCard}
              onPress={() => setSelectedEntity(entity)}
              activeOpacity={0.7}
            >
              {/* Left Icon */}
              <View style={[
                styles.entityIcon,
                { backgroundColor: entity.type === 'company' ? Colors.infoSurface : Colors.primarySurface }
              ]}>
                <MaterialCommunityIcons
                  name={entity.type === 'company' ? 'domain' : 'account-circle'}
                  size={24}
                  color={entity.type === 'company' ? Colors.info : Colors.primary}
                />
              </View>

              {/* Info */}
              <View style={styles.entityInfo}>
                <View style={styles.entityNameRow}>
                  <Text style={styles.entityName} numberOfLines={1}>{entity.name}</Text>
                </View>
                <View style={styles.entityStats}>
                  <Text style={styles.statItemText}>Kg: {entity.totalKg.toFixed(1)}</Text>
                  <Text style={styles.statItemText}> | QR: {entity.consumedQR}/{entity.totalQR}</Text>
                  <Text style={styles.statItemText}> | Tỉ lệ: {entity.completionRate}%</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${entity.completionRate}%` }]} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Detail Modal Overlay */}
      {selectedEntity && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={closeDetail} />
            <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'flex-end'}}>
            <View style={[styles.modalCard, { marginTop: 100 }]}>
              {isProcessing && (
                <View style={styles.processingOverlay}><ActivityIndicator size="large" color={Colors.primary}/></View>
              )}
              
              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: selectedEntity.type === 'company' ? Colors.infoSurface : Colors.primarySurface }]}>
                  <MaterialCommunityIcons
                    name={selectedEntity.type === 'company' ? 'domain' : 'account-circle'}
                    size={40}
                    color={selectedEntity.type === 'company' ? Colors.info : Colors.primary}
                  />
                </View>
                <TouchableOpacity style={styles.modalClose} onPress={closeDetail}>
                  <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalName}>{selectedEntity.name}</Text>
              <Text style={styles.modalType}>
                {selectedEntity.type === 'company' ? '🏢 Doanh nghiệp' : '👤 Cá nhân'}
              </Text>

              {/* Chart */}
              <View style={styles.chartBox}>
                <Text style={styles.chartTitle}>Biểu đồ Tái chế (Kg/tháng) 📈</Text>
                <View style={styles.chartBody}>
                  {entityChartData.length > 0 ? entityChartData.map((d, i) => (
                    <View key={i} style={styles.barItem}>
                      <Text style={styles.barVal}>{d.value}</Text>
                      <View style={[styles.barFill, { height: `${d.height}%` }]} />
                      <Text style={styles.barLabel}>{d.label}</Text>
                    </View>
                  )) : <Text style={styles.emptyText}>Chưa có dữ liệu</Text>}
                </View>
              </View>

              <Text style={styles.sectionHeader}>Thông số hiện tại</Text>
              <View style={styles.modalMetrics}>
                <MetricBox icon="leaf" color={Colors.primary} surface={Colors.primarySurface} label="Kg tái chế" value={`${selectedEntity.totalKg.toFixed(1)}`} />
                <MetricBox icon="cloud-check" color="#03A9F4" surface="#E3F2FD" label="CO₂ (kg)" value={`${(selectedEntity.totalKg * 2.5).toFixed(1)}`} />
                <MetricBox icon="qrcode-scan" color={Colors.success} surface={Colors.successSurface} label="QR đã quét" value={`${selectedEntity.consumedQR}`} />
                <MetricBox icon="qrcode" color={Colors.warning} surface={Colors.warningSurface} label="QR còn lại" value={`${selectedEntity.activeQR}`} />
              </View>

              <Text style={styles.sectionHeader}>Công cụ Quản trị</Text>
              
              <View style={styles.adminActionRow}>
                <AppButton 
                  title="Giảm QR rỗng" 
                  variant="outline" 
                  size="sm" 
                  style={{flex: 1}}
                  onPress={handleDeleteActiveQRs}
                  disabled={selectedEntity.activeQR === 0}
                />
                <AppButton 
                  title="Sửa điểm/QR" 
                  variant="secondary" 
                  size="sm" 
                  style={{flex: 1}}
                  onPress={() => setEditingPoints(!editingPoints)}
                />
              </View>
              
              {editingPoints && (
                <View style={styles.editCard}>
                  <Text style={styles.editLabel}>Chọn hoặc nhập điểm thay đổi cho toàn bộ <Text style={{fontWeight: 'bold', color: Colors.primary}}>{selectedEntity.activeQR} QR chưa quét</Text>:</Text>
                  
                  <View style={styles.presetPointsRow}>
                    {['10', '20', '50', '100'].map(pts => (
                      <TouchableOpacity 
                        key={pts} 
                        style={[styles.presetChip, newPointsVal === pts && styles.presetChipActive]}
                        onPress={() => setNewPointsVal(pts)}
                      >
                        <Text style={[styles.presetChipText, newPointsVal === pts && styles.presetChipTextActive]}>{pts} EP</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
                    <View style={styles.editInputWrapper}>
                      <TextInput 
                        style={styles.editInput} 
                        placeholder="Nhập số khác..." 
                        keyboardType="numeric"
                        value={newPointsVal}
                        onChangeText={setNewPointsVal}
                        maxLength={5}
                      />
                      <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.textTertiary} style={{position: 'absolute', right: 12}} />
                    </View>
                    <AppButton title="Lưu điểm" size="sm" onPress={handleUpdatePoints} disabled={!newPointsVal} style={{ minWidth: 90 }} />
                  </View>
                </View>
              )}

              <View style={{marginTop: Spacing.xl}}>
                <AppButton 
                  title="Xóa Hoàn Toàn Thực Thể Này" 
                  variant="outline" 
                   
                  style={{borderColor: Colors.error}}
                  textStyle={{color: Colors.error}}
                  onPress={handleDeleteEntity} 
                />
              </View>

            </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

function MetricBox({ icon, color, surface, label, value }: {
  icon: any; color: string; surface: string; label: string; value: string;
}) {
  return (
    <View style={[metricStyles.box, { backgroundColor: surface }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[metricStyles.value, { color }]}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  box: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md * 3) / 2 - 8,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  value: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center' },
  label: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  header: { paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.md, backgroundColor: '#1C2E20' },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 4 },

  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md },

  filterRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  typeFilters: { flexDirection: 'row', gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 11, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  sortFilters: { flexDirection: 'row', gap: 6 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  sortChipActive: { backgroundColor: Colors.secondarySurface, borderColor: Colors.secondary },
  sortText: { fontSize: 11, color: Colors.textSecondary },
  sortTextActive: { color: Colors.secondary, fontWeight: FontWeight.bold },

  summaryBar: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.lg, paddingVertical: Spacing.sm },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  summaryValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#1C2E20' },
  summaryLabel: { fontSize: 9, color: Colors.textTertiary, textTransform: 'uppercase', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 6 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },

  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.sm },
  entityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md },
  entityIcon: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  entityInfo: { flex: 1 },
  entityNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  entityName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  entityStats: { flexDirection: 'row', marginTop: 2 },
  statItemText: { fontSize: 10, color: Colors.textSecondary },
  progressBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },

  // Modal Custom
  modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 1000 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 48, elevation: 20 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 100, justifyContent: 'center', alignItems: 'center', borderRadius: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  modalIcon: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalClose: { padding: Spacing.sm, backgroundColor: Colors.background, borderRadius: Radius.full },
  modalName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalType: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  
  chartBox: { backgroundColor: Colors.background, borderRadius: Radius.lg, padding: Spacing.md, marginVertical: Spacing.md },
  chartTitle: { fontSize: 12, fontWeight: FontWeight.bold, color: Colors.textSecondary, marginBottom: Spacing.lg },
  chartBody: { height: 120, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 20, paddingTop: 10 },
  barItem: { alignItems: 'center', width: 40 },
  barVal: { fontSize: 9, color: Colors.textTertiary, marginBottom: 4 },
  barFill: { width: 28, backgroundColor: Colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4, position: 'absolute', bottom: -24 },

  sectionHeader: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.md, marginBottom: Spacing.sm },
  modalMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  adminActionRow: { flexDirection: 'row', gap: Spacing.sm },
  editCard: { backgroundColor: Colors.background, padding: Spacing.md, paddingVertical: Spacing.lg, borderRadius: Radius.lg, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  editLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 20 },
  presetPointsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  presetChip: { flex: 1, minWidth: 60, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  presetChipActive: { backgroundColor: Colors.primarySurface, borderColor: Colors.primary },
  presetChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.bold },
  presetChipTextActive: { color: Colors.primary },
  editInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  editInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, paddingVertical: 12 },
});
