import {
  celebrationFor,
  entranceFor,
  exitFor,
  pressScale,
  rowEntrance,
  saveFeedback,
  skeletonPulses,
  stackAnimation,
} from './motion';
import { motion } from './theme';

describe('pressScale', () => {
  it('is 1 when not pressed', () => {
    expect(pressScale('control', false, false)).toBe(1);
    expect(pressScale('card', false, false)).toBe(1);
  });

  it('is 1 under Reduced Motion, even when pressed', () => {
    expect(pressScale('control', true, true)).toBe(1);
    expect(pressScale('card', true, true)).toBe(1);
  });

  it('shrinks a pressed control and card by their tokens', () => {
    expect(pressScale('control', true, false)).toBe(0.97);
    expect(pressScale('card', true, false)).toBe(0.98);
  });
});

describe('entranceFor', () => {
  const maxDelay = (motion.entrance.maxStaggered - 1) * motion.entrance.stagger;

  it('does not animate rows after the first paint', () => {
    expect(entranceFor({ index: 0, reduced: false, animate: false })).toEqual({ kind: 'none' });
    expect(entranceFor({ index: 3, reduced: true, animate: false })).toEqual({ kind: 'none' });
  });

  it('only fades, with no delay, under Reduced Motion', () => {
    for (const index of [0, 1, 5, 50]) {
      expect(entranceFor({ index, reduced: true, animate: true })).toEqual({ kind: 'fade', duration: motion.duration.fast });
    }
  });

  it('rises with a 40 ms stagger', () => {
    const delays = [0, 1, 2, 3, 4, 5].map((index) => {
      const entrance = entranceFor({ index, reduced: false, animate: true });
      expect(entrance).toMatchObject({ kind: 'rise', duration: motion.duration.base, offsetY: motion.entrance.offsetY });
      return entrance.kind === 'rise' ? entrance.delay : -1;
    });
    expect(delays).toEqual([0, 40, 80, 120, 160, 200]);
  });

  it('caps the stagger so a long list is never slow', () => {
    expect(entranceFor({ index: 50, reduced: false, animate: true })).toMatchObject({ kind: 'rise', delay: 200 });
    for (let index = 0; index < 100; index += 1) {
      const entrance = entranceFor({ index, reduced: false, animate: true });
      expect(entrance.kind === 'rise' && entrance.delay).toBeLessThanOrEqual(maxDelay);
    }
  });
});

describe('saveFeedback', () => {
  it('blooms and buzzes when the user saves', () => {
    expect(saveFeedback({ wasSaved: false, isSaved: true, userPressed: true, reduced: false })).toEqual({
      bloom: true,
      haptic: true,
    });
  });

  it('keeps the haptic but drops the bloom under Reduced Motion', () => {
    expect(saveFeedback({ wasSaved: false, isSaved: true, userPressed: true, reduced: true })).toEqual({
      bloom: false,
      haptic: true,
    });
  });

  it('stays quiet when the user un-saves', () => {
    for (const reduced of [false, true]) {
      expect(saveFeedback({ wasSaved: true, isSaved: false, userPressed: true, reduced })).toEqual({
        bloom: false,
        haptic: false,
      });
    }
  });

  it('stays quiet when the state changes without a press (shortlist load, refocus)', () => {
    for (const reduced of [false, true]) {
      expect(saveFeedback({ wasSaved: false, isSaved: true, userPressed: false, reduced })).toEqual({
        bloom: false,
        haptic: false,
      });
      expect(saveFeedback({ wasSaved: true, isSaved: false, userPressed: false, reduced })).toEqual({
        bloom: false,
        haptic: false,
      });
    }
  });

  it('stays quiet when a press changes nothing', () => {
    expect(saveFeedback({ wasSaved: false, isSaved: false, userPressed: true, reduced: false })).toEqual({
      bloom: false,
      haptic: false,
    });
    expect(saveFeedback({ wasSaved: true, isSaved: true, userPressed: true, reduced: false })).toEqual({
      bloom: false,
      haptic: false,
    });
  });
});

describe('stackAnimation', () => {
  it('keeps the platform push, and fades under Reduced Motion', () => {
    expect(stackAnimation(false)).toBe('default');
    expect(stackAnimation(true)).toBe('fade');
  });
});

describe('skeletonPulses', () => {
  it('pulses, and stays still under Reduced Motion', () => {
    expect(skeletonPulses(false)).toBe(true);
    expect(skeletonPulses(true)).toBe(false);
  });
});

describe('celebrationFor', () => {
  it.each([
    [false, false, 'pop', motion.celebration.holdMs],
    [true, false, 'fade', motion.celebration.holdMs],
    [false, true, 'pop', null],
    [true, true, 'fade', null],
  ] as const)('reduced %s, screen reader %s: %s, closes after %s', (reduced, screenReader, entrance, autoCloseMs) => {
    expect(celebrationFor({ reduced, screenReader })).toEqual({ entrance, autoCloseMs });
  });

  it('closes after 1.4 s when no screen reader runs', () => {
    expect(celebrationFor({ reduced: false, screenReader: false }).autoCloseMs).toBe(1400);
  });
});

describe('rowEntrance', () => {
  it('staggers the rows on the first paint', () => {
    expect(rowEntrance({ index: 2, reduced: false, firstPaint: true, restored: false })).toEqual(
      entranceFor({ index: 2, reduced: false, animate: true }),
    );
  });

  it('brings a restored row in at once, with no stagger', () => {
    expect(rowEntrance({ index: 4, reduced: false, firstPaint: false, restored: true })).toEqual({
      kind: 'rise',
      duration: motion.duration.base,
      delay: 0,
      offsetY: motion.entrance.offsetY,
    });
  });

  it('shows other rows that mount later with no entrance', () => {
    expect(rowEntrance({ index: 1, reduced: false, firstPaint: false, restored: false })).toEqual({ kind: 'none' });
  });

  it('only fades a restored row under Reduced Motion', () => {
    expect(rowEntrance({ index: 3, reduced: true, firstPaint: false, restored: true })).toEqual({
      kind: 'fade',
      duration: motion.duration.fast,
    });
  });
});

describe('exitFor', () => {
  it('fades and collapses a removed row', () => {
    expect(exitFor({ reduced: false })).toEqual({ kind: 'collapse', duration: motion.duration.base });
  });

  it('only fades, quicker, under Reduced Motion', () => {
    expect(exitFor({ reduced: true })).toEqual({ kind: 'fade', duration: motion.duration.fast });
  });
});
