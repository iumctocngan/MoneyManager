/**
 * Design System Tokens
 * All primitive colors, themed colors, and shared styles live here.
 */

export const Colors = {
  primary: '#36D879',
  primaryDark: '#18B55A',
  primaryLight: '#DFFAEA',
  secondary: '#88B7FF',
  expense: '#FF6B78',
  income: '#34D17A',
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
  danger: '#FF626F',
  warning: '#FFC94D',
  info: '#74A7FF',
};

export const SoftColors = {
  pageTop: '#E7FFF1',
  pageBottom: '#F9FDFF',
  pageBase: Colors.background,
  primary: Colors.primary,
  primaryDark: Colors.primaryDark,
  primaryLight: Colors.primaryLight,
  primaryGlow: 'rgba(54, 216, 121, 0.28)',
  text: Colors.text,
  muted: Colors.textSecondary,
  card: '#FFFFFF',
  cardTint: 'rgba(255, 255, 255, 0.82)',
  border: 'rgba(174, 213, 188, 0.35)',
  red: Colors.danger,
  yellow: Colors.warning,
  blue: Colors.info,
  mint: '#77E5BF',
  purple: '#C8A4FF',
  peach: '#FFC08A',
};

export const shadow = {
  soft: {
    shadowColor: 'rgba(84, 132, 105, 0.2)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  card: {
    shadowColor: 'rgba(115, 155, 132, 0.16)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  glow: {
    shadowColor: '#36D879',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 9,
  },
};
