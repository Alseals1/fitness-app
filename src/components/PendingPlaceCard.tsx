import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { REJECTION_REASON_MAX } from '../lib/admin';
import { copy } from '../lib/copy';
import { AREA_LABELS, CATEGORY_LABELS, PRICE_LABELS, TAG_LABELS } from '../lib/placeOptions';
import type { PublicPlace } from '../lib/places';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import { Button } from './Button';

type Props = {
  place: PublicPlace;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onToggleVerified: () => void;
  onHide: () => void;
  /** True while an action on this place is running. */
  busy: boolean;
  /** The last action's error, shown on the card. */
  error: string | null;
};

/** One pending place in the admin queue, with its actions. */
export function PendingPlaceCard({ place, onApprove, onReject, onToggleVerified, onHide, busy, error }: Props) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmingHide, setConfirmingHide] = useState(false);

  const contacts = [place.website_url, place.contact_phone, place.contact_email, place.instagram_handle && `@${place.instagram_handle}`].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.name}>{place.name}</Text>
        {place.is_verified ? <Text style={styles.verified}>{copy.verified}</Text> : null}
      </View>
      <Text style={styles.meta}>
        {[CATEGORY_LABELS[place.category], AREA_LABELS[place.area], PRICE_LABELS[place.price_range]].join(' · ')}
      </Text>
      {place.description ? <Text style={styles.body}>{place.description}</Text> : null}
      {place.schedule ? <Text style={styles.small}>{place.schedule}</Text> : null}
      {contacts.map((contact) => (
        <Text key={contact} style={styles.small} selectable>
          {contact}
        </Text>
      ))}
      {place.tags.length > 0 ? (
        <Text style={styles.small}>{place.tags.map((tag) => TAG_LABELS[tag]).join(', ')}</Text>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {rejecting ? (
        <View style={styles.rejectBox}>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder={copy.queue.rejectPlaceholder}
            placeholderTextColor={colors.mutedText}
            maxLength={REJECTION_REASON_MAX + 50}
            multiline
            editable={!busy}
            accessibilityLabel={copy.queue.rejectPlaceholder}
          />
          <Text style={[styles.small, reason.trim().length > REJECTION_REASON_MAX && styles.errorText]}>
            {reason.trim().length}/{REJECTION_REASON_MAX}
          </Text>
          <View style={styles.actions}>
            <Button label={copy.queue.rejectSubmit} variant="danger" disabled={busy} onPress={() => onReject(reason)} />
            <Button
              label={copy.cancel}
              variant="secondary"
              disabled={busy}
              onPress={() => {
                setRejecting(false);
                setReason('');
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button label={copy.queue.approve} disabled={busy} onPress={onApprove} />
          <Button label={copy.queue.reject} variant="secondary" disabled={busy} onPress={() => setRejecting(true)} />
          <Button
            label={place.is_verified ? copy.queue.unverify : copy.queue.verify}
            variant="secondary"
            disabled={busy}
            onPress={onToggleVerified}
          />
          {confirmingHide ? (
            <>
              <Button label={copy.queue.confirmHide} variant="danger" disabled={busy} onPress={onHide} />
              <Button label={copy.cancel} variant="secondary" disabled={busy} onPress={() => setConfirmingHide(false)} />
            </>
          ) : (
            <Button label={copy.queue.hide} variant="secondary" disabled={busy} onPress={() => setConfirmingHide(true)} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: fontSize.title, fontWeight: '700', color: colors.text, flexShrink: 1 },
  verified: { fontSize: fontSize.small, fontWeight: '600', color: colors.success },
  meta: { fontSize: fontSize.body, color: colors.mutedText },
  body: { fontSize: fontSize.body, color: colors.text, marginTop: spacing.xs },
  small: { fontSize: fontSize.small, color: colors.mutedText },
  error: { fontSize: fontSize.small, color: colors.danger, marginTop: spacing.sm },
  errorText: { color: colors.danger },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  rejectBox: { marginTop: spacing.md, gap: spacing.xs },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.background,
    textAlignVertical: 'top',
  },
});
