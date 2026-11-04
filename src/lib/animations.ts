/**
 * The Reanimated objects built from the `motion` tokens. This is the only place a curve, a
 * transition or a layout animation is made, so components never invent their own timing.
 * The rules for when to use each live in `./motion`, which stays free of Reanimated.
 */
import { Easing, FadeIn, ReduceMotion, cubicBezier } from 'react-native-reanimated';
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
 * A row's entrance as a CSS animation, or `undefined` for none. A CSS animation rather than a
 * layout animation (`entering`): on web, Reanimated pins a custom-keyframe `entering` view to
 * `position: absolute` once it ends, which breaks a list's flow. `backwards` keeps a delayed row
 * hidden until its turn.
 */
export function entranceStyle(entrance: Entrance): CSSAnimationProperties | undefined {
  switch (entrance.kind) {
    case 'none':
      return undefined;
    case 'fade':
      return {
        animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
        animationDuration: entrance.duration,
        animationTimingFunction: cssEaseOut,
        animationFillMode: 'backwards',
      };
    case 'rise':
      return {
        animationName: {
          from: { opacity: 0, transform: [{ translateY: entrance.offsetY }] },
          to: { opacity: 1, transform: [{ translateY: 0 }] },
        },
        animationDuration: entrance.duration,
        animationDelay: entrance.delay,
        animationTimingFunction: cssEaseOut,
        animationFillMode: 'backwards',
      };
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
