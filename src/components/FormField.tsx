import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borderWidth, colors, minTouchTarget, radius, spacing, typography } from '../lib/theme';

/**
 * A labelled form field with its error under it. With `liveError`, the error is a polite live
 * region, so a screen reader reads it when it appears.
 */
export function FormField({
  label,
  error,
  liveError = false,
  children,
}: {
  label: string;
  error?: string;
  liveError?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      {children}
      {error ? (
        <Text
          style={formStyles.errorText}
          accessibilityLiveRegion={liveError ? 'polite' : undefined}
          aria-live={liveError ? 'polite' : undefined}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Shared styles for the place and business forms. */
export const formStyles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.mutedText },
  input: {
    minHeight: minTouchTarget,
    borderWidth: borderWidth.thin,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.input,
    color: colors.text,
  },
  // Two touch targets tall: room for about three lines before it scrolls.
  multiline: { minHeight: minTouchTarget * 2, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  hint: { ...typography.caption, color: colors.mutedText },
  errorText: { ...typography.caption, color: colors.danger },
  sectionTitle: { ...typography.title, color: colors.text },
});
