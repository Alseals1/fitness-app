import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { formStyles } from '../../components/FormField';
import { PlaceFields } from '../../components/PlaceFields';
import { createPlace } from '../../lib/admin';
import { copy } from '../../lib/copy';
import {
  emptyPlaceForm,
  validatePlaceForm,
  type PlaceFieldValues,
  type PlaceFormErrors,
  type PlaceFormValues,
} from '../../lib/placeForm';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function NewPlaceScreen() {
  const [values, setValues] = useState<PlaceFormValues>(emptyPlaceForm);
  const [errors, setErrors] = useState<PlaceFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof PlaceFormValues>(key: K, value: PlaceFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setPlaceField<K extends keyof PlaceFieldValues>(key: K, value: PlaceFieldValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSave() {
    const checked = validatePlaceForm(values);
    setServerError(null);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await createPlace(supabase, checked.args);
    setSaving(false);
    if (result.ok) {
      // The queue reloads when it regains focus.
      router.back();
    } else {
      setServerError(result.message);
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <PlaceFields values={values} errors={errors} onChange={setPlaceField} disabled={saving} />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{copy.newPlace.approveNow}</Text>
          <Switch
            value={values.approveNow}
            onValueChange={(value) => set('approveNow', value)}
            disabled={saving}
            accessibilityLabel={copy.newPlace.approveNow}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{copy.newPlace.verified}</Text>
          <Switch
            value={values.verified}
            onValueChange={(value) => set('verified', value)}
            disabled={saving}
            accessibilityLabel={copy.newPlace.verified}
          />
        </View>

        {hasErrors ? <Text style={formStyles.errorText}>{copy.newPlace.fixErrors}</Text> : null}
        {serverError ? (
          <Text style={formStyles.errorText} accessibilityLiveRegion="polite">
            {serverError}
          </Text>
        ) : null}
        <Button label={saving ? copy.newPlace.saving : copy.newPlace.save} onPress={onSave} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchLabel: { fontSize: fontSize.body, color: colors.text, flexShrink: 1 },
});
