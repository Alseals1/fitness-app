import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ProfileFact } from '../lib/placeProfile';
import { borderWidth, cardStyle, colors, spacing, typography } from '../lib/theme';

/**
 * The profile's "At a glance" card: one row per fact, its label above its value. Label above
 * value (never side by side) so large text wraps instead of being squeezed.
 */
export function FactList({ facts }: { facts: ProfileFact[] }) {
  return (
    <View style={styles.card}>
      {facts.map((fact, index) => (
        <Fragment key={fact.key}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <Text style={styles.label}>{fact.label}</Text>
            <Text style={styles.value}>{fact.value}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Less vertical card padding: each row brings its own.
  card: { ...cardStyle, paddingVertical: spacing.xs },
  row: { paddingVertical: spacing.md, gap: spacing.xs },
  // Decorative: separates rows, never the edge of a control.
  divider: { height: borderWidth.thin, backgroundColor: colors.border },
  label: { ...typography.label, color: colors.mutedText },
  value: { ...typography.body, color: colors.text },
});
