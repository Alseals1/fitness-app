import { contrastRatio } from './contrast';
import { colors, contrastPairs, minTouchTarget, motion, radius, shadow, size, typography } from './theme';

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

  it('keeps durations ordered and short', () => {
    const { fast, base, slow } = motion.duration;
    expect(fast).toBeLessThan(base);
    expect(base).toBeLessThan(slow);
    for (const value of [fast, base, slow]) {
      expect(value).toBeLessThanOrEqual(400);
    }
  });

  it('uses a spring that never overshoots', () => {
    expect(motion.spring.dampingRatio).toBeGreaterThanOrEqual(1);
  });

  it('keeps press scales gentle', () => {
    for (const value of Object.values(motion.pressScale)) {
      expect(value).toBeGreaterThanOrEqual(0.95);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps the save bloom small', () => {
    expect(motion.bloomScale).toBeGreaterThan(1);
    expect(motion.bloomScale).toBeLessThanOrEqual(1.1);
  });

  it('keeps large chips at least a touch target tall', () => {
    expect(size.chipLarge).toBeGreaterThanOrEqual(minTouchTarget);
  });

  it('has only positive shape sizes', () => {
    for (const value of Object.values(size)) {
      expect(value).toBeGreaterThan(0);
    }
  });

  it('keeps the onboarding celebration gentle and quick', () => {
    expect(motion.celebration.fromScale).toBeGreaterThan(0.5);
    expect(motion.celebration.fromScale).toBeLessThan(1);
    expect(motion.celebration.holdMs).toBeGreaterThanOrEqual(800);
    expect(motion.celebration.holdMs).toBeLessThanOrEqual(2000);
  });

  it('has a valid ease-out curve', () => {
    expect(motion.easeOut).toHaveLength(4);
    const [x1, , x2] = motion.easeOut;
    for (const x of [x1, x2]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  });

  it('gives every type style but input a line height taller than its size', () => {
    for (const [name, style] of Object.entries(typography)) {
      if (name === 'input') continue;
      expect('lineHeight' in style && style.lineHeight).toBeGreaterThan(style.fontSize);
    }
  });
});
