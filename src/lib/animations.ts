/**
 * The Reanimated objects built from the `motion` tokens. This is the only place a curve, a
 * transition or a layout animation is made, so components never invent their own timing.
 * The rules for when to use each live in `./motion`, which stays free of Reanimated.
 */
import { Easing, FadeIn, Keyframe, ReduceMotion, cubicBezier } from 'react-native-reanimated';
import type { CSSAnimationProperties, CSSTransitionProperties } from 'react-native-reanimated';

import type { Entrance } from './motion';
import { motion } from './theme';

/** The ease-out curve for CSS transitions and animations. */
export const cssEaseOut = cubicBezier(...motion.easeOut);

/** The ease-out curve for `withTiming` and keyframes. */
export const easeOut = Easing.bezier(...motion.easeOut);

/** Press feedback: the scale and the pressed colours ease together over `fast`. */
export const pressTransition: CSSTransitionProperties = {
  transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
  transitionDuration: motion.duration.fast,
  transitionTimingFunction: cssEaseOut,
};

/** Press feedback for a view that only scales (its colours are drawn elsewhere). */
export const pressScaleTransition: CSSTransitionProperties = {
  transitionProperty: 'transform',
  transitionDuration: motion.duration.fast,
  transitionTimingFunction: cssEaseOut,
};

/**
 * The layout animation for a row's entrance, or `undefined` for none. Each one ignores the
 * system setting (`ReduceMotion.Never`) because `useMotion` already picked the reduced form.
 */
export function enteringFor(entrance: Entrance) {
  switch (entrance.kind) {
    case 'none':
      return undefined;
    case 'fade':
      return FadeIn.duration(entrance.duration).reduceMotion(ReduceMotion.Never);
    case 'rise':
      return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: entrance.offsetY }] },
        100: { opacity: 1, transform: [{ translateY: 0 }], easing: easeOut },
      })
        .duration(entrance.duration)
        .delay(entrance.delay)
        .reduceMotion(ReduceMotion.Never);
  }
}

/** The skeleton pulse: opacity 1 ↔ `skeletonDimOpacity`, one beat per `pulse`, for as long as it shows. */
export const skeletonPulseStyle: CSSAnimationProperties = {
  animationName: { from: { opacity: 1 }, to: { opacity: motion.skeletonDimOpacity } },
  animationDuration: motion.duration.pulse,
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: cssEaseOut,
};

/** A place profile fading in over the skeleton it replaces. The same plain fade under Reduced Motion. */
export const profileEntering = FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never);
