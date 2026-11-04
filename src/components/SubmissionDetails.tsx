import { StyleSheet, Text, View } from 'react-native';

import { toSubmissionDetails, type Submission } from '../lib/admin';
import { copy } from '../lib/copy';
import { colors, fontSize, radius, spacing } from '../lib/theme';

/**
 * What a business sent with its listing or claim. Untrusted input: shown as plain, selectable
 * text, never as a link, so the admin copies a value instead of tapping it.
 */
export function SubmissionDetails({ submission }: { submission: Submission }) {
  const details = toSubmissionDetails(submission);
  if (details.length === 0) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{copy.queue.fromBusiness}</Text>
      {details.map((detail) => (
        <Text key={detail.label} style={styles.row} selectable>
          <Text style={styles.label}>{detail.label}: </Text>
          {detail.value}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: spacing.sm,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  title: { fontSize: fontSize.small, fontWeight: '700', color: colors.text },
  row: { fontSize: fontSize.small, color: colors.text },
  label: { fontWeight: '600', color: colors.mutedText },
});
