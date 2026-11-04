import { Pressable, StyleSheet, Text } from 'react-native';

import { useFocusState } from '../hooks/useFocusState';
import { buttonColors, colorStyle, focusRing } from '../lib/controlStyles';
import { borderWidth, minTouchTarget, radius, spacing, typography } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** primary: filled. secondary: outlined. danger: outlined in red. */
  variant?: 'primary' | 'secondary' | 'danger';
  accessibilityHint?: string;
};

/** The app's one button style. Pressed, disabled and focused each show with a colour or a ring, not opacity. */
export function Button({ label, onPress, disabled = false, variant = 'primary', accessibilityHint }: Props) {
  const { focused, onFocus, onBlur } = useFocusState();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={({ pressed }) => [
        styles.base,
        colorStyle(buttonColors(variant, { pressed, focused, disabled })),
        focusRing(focused),
      ]}
    >
      {({ pressed }) => (
        <Text style={[styles.label, { color: buttonColors(variant, { pressed, focused, disabled }).text }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
