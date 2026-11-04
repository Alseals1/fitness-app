import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { REJECTION_REASON_MAX } from '../lib/admin';
import { copy } from '../lib/copy';
import { borderWidth, colors, minTouchTarget, radius, spacing, typography } from '../lib/theme';
import { Button } from './Button';

type Props = {
  onReject: (reason: string) => void;
  onCancel: () => void;
  busy: boolean;
};

/** The reason box for rejecting a place or a claim. The reason is never shown to the public. */
export function RejectReasonBox({ onReject, onCancel, busy }: Props) {
  const [reason, setReason] = useState('');
  return (
    <View style={styles.box}>
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
      <Text style={[styles.count, reason.trim().length > REJECTION_REASON_MAX && styles.over]}>
        {reason.trim().length}/{REJECTION_REASON_MAX}
      </Text>
      <View style={styles.actions}>
        <Button label={copy.queue.rejectSubmit} variant="danger" disabled={busy} onPress={() => onReject(reason)} />
        <Button label={copy.cancel} variant="secondary" disabled={busy} onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: spacing.md, gap: spacing.xs },
  input: {
    // Two touch targets tall: room for about three lines before it scrolls.
    minHeight: minTouchTarget * 2,
    borderWidth: borderWidth.thin,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: spacing.md,
    ...typography.input,
    color: colors.text,
    backgroundColor: colors.background,
    textAlignVertical: 'top',
  },
  count: { ...typography.caption, color: colors.mutedText },
  over: { color: colors.danger },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});
