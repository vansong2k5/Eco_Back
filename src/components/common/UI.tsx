import React from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Spacing, Radius, Shadow } from '@src/constants/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}
export const Card: React.FC<CardProps> = ({ children, style, padding = Spacing.lg }) => (
  <View style={[styles.card, { padding }, style]}>{children}</View>
);

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
export const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'inbox-outline', title, subtitle, action }) => (
  <View style={styles.emptyContainer}>
    <MaterialCommunityIcons name={icon} size={64} color={Colors.textTertiary} />
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action && <View style={{ marginTop: Spacing.lg }}>{action}</View>}
  </View>
);

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action}
  </View>
);

interface BadgeProps {
  label: string;
  color?: string;
  background?: string;
}
export const Badge: React.FC<BadgeProps> = ({
  label, color = Colors.primary, background = Colors.primarySurface,
}) => (
  <View style={[styles.badge, { backgroundColor: background }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

export const Divider: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.divider, style]} />
);

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, ...Shadow.md },
  emptyContainer: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semiBold, color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: FontSize.md * 1.5, maxWidth: 280 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.md },
});
