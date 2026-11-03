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
  /** The "why this fits you" tags: dark blue on pale blue, well above 4.5:1. */
  reasonBackground: '#e8efff',
  reasonText: '#1a3a8f',
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

/** The smallest touch target, in points, for anything tappable. */
export const minTouchTarget = 44;
