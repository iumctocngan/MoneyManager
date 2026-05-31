/**
 * Design System Tokens
 * All primitive colors, themed colors, and shared styles live here.
 */

/**
 * Bảng màu nguyên thủy (primitive) của app, bao gồm cả light và dark mode.
 * Đây là nguồn duy nhất (single source of truth) cho màu sắc — không dùng hardcode màu ở nơi khác.
 */
export const Colors = {
  primary: '#36D879',
  primaryDark: '#18B55A',
  primaryLight: '#DFFAEA',
  secondary: '#88B7FF',
  // Màu ngữ nghĩa cho giao dịch
  expense: '#FF6B78',
  income: '#34D17A',
  // Nền và bề mặt (light / dark)
  background: '#F2FBF6',
  backgroundDark: '#0F1720',
  surface: '#FFFFFF',
  surfaceDark: '#1E2934',
  border: '#DCEFE3',
  borderDark: '#31404D',
  text: '#152032',
  textSecondary: '#6E7C8E',
  textDark: '#FFFFFF',
  textSecondaryDark: '#A9B4C2',
  card: '#FFFFFF',
  cardDark: '#1C2430',
  tabBar: '#FBFFFC',
  tabBarDark: '#16202B',
  // Màu trạng thái
  danger: '#FF626F',
  warning: '#FFC94D',
  info: '#74A7FF',
};

/**
 * Bảng màu "Soft" dành riêng cho design system hiện tại của app.
 * Tham chiếu Colors để đảm bảo nhất quán — không định nghĩa giá trị hex trùng lặp.
 */
export const SoftColors = {
  pageTop: '#E7FFF1',        // Gradient màu nền phía trên trang
  pageBottom: '#F9FDFF',     // Gradient màu nền phía dưới trang
  pageBase: Colors.background,
  primary: Colors.primary,
  primaryDark: Colors.primaryDark,
  primaryLight: Colors.primaryLight,
  primaryGlow: 'rgba(54, 216, 121, 0.28)', // Hiệu ứng glow xanh lá cho các element nổi bật
  text: Colors.text,
  muted: Colors.textSecondary,
  card: '#FFFFFF',
  cardTint: 'rgba(255, 255, 255, 0.82)', // Card với độ trong suốt nhẹ (glassmorphism)
  border: 'rgba(174, 213, 188, 0.35)',   // Border mờ để tạo cảm giác nhẹ nhàng
  red: Colors.danger,
  yellow: Colors.warning,
  blue: Colors.info,
  mint: '#77E5BF',
  purple: '#C8A4FF',
  peach: '#FFC08A',
};

/**
 * Preset shadow styles — dùng thống nhất trên toàn app thay vì định nghĩa inline.
 * elevation dành cho Android, shadowColor/shadowOffset/etc. dành cho iOS.
 */
export const shadow = {
  // Bóng nhẹ dùng cho các phần tử floating nhỏ
  soft: {
    shadowColor: 'rgba(84, 132, 105, 0.2)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  // Bóng dùng cho card thông thường
  card: {
    shadowColor: 'rgba(115, 155, 132, 0.16)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  // Bóng glow màu xanh lá — dùng cho nút/card chính (primary action)
  glow: {
    shadowColor: '#36D879',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 9,
  },
};
