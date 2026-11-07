/**
 * The pure motion rules: which animation to run, and when. No Reanimated import, so these stay
 * plain jest-testable functions. `src/lib/animations.ts` turns the answers into Reanimated objects.
 */
import { motion } from './theme';

/** The scale of a control or a card: shrunk while pressed, never under Reduced Motion. */
export function pressScale(kind: keyof typeof motion.pressScale, pressed: boolean, reduced: boolean): number {
  return pressed && !reduced ? motion.pressScale[kind] : 1;
}

/** How a list row first appears. */
export type Entrance =
  | { kind: 'none' }
  | { kind: 'fade'; duration: number }
  | { kind: 'rise'; duration: number; delay: number; offsetY: number };

/**
 * A row's entrance. Only rows on the list's first paint animate (`animate`). Under Reduced Motion
 * they only fade, with no delay. Otherwise they rise, staggered, with the stagger capped so a
 * long list is never slow to appear.
 */
export function entranceFor({ index, reduced, animate }: { index: number; reduced: boolean; animate: boolean }): Entrance {
  if (!animate) return { kind: 'none' };
  if (reduced) return { kind: 'fade', duration: motion.duration.fast };
  const { stagger, maxStaggered, offsetY } = motion.entrance;
  return {
    kind: 'rise',
    duration: motion.duration.base,
    delay: Math.min(Math.max(index, 0), maxStaggered - 1) * stagger,
    offsetY,
  };
}

/**
 * The feedback for a change of a place's saved state. Only a save the user just pressed for gets
 * feedback: a bloom (not under Reduced Motion) and a haptic (always). Un-saving and changes the
 * user didn't press for (a shortlist load, a refocus) stay quiet.
 */
export function saveFeedback({
  wasSaved,
  isSaved,
  userPressed,
  reduced,
}: {
  wasSaved: boolean;
  isSaved: boolean;
  userPressed: boolean;
  reduced: boolean;
}): { bloom: boolean; haptic: boolean } {
  if (userPressed && !wasSaved && isSaved) return { bloom: !reduced, haptic: true };
  return { bloom: false, haptic: false };
}

/** The native stack transition: the platform's own push, or a plain fade under Reduced Motion. */
export function stackAnimation(reduced: boolean): 'fade' | 'default' {
  return reduced ? 'fade' : 'default';
}

/** Whether skeleton loaders pulse. They stay still under Reduced Motion. */
export function skeletonPulses(reduced: boolean): boolean {
  return !reduced;
}

/** The onboarding "done" moment: how the badge appears, and when the screen closes by itself. */
export type Celebration = { entrance: 'pop' | 'fade'; autoCloseMs: number | null };

/**
 * The onboarding "done" moment. The badge pops, or only fades under Reduced Motion. No auto-close
 * while a screen reader runs, so the panel is never cut off before it is read (WCAG 2.2.1).
 */
export function celebrationFor({ reduced, screenReader }: { reduced: boolean; screenReader: boolean }): Celebration {
  return {
    entrance: reduced ? 'fade' : 'pop',
    autoCloseMs: screenReader ? null : motion.celebration.holdMs,
  };
}
