import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SoftColors, shadow } from '@/constants/design';

export function SoftBackdrop() {
  return (
    <>
      <LinearGradient
        colors={[SoftColors.pageTop, SoftColors.pageBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.glow, styles.glowTop]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowBottom]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowSide]} />
    </>
  );
}

export function SoftCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeading({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const displayTitle = title.replace(
    /^T(\d{1,2}) (th\u00E1ng \d{1,2} n\u0103m \d{4})$/u,
    '$1 $2'
  );

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{displayTitle}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function GlowButton({
  label,
  onPress,
  icon,
  style,
  disabled,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <TouchableOpacity
      style={[styles.glowButton, disabled && styles.glowButtonDisabled, style]}
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled}
    >
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      <Text style={[styles.glowButtonText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SoftBadge({
  icon,
  tint,
  style,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const color = tint ?? SoftColors.primary;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }, style]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
  );
}

export const softInputStyles = StyleSheet.create({
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: SoftColors.border,
    ...shadow.card,
  },
  inputIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6FFFA',
    marginRight: 12,
  },
});

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  glowTop: {
    width: 240,
    height: 240,
    backgroundColor: 'rgba(94, 231, 161, 0.22)',
    top: -40,
    right: -40,
  },
  glowBottom: {
    width: 280,
    height: 280,
    backgroundColor: 'rgba(144, 205, 255, 0.18)',
    bottom: -120,
    left: -70,
  },
  glowSide: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(100, 255, 192, 0.18)',
    top: '36%',
    left: -90,
  },
  card: {
    backgroundColor: SoftColors.cardTint,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: SoftColors.border,
    ...shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '800',
    color: SoftColors.text,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: SoftColors.primaryDark,
  },
  glowButton: {
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: SoftColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    ...shadow.glow,
  },
  glowButtonDisabled: {
    opacity: 0.65,
  },
  glowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
