import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../lib/theme';

/** A labelled form field with its error under it. */
export function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      {children}
      {error ? <Text style={formStyles.errorText}>{error}</Text> : null}
    </View>
  );
}

/** Shared styles for the place and business forms. */
export const formStyles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.small, fontWeight: '600', color: colors.mutedText },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  hint: { fontSize: fontSize.small, color: colors.mutedText },
  errorText: { fontSize: fontSize.small, color: colors.danger },
  sectionTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
});
