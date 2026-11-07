import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { copy } from '../lib/copy';
import {
  REPORT_NOTE_MAX,
  REPORT_REASON_OPTIONS,
  reportNoteLabel,
  validateReport,
  type ReportErrors,
  type ReportInput,
  type ReportReason,
  type ReportResult,
} from '../lib/reports';
import { borderWidth, colors, radius, spacing, typography } from '../lib/theme';
import { Button } from './Button';
import { FormField, formStyles } from './FormField';
import { OptionChips } from './OptionChips';

type Props = {
  /** Sends the report. On success (or "already reported") the parent replaces this form. */
  onSubmit: (input: ReportInput) => Promise<ReportResult>;
  onCancel: () => void;
};

/**
 * The "Report a problem" form on a place profile: one reason, an optional note (required for
 * Other), Send and Cancel. No account needed. A failed send keeps what was typed.
 */
export function ReportForm({ onSubmit, onCancel }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<ReportErrors>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const validation = validateReport({ reason, note });
    setSendError(null);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    const result = await onSubmit({ reason, note });
    // On success the parent unmounts this form, so only a failure updates it.
    if (!result.ok && !result.alreadyReported) {
      setBusy(false);
      setErrors(result.errors ?? {});
      setSendError(result.message);
    }
  };

  const noteLength = note.trim().length;
  const noteLabel = reportNoteLabel(reason);

  return (
    <View style={styles.box}>
      <Text style={styles.title} accessibilityRole="header">
        {copy.report.title}
      </Text>
      <Text style={formStyles.hint}>{copy.report.intro}</Text>

      <FormField label={copy.report.reasonLabel} error={errors.reason}>
        <OptionChips
          options={REPORT_REASON_OPTIONS}
          selected={reason ? [reason] : []}
          onToggle={(value) => {
            setReason(value);
            setErrors((current) => ({ ...current, reason: undefined }));
          }}
          disabled={busy}
          accessibilityLabel={copy.report.reasonLabel}
        />
      </FormField>

      <FormField label={noteLabel} error={errors.note}>
        <TextInput
          style={[formStyles.input, formStyles.multiline, styles.input, errors.note ? formStyles.inputError : null]}
          value={note}
          onChangeText={setNote}
          multiline
          // A little room over the limit, so pasted text is not cut silently; the counter turns red.
          maxLength={REPORT_NOTE_MAX + 50}
          editable={!busy}
          accessibilityLabel={noteLabel}
          accessibilityHint={copy.report.noteHint}
        />
        <Text style={formStyles.hint}>{copy.report.noteHint}</Text>
        <Text style={[formStyles.hint, noteLength > REPORT_NOTE_MAX && styles.over]}>
          {copy.report.noteCount(noteLength, REPORT_NOTE_MAX)}
        </Text>
      </FormField>

      {sendError ? (
        <Text style={formStyles.errorText} accessibilityLiveRegion="polite">
          {sendError}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button label={busy ? copy.report.sending : copy.report.send} disabled={busy} onPress={send} />
        <Button label={copy.report.cancel} variant="secondary" disabled={busy} onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    padding: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  // The box is a surface colour; the field stands out on the page colour.
  input: { backgroundColor: colors.background },
  over: { color: colors.danger },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
