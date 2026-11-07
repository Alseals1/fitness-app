import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { visibleNotes, type ReportedPlace } from '../lib/admin';
import { copy } from '../lib/copy';
import { CATEGORY_LABELS } from '../lib/placeOptions';
import { REPORT_REASON_OPTIONS } from '../lib/reports';
import { borderWidth, colors, radius, spacing, typography } from '../lib/theme';
import { Button } from './Button';

type Props = {
  reported: ReportedPlace;
  onHide: () => void;
  onDismiss: () => void;
  /** True while an action on this card is running. */
  busy: boolean;
  /** The last action's error, shown on the card. */
  error: string | null;
};

/**
 * One place with open reports: how many, why, and the notes. The admin hides the place
 * (only while it is public) or dismisses the reports. Notes are untrusted: plain,
 * selectable text, never links.
 */
export function ReportedPlaceCard({ reported, onHide, onDismiss, busy, error }: Props) {
  const [confirmingHide, setConfirmingHide] = useState(false);
  const { notes, more } = visibleNotes(reported);
  const reasons = REPORT_REASON_OPTIONS.flatMap(({ value, label }) => {
    const count = reported.reasonCounts[value];
    return count ? [copy.queue.reportReasonCount(label, count)] : [];
  });
  const canHide = reported.placeStatus === 'approved';

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{reported.placeName}</Text>
      <Text style={styles.meta}>
        {[CATEGORY_LABELS[reported.placeCategory], copy.queue.placeStatus[reported.placeStatus]].join(' · ')}
      </Text>
      <Text style={styles.count}>{copy.queue.reportCount(reported.count)}</Text>
      <Text style={styles.small}>{reasons.join(' · ')}</Text>

      {notes.length > 0 ? (
        <View style={styles.notes}>
          <Text style={styles.small}>{copy.queue.reportNotes}</Text>
          {notes.map((note, index) => (
            <Text key={`${note.createdAt}-${index}`} style={styles.note} selectable>
              {note.text}
            </Text>
          ))}
          {more > 0 ? <Text style={styles.small}>{copy.queue.reportNotesMore(more)}</Text> : null}
        </View>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {canHide && confirmingHide ? (
          <>
            <Button label={copy.queue.confirmHidePlace} variant="danger" disabled={busy} onPress={onHide} />
            <Button label={copy.cancel} variant="secondary" disabled={busy} onPress={() => setConfirmingHide(false)} />
          </>
        ) : (
          <>
            {canHide ? (
              <Button
                label={copy.queue.hidePlace}
                variant="secondary"
                disabled={busy}
                onPress={() => setConfirmingHide(true)}
              />
            ) : null}
            <Button label={copy.queue.dismissReports} variant="secondary" disabled={busy} onPress={onDismiss} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  name: { ...typography.title, color: colors.text },
  meta: { ...typography.body, color: colors.mutedText },
  count: { ...typography.bodyStrong, color: colors.text },
  small: { ...typography.caption, color: colors.mutedText },
  notes: { gap: spacing.xs, marginTop: spacing.sm },
  note: { ...typography.body, color: colors.text, paddingLeft: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});
