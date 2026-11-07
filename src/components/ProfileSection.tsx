import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, spacing, typography } from '../lib/theme';

/**
 * One labelled section of the place profile ("About", "Get in touch", …). The label is a header,
 * so a screen reader can jump between sections.
 */
export function ProfileSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label} accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  label: { ...typography.label, fontWeight: fontWeight.bold, color: colors.mutedText },
});
