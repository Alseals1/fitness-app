import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { showsCertifyControl, type Submission } from '../lib/admin';
import { copy } from '../lib/copy';
import { CATEGORY_LABELS } from '../lib/placeOptions';
import { borderWidth, colors, radius, spacing, typography } from '../lib/theme';
import { Button } from './Button';
import { CertifyControl } from './CertifyControl';
import { RejectReasonBox } from './RejectReasonBox';
import { SubmissionDetails } from './SubmissionDetails';

type Props = {
  claim: Submission;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onCertify: (name: string) => void;
  onUncertify: () => void;
  /** True while an action on this claim is running. */
  busy: boolean;
  /** The last action's error, shown on the card. */
  error: string | null;
};

/** One pending claim on an approved place, with its actions. */
export function ClaimCard({ claim, onApprove, onReject, onCertify, onUncertify, busy, error }: Props) {
  const [rejecting, setRejecting] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.small}>{copy.queue.claimOf}</Text>
      <Text style={styles.name}>{claim.place_name}</Text>
      <Text style={styles.meta}>{CATEGORY_LABELS[claim.place_category]}</Text>
      {claim.place_is_claimed ? <Text style={styles.warning}>{copy.queue.alreadyClaimed}</Text> : null}
      <SubmissionDetails submission={claim} />

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {showsCertifyControl(claim.place_category, claim.place_certification_name) ? (
        <CertifyControl
          certificationName={claim.place_certification_name}
          suggestedName={claim.certification_name}
          onCertify={onCertify}
          onUncertify={onUncertify}
          busy={busy}
        />
      ) : null}

      {rejecting ? (
        <RejectReasonBox onReject={onReject} onCancel={() => setRejecting(false)} busy={busy} />
      ) : (
        <View style={styles.actions}>
          <Button label={copy.queue.approve} disabled={busy} onPress={onApprove} />
          <Button label={copy.queue.reject} variant="secondary" disabled={busy} onPress={() => setRejecting(true)} />
        </View>
      )}
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
  small: { ...typography.caption, color: colors.mutedText },
  warning: { ...typography.label, color: colors.danger },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});
