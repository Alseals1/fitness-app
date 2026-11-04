/**
 * WCAG 2.x contrast math, used by the theme and control-colour tests to prove every text and
 * background pair the app renders is readable.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#RGB` or `#RRGGBB` colour, from 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const match = HEX.exec(hex);
  if (!match) throw new Error(`Not a #RGB or #RRGGBB colour: ${hex}`);
  let digits = match[1];
  if (digits.length === 3) digits = digits.replace(/./g, (d) => d + d);
  const r = parseInt(digits.slice(0, 2), 16);
  const g = parseInt(digits.slice(2, 4), 16);
  const b = parseInt(digits.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** The contrast ratio of two colours, from 1 (same) to 21 (black on white). Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
