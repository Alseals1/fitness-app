/**
 * Shared colors, spacing and type sizes. Screens and components take their styles from
 * here instead of hard-coding values.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** Every colour role the app uses. A dark theme is a second `Palette` object, chosen at runtime later. */
export type Palette = {
  /** Screen background: a warm off-white. */
  background: string;
  /** Cards and outlined controls. */
  surface: string;
  /** The pressed fill of an outlined control or a link. */
  surfaceMuted: string;
  text: string;
  mutedText: string;
  /** The one accent: a deep teal. */
  primary: string;
  primaryPressed: string;
  /** Text on `primary` and `primaryPressed`. */
  primaryText: string;
  /** A soft teal tint. */
  primarySoft: string;
  /** Decorative card and divider borders only, never the edge of a control. */
  border: string;
  /** The edge of a control or an input: at least 3:1 on `background` and `surface`. */
  borderStrong: string;
  focusRing: string;
  danger: string;
  success: string;
  /** The "why this fits you" tags. */
  reasonBackground: string;
  reasonText: string;
  disabledBackground: string;
  disabledText: string;
};

/** The light palette. Every text pair here is checked in `theme.test.ts` (see `contrastPairs`). */
const lightPalette = {
  background: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEBE3',
  text: '#1F2A2A',
  mutedText: '#4F5B58',
  primary: '#1F5F5B',
  primaryPressed: '#174A47',
  primaryText: '#FFFFFF',
  primarySoft: '#E1EEEC',
  border: '#E4DFD6',
  borderStrong: '#8A8A80',
  focusRing: '#1F5F5B',
  danger: '#B3261E',
  success: '#2E6B3F',
  reasonBackground: '#E3EFEC',
  reasonText: '#1D4F4B',
  disabledBackground: '#E7E3DB',
  disabledText: '#5F635E',
} as const satisfies Palette;

// Dark mode is not built yet. When it is, pick the palette at runtime here; callers keep `colors`.
export const colors: Palette = lightPalette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Corner radii. Controls and inputs use `md`, cards use `lg`, chips and pills use `full`.
 * Pair every radius except `full` with `borderCurve: 'continuous'`.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/** The system rounded font: SF Pro Rounded on iOS, `ui-rounded` on web, the default (Roboto) on Android. */
export const fontFamily = Platform.select<string | undefined>({
  ios: 'ui-rounded',
  web: 'ui-rounded, system-ui, sans-serif',
  default: undefined,
});

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** The type scale. No colours here, so a dark palette never touches it. */
export const typography = {
  caption: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: fontWeight.regular },
  label: { fontFamily, fontSize: 13, lineHeight: 18, fontWeight: fontWeight.semibold },
  body: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: fontWeight.regular },
  bodyStrong: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: fontWeight.semibold },
  title: { fontFamily, fontSize: 20, lineHeight: 26, fontWeight: fontWeight.bold },
  heading: { fontFamily, fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold },
  display: { fontFamily, fontSize: 34, lineHeight: 40, fontWeight: fontWeight.bold },
  /** Text inside a `TextInput`. No line height: on iOS it pushes single-line input text off centre. */
  input: { fontFamily, fontSize: 16, fontWeight: fontWeight.regular },
} as const satisfies Record<string, TextStyle>;

export const borderWidth = {
  thin: 1,
  focus: 2,
} as const;

/** Shadows as `boxShadow` strings, tinted from `text`. Never the legacy shadow or elevation props. */
export const shadow = {
  none: 'none',
  card: '0 1px 3px rgba(31, 42, 42, 0.08)',
  raised: '0 4px 12px rgba(31, 42, 42, 0.10)',
} as const;

/** Only for plain pressable text links in screens. Controls show pressed with a colour instead. */
export const opacity = {
  pressed: 0.7,
} as const;

/** The smallest touch target, in points, for anything tappable. */
export const minTouchTarget = 44;

/** The keyboard and switch focus ring: drawn as an outline, so it never changes text contrast. */
export const focusRingStyle: ViewStyle = {
  outlineColor: colors.focusRing,
  outlineWidth: borderWidth.focus,
  outlineOffset: 2,
  outlineStyle: 'solid',
};

export type ContrastPair = { fg: keyof Palette; bg: keyof Palette; min: 4.5 | 3 };

/**
 * Every foreground and background pair the app renders, with its WCAG minimum: 4.5:1 for text,
 * 3:1 for control edges and the focus ring. `theme.test.ts` checks them all.
 */
export const contrastPairs: readonly ContrastPair[] = [
  ...(['text', 'mutedText', 'primary', 'danger', 'success'] as const).flatMap((fg) =>
    (['background', 'surface', 'surfaceMuted'] as const).map((bg): ContrastPair => ({ fg, bg, min: 4.5 })),
  ),
  { fg: 'primaryText', bg: 'primary', min: 4.5 },
  { fg: 'primaryText', bg: 'primaryPressed', min: 4.5 },
  { fg: 'reasonText', bg: 'reasonBackground', min: 4.5 },
  { fg: 'disabledText', bg: 'disabledBackground', min: 4.5 },
  { fg: 'borderStrong', bg: 'background', min: 3 },
  { fg: 'borderStrong', bg: 'surface', min: 3 },
  { fg: 'focusRing', bg: 'background', min: 3 },
  { fg: 'focusRing', bg: 'surface', min: 3 },
];

/**
 * The old type sizes. Kept only while the screens move to `typography`; removed in the same PR.
 * @deprecated Use `typography`.
 */
export const fontSize = {
  small: 13,
  body: 16,
  title: 20,
  heading: 28,
} as const;
