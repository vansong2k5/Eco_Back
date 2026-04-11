import React, { useState } from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle, TouchableOpacityProps,
} from 'react-native';
import { Colors } from '@src/constants/colors';
import { FontSize, FontWeight } from '@src/constants/typography';
import { Radius, Spacing, Shadow } from '@src/constants/spacing';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AppButton: React.FC<ButtonProps> = ({
  title, variant = 'primary', size = 'md', isLoading = false,
  leftIcon, fullWidth = true, style, textStyle, disabled, ...rest
}) => {
  const isDisabled = disabled || isLoading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const labelStyle: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    isDisabled && styles.textDisabled,
    textStyle as TextStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.white}
          size="small"
        />
      ) : (
        <>
          {leftIcon}
          <Text style={labelStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },

  variant_primary: { backgroundColor: Colors.primary },
  variant_secondary: { backgroundColor: Colors.secondary },
  variant_outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  variant_ghost: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  variant_danger: { backgroundColor: Colors.error },

  size_sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, height: 40 },
  size_md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, height: 52 },
  size_lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, height: 60 },

  text: { fontWeight: FontWeight.bold, textAlign: 'center' },
  text_primary: { color: Colors.white },
  text_secondary: { color: Colors.white },
  text_outline: { color: Colors.primary },
  text_ghost: { color: Colors.primary },
  text_danger: { color: Colors.white },
  textDisabled: { color: Colors.textTertiary },

  textSize_sm: { fontSize: FontSize.sm },
  textSize_md: { fontSize: FontSize.md },
  textSize_lg: { fontSize: FontSize.lg },
});
