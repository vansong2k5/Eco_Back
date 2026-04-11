import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, TextInputProps, ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@src/constants/colors';
import { FontSize } from '@src/constants/typography';
import { Spacing, Radius } from '@src/constants/spacing';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const AppInput: React.FC<AppInputProps> = ({
  label, error, helperText, leftIcon, rightIcon, onRightIconPress,
  containerStyle, ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? Colors.error
    : isFocused
    ? Colors.primary
    : Colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrapper, { borderColor }]}>
        {leftIcon && (
          <MaterialCommunityIcons
            name={leftIcon}
            size={20}
            color={isFocused ? Colors.primary : Colors.textTertiary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[styles.input, leftIcon && styles.inputWithLeft]}
          placeholderTextColor={Colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <MaterialCommunityIcons name={rightIcon} size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {helperText && !error && <Text style={styles.helper}>{helperText}</Text>}
    </View>
  );
};

export const AppPasswordInput: React.FC<Omit<AppInputProps, 'rightIcon' | 'secureTextEntry'>> = (props) => {
  const [visible, setVisible] = useState(false);
  return (
    <AppInput
      {...props}
      secureTextEntry={!visible}
      rightIcon={visible ? 'eye-off-outline' : 'eye-outline'}
      onRightIconPress={() => setVisible(!visible)}
    />
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
  leftIcon: { marginRight: Spacing.sm },
  rightIcon: { padding: Spacing.xs },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  inputWithLeft: { paddingLeft: 0 },
  error: { fontSize: FontSize.xs, color: Colors.error, marginTop: 4 },
  helper: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4 },
});
