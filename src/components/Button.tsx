import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusState } from '../hooks/useFocusState';
import { useMotion } from '../hooks/useMotion';
import { pressTransition } from '../lib/animations';
import { buttonColors, colorStyle, focusRing } from '../lib/controlStyles';
import { pressScale } from '../lib/motion';
import { borderWidth, minTouchTarget, radius, spacing, typography } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** primary: filled. secondary: outlined. danger: outlined in red. */
  variant?: 'primary' | 'secondary' | 'danger';
  accessibilityHint?: string;
};

/**
 * The app's one button style. Pressed, disabled and focused each show with a colour or a ring, not
 * opacity. The visuals sit on an inner animated view, so a press scales and eases its colour on the
 * UI thread; the `Pressable` keeps the touch target and the focus ring.
 */
export function Button({ label, onPress, disabled = false, variant = 'primary', accessibilityHint }: Props) {
  const { focused, onFocus, onBlur } = useFocusState();
  const { reduced } = useMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.pressable, focusRing(focused)]}
    >
      {({ pressed }) => {
        const controlColors = buttonColors(variant, { pressed, focused, disabled });
        return (
          <Animated.View
            style={[
              styles.base,
              colorStyle(controlColors),
              pressTransition,
              { transform: [{ scale: pressScale('control', pressed, reduced) }] },
            ]}
          >
            <Text style={[styles.label, { color: controlColors.text }]}>{label}</Text>
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  base: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: borderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.bodyStrong, textAlign: 'center' },
});
