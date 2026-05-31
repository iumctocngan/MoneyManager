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

/**
 * Nền gradient toàn màn hình với các vòng sáng (glow) trang trí.
 * Dùng `StyleSheet.absoluteFill` để phủ kín container mà không ảnh hưởng layout.
 * `pointerEvents="none"` đảm bảo các glow blob không chặn sự kiện chạm.
 */
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

/**
 * Card container với bo góc, viền mềm và đổ bóng nhẹ — đơn vị UI cơ bản của design system.
 * Nhận `style` để override hoặc bổ sung style từ nơi dùng.
 */
export function SoftCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * Tiêu đề section kèm nút hành động tuỳ chọn (ví dụ "Xem tất cả").
 * Regex trong `displayTitle` chuẩn hoá chuỗi ngày dạng "T1 tháng 1 năm 2024"
 * thành "1 tháng 1 năm 2024" — loại bỏ tiền tố "T" thừa từ `toLocaleDateString`.
 */
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

/**
 * Nút CTA chính với màu nền primary và glow shadow.
 * Hỗ trợ icon Ionicons tuỳ chọn bên trái label.
 * Khi `disabled`, giảm opacity thay vì ẩn — giữ layout ổn định.
 */
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

/**
 * Badge icon hình tròn với nền bán trong suốt theo màu `tint`.
 * Hậu tố `22` (hex) tương đương ~13% opacity — đủ nhìn thấy màu nhưng không lấn át icon.
 */
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

/**
 * Style dùng chung cho các ô nhập liệu (TextInput) theo design system.
 * Export ra ngoài để các màn hình form có thể tái sử dụng mà không copy style.
 */
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
  // Glow góc trên phải — màu xanh lá nhạt
  glowTop: {
    width: 240,
    height: 240,
    backgroundColor: 'rgba(94, 231, 161, 0.22)',
    top: -40,
    right: -40,
  },
  // Glow góc dưới trái — màu xanh dương nhạt
  glowBottom: {
    width: 280,
    height: 280,
    backgroundColor: 'rgba(144, 205, 255, 0.18)',
    bottom: -120,
    left: -70,
  },
  // Glow giữa bên trái — tạo chiều sâu cho nền
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
