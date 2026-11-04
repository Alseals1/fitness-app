import { contrastRatio } from './contrast';
import { colors, contrastPairs, minTouchTarget, radius, shadow, typography } from './theme';

describe('theme', () => {
  it.each(contrastPairs.map((p) => [p.fg, p.bg, p.min] as const))('%s on %s is at least %s:1', (fg, bg, min) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });

  it('has only 6-digit hex colours', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('keeps touch targets at least 44pt', () => {
    expect(minTouchTarget).toBeGreaterThanOrEqual(44);
  });

  it('has no negative radius', () => {
    for (const value of Object.values(radius)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('uses boxShadow strings, never elevation', () => {
    for (const value of Object.values(shadow)) {
      expect(typeof value).toBe('string');
      expect(value).not.toMatch(/elevation/);
    }
  });

  it('gives every type style but input a line height taller than its size', () => {
    for (const [name, style] of Object.entries(typography)) {
      if (name === 'input') continue;
      expect('lineHeight' in style && style.lineHeight).toBeGreaterThan(style.fontSize);
    }
  });
});
