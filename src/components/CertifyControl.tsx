import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { CERTIFICATION_NAME_MAX } from '../lib/admin';
import { copy } from '../lib/copy';
import { borderWidth, colors, minTouchTarget, radius, spacing, typography } from '../lib/theme';
import { Button } from './Button';

type Props = {
  /** The place's current certification; null when it is not certified. */
  certificationName: string | null;
  /** What the business sent, to prefill the name. */
  suggestedName: string | null;
  onCertify: (name: string) => void;
  onUncertify: () => void;
  busy: boolean;
};

/**
 * Marks a trainer certified after the admin has seen proof off-app, or removes the mark.
 * Render it where showsCertifyControl says: the database certifies only trainers, but
 * removes the mark from any place.
 */
export function CertifyControl({ certificationName, suggestedName, onCertify, onUncertify, busy }: Props) {
  const [name, setName] = useState(suggestedName ?? '');

  if (certificationName) {
    return (
      <View style={styles.box}>
        <Text style={styles.certified}>{copy.queue.certifiedAs(certificationName)}</Text>
        <Button label={copy.queue.uncertify} variant="secondary" disabled={busy} onPress={onUncertify} />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={copy.queue.certificationPlaceholder}
        placeholderTextColor={colors.mutedText}
        maxLength={CERTIFICATION_NAME_MAX + 20}
        editable={!busy}
        accessibilityLabel={copy.queue.certificationPlaceholder}
      />
      <Button label={copy.queue.certify} variant="secondary" disabled={busy} onPress={() => onCertify(name)} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
  certified: { ...typography.label, color: colors.success },
  input: {
    alignSelf: 'stretch',
    minHeight: minTouchTarget,
    borderWidth: borderWidth.thin,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.input,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
