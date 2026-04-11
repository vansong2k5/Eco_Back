import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

export default function MapWebScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Điểm Thu Gom</Text>
      </View>
      
      <View style={[styles.mapContainer, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F2F1' }]}>
        <MaterialCommunityIcons name="google-maps" size={64} color={Colors.primary} />
        <Text style={{ marginTop: 16, fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary }}>
          Bản đồ không hỗ trợ trên Web
        </Text>
        <Text style={{ marginTop: 8, fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', maxWidth: 300 }}>
          Vui lòng sử dụng tính năng Bản đồ thu gom trên ứng dụng di động (Android / iOS).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
    zIndex: 1,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.textPrimary },
  mapContainer: { flex: 1, margin: Spacing.lg, borderRadius: 16, overflow: 'hidden' },
});
