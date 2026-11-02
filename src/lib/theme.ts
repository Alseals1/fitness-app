/**
 * Shared colors, spacing and type sizes. Screens and components take their styles from
 * here instead of hard-coding values.
 */
export const colors = {
  text: '#111',
  mutedText: '#444',
  background: '#fff',
  surface: '#f5f5f7',
  border: '#d0d0d5',
  primary: '#1f5eff',
  primaryText: '#fff',
  danger: '#c62828',
  success: '#2e7d32',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const fontSize = {
  small: 13,
  body: 16,
  title: 20,
  heading: 28,
} as const;

export const radius = 8;
