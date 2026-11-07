import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { useFocusState } from '../hooks/useFocusState';
import { useMotion } from '../hooks/useMotion';
import { easeOut, pressTransition } from '../lib/animations';
import { copy } from '../lib/copy';
import { colorStyle, focusRing, saveButtonColors } from '../lib/controlStyles';
import { saveHaptic } from '../lib/haptics';
import { pressScale, saveFeedback } from '../lib/motion';
import { saveButtonLabel } from '../lib/shortlist';
import { borderWidth, minTouchTarget, motion, radius, spacing, typography } from '../lib/theme';

type Props = {
  name: string;
  saved: boolean;
  /** Toggles the place. Returns false when the tap was ignored (the shortlist is still loading). */
  onPress: () => boolean;
};

/**
 * Saves a place to the shortlist, or removes it. Filled when saved, outlined when not.
 * A save the user pressed for blooms (not under Reduced Motion) and gives one light haptic;
 * un-saving only eases the colour.
 */
export function SaveButton({ name, saved, onPress }: Props) {
  const { focused, onFocus, onBlur } = useFocusState();
  const { reduced } = useMotion();
  const bloom = useSharedValue(1);
  const bloomStyle = useAnimatedStyle(() => ({ transform: [{ scale: bloom.get() }] }));
  // Set by a press the shortlist accepted, so a change it did not cause (a load, a refocus) stays quiet.
  const userPressedRef = useRef(false);
  const prevSavedRef = useRef(saved);

  useEffect(() => {
    const feedback = saveFeedback({
      wasSaved: prevSavedRef.current,
      isSaved: saved,
      userPressed: userPressedRef.current,
      reduced,
    });
    prevSavedRef.current = saved;
    userPressedRef.current = false;
    if (feedback.bloom) {
      bloom.set(
        withSequence(
          withTiming(motion.bloomScale, { duration: motion.duration.fast, easing: easeOut }),
          withSpring(1, motion.spring),
        ),
      );
    }
    if (feedback.haptic) saveHaptic();
  }, [saved, reduced, bloom]);

  return (
    <Animated.View style={bloomStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        accessibilityLabel={saveButtonLabel(name, saved)}
        onPress={() => {
          if (onPress()) userPressedRef.current = true;
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[styles.pressable, focusRing(focused)]}
      >
        {({ pressed }) => {
          const controlColors = saveButtonColors({ pressed, focused, selected: saved });
          return (
            <Animated.View
              style={[
                styles.base,
                colorStyle(controlColors),
                pressTransition,
                { transform: [{ scale: pressScale('control', pressed, reduced) }] },
              ]}
            >
              <Text style={[styles.label, { color: controlColors.text }]}>
                {saved ? copy.shortlist.saved : copy.shortlist.save}
              </Text>
            </Animated.View>
          );
        }}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  base: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.bodyStrong, textAlign: 'center' },
});
