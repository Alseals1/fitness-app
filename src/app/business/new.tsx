import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '../../components/Button';
import { formStyles } from '../../components/FormField';
import { PlaceFields } from '../../components/PlaceFields';
import { VerificationFields } from '../../components/VerificationFields';
import { submitNewPlace } from '../../lib/business';
import {
  emptyVerification,
  validateNewListing,
  type BusinessFormErrors,
  type VerificationValues,
} from '../../lib/businessForm';
import { copy } from '../../lib/copy';
import { emptyPlaceFields, type PlaceFieldValues } from '../../lib/placeForm';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../lib/theme';

export default function NewListingScreen() {
  const [place, setPlace] = useState<PlaceFieldValues>(emptyPlaceFields);
  const [verification, setVerification] = useState<VerificationValues>(emptyVerification);
  const [errors, setErrors] = useState<BusinessFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function setPlaceField<K extends keyof PlaceFieldValues>(key: K, value: PlaceFieldValues[K]) {
    setPlace((current) => ({ ...current, [key]: value }));
  }

  function setVerificationField(key: keyof VerificationValues, value: string) {
    setVerification((current) => ({ ...current, [key]: value }));
  }

  async function onSend() {
    const checked = validateNewListing(place, verification);
    setServerError(null);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setSending(true);
    const result = await submitNewPlace(supabase, checked.args);
    setSending(false);
    if (result.ok) {
      // Replace, so Back never returns to the filled form.
      router.replace('/business/submitted');
    } else {
      setServerError(result.message);
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <PlaceFields values={place} errors={errors} onChange={setPlaceField} disabled={sending} />
        <VerificationFields
          values={verification}
          errors={errors}
          onChange={setVerificationField}
          showCertification={place.category === 'trainer'}
          disabled={sending}
        />

        {hasErrors ? <Text style={formStyles.errorText}>{copy.business.fixErrors}</Text> : null}
        {serverError ? (
          <Text style={formStyles.errorText} accessibilityLiveRegion="polite">
            {serverError}
          </Text>
        ) : null}
        <Button label={sending ? copy.business.sending : copy.business.send} onPress={onSend} disabled={sending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
});
