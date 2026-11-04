import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../../components/Button';
import { FormField, formStyles } from '../../components/FormField';
import { VerificationFields } from '../../components/VerificationFields';
import { filterClaimablePlaces, submitClaim } from '../../lib/business';
import {
  emptyVerification,
  validateClaim,
  type BusinessFormErrors,
  type VerificationValues,
} from '../../lib/businessForm';
import { copy } from '../../lib/copy';
import { PLACE_LIMITS } from '../../lib/placeForm';
import { AREA_LABELS, CATEGORY_LABELS } from '../../lib/placeOptions';
import { fetchApprovedPlaces, type PublicPlace } from '../../lib/places';
import { supabase } from '../../lib/supabase';
import { borderWidth, colors, minTouchTarget, opacity, radius, spacing, typography } from '../../lib/theme';

type Load = { state: 'loading' } | { state: 'failed'; message: string } | { state: 'ready'; places: PublicPlace[] };

export default function ClaimScreen() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<PublicPlace | null>(null);
  const [verification, setVerification] = useState<VerificationValues>(emptyVerification);
  const [errors, setErrors] = useState<BusinessFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadPlaces = useCallback(async () => {
    const result = await fetchApprovedPlaces(supabase);
    setLoad(result.ok ? { state: 'ready', places: result.data } : { state: 'failed', message: result.message });
  }, []);

  // Same as the results screen: load when the screen gains focus.
  useFocusEffect(
    useCallback(() => {
      loadPlaces();
    }, [loadPlaces]),
  );

  const onRetry = useCallback(() => {
    setLoad({ state: 'loading' });
    loadPlaces();
  }, [loadPlaces]);

  const matches = useMemo(
    () => (load.state === 'ready' ? filterClaimablePlaces(load.places, query) : []),
    [load, query],
  );

  function setVerificationField(key: keyof VerificationValues, value: string) {
    setVerification((current) => ({ ...current, [key]: value }));
  }

  async function onSend() {
    const checked = validateClaim(chosen, verification);
    setServerError(null);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setSending(true);
    const result = await submitClaim(supabase, checked.args);
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
        {chosen ? (
          <View style={styles.chosen}>
            <Text style={formStyles.label}>{copy.business.chosen}</Text>
            <Text style={styles.placeName}>{chosen.name}</Text>
            <Text style={formStyles.hint}>
              {CATEGORY_LABELS[chosen.category]} · {AREA_LABELS[chosen.area]}
            </Text>
            <Button
              label={copy.business.changePlace}
              variant="secondary"
              onPress={() => setChosen(null)}
              disabled={sending}
            />
          </View>
        ) : (
          <FormField label={copy.business.searchLabel} error={errors.place}>
            <TextInput
              style={[formStyles.input, errors.place && formStyles.inputError]}
              value={query}
              onChangeText={setQuery}
              placeholder={copy.business.searchPlaceholder}
              autoCorrect={false}
              maxLength={PLACE_LIMITS.nameMax}
              accessibilityLabel={copy.business.searchLabel}
            />
            <Text style={formStyles.hint}>{copy.business.searchHint}</Text>
            {load.state === 'loading' ? <Text style={formStyles.hint}>{copy.business.loading}</Text> : null}
            {load.state === 'failed' ? (
              <View style={styles.failed}>
                <Text style={formStyles.errorText}>{load.message}</Text>
                <Button label={copy.business.retry} variant="secondary" onPress={onRetry} />
              </View>
            ) : null}
            {load.state === 'ready' && query.trim().length > 0 && matches.length === 0 ? (
              <Text style={formStyles.hint}>{copy.business.noMatches}</Text>
            ) : null}
            {matches.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => {
                  setChosen(place);
                  setErrors({});
                }}
                accessibilityRole="button"
                accessibilityLabel={copy.business.chooseLabel(place.name)}
                style={({ pressed }) => [styles.match, pressed && styles.pressed]}
              >
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={formStyles.hint}>
                  {CATEGORY_LABELS[place.category]} · {AREA_LABELS[place.area]}
                </Text>
              </Pressable>
            ))}
          </FormField>
        )}

        {chosen ? (
          <>
            <VerificationFields
              values={verification}
              errors={errors}
              onChange={setVerificationField}
              showCertification={chosen.category === 'trainer'}
              disabled={sending}
            />
            {hasErrors ? <Text style={formStyles.errorText}>{copy.business.fixErrors}</Text> : null}
            {serverError ? (
              <Text style={formStyles.errorText} accessibilityLiveRegion="polite">
                {serverError}
              </Text>
            ) : null}
            <Button
              label={sending ? copy.business.sending : copy.business.send}
              onPress={onSend}
              disabled={sending}
            />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  chosen: { gap: spacing.xs },
  placeName: { ...typography.bodyStrong, color: colors.text },
  failed: { gap: spacing.sm, alignItems: 'flex-start' },
  match: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: borderWidth.thin,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  pressed: { opacity: opacity.pressed },
});
