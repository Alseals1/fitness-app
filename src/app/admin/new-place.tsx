import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import { OptionChips } from '../../components/OptionChips';
import { createPlace } from '../../lib/admin';
import { copy } from '../../lib/copy';
import {
  emptyPlaceForm,
  PLACE_LIMITS,
  validatePlaceForm,
  type PlaceFormErrors,
  type PlaceFormValues,
} from '../../lib/placeForm';
import { AREA_OPTIONS, CATEGORY_OPTIONS, PRICE_OPTIONS, TAG_OPTIONS } from '../../lib/placeOptions';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, radius, spacing } from '../../lib/theme';

type TextField = 'name' | 'description' | 'schedule' | 'website_url' | 'contact_phone' | 'contact_email' | 'instagram_handle';

const TEXT_FIELDS: {
  field: TextField;
  label: string;
  input: Partial<ComponentProps<typeof TextInput>>;
}[] = [
  { field: 'name', label: copy.newPlace.name, input: { maxLength: PLACE_LIMITS.nameMax + 20, autoCapitalize: 'words' } },
  {
    field: 'description',
    label: copy.newPlace.description,
    input: { multiline: true, maxLength: PLACE_LIMITS.descriptionMax + 50 },
  },
  {
    field: 'schedule',
    label: copy.newPlace.schedule,
    input: { multiline: true, maxLength: PLACE_LIMITS.scheduleMax + 50 },
  },
  {
    field: 'website_url',
    label: copy.newPlace.website,
    input: { keyboardType: 'url', autoCapitalize: 'none', autoCorrect: false, inputMode: 'url' },
  },
  {
    field: 'contact_phone',
    label: copy.newPlace.phone,
    input: { keyboardType: 'phone-pad', inputMode: 'tel', maxLength: PLACE_LIMITS.phoneMax + 8 },
  },
  {
    field: 'contact_email',
    label: copy.newPlace.email,
    input: { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, inputMode: 'email' },
  },
  {
    field: 'instagram_handle',
    label: copy.newPlace.instagram,
    input: { autoCapitalize: 'none', autoCorrect: false, maxLength: 32 },
  },
];

export default function NewPlaceScreen() {
  const [values, setValues] = useState<PlaceFormValues>(emptyPlaceForm);
  const [errors, setErrors] = useState<PlaceFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof PlaceFormValues>(key: K, value: PlaceFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(tag: PlaceFormValues['tags'][number]) {
    setValues((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((t) => t !== tag) : [...current.tags, tag],
    }));
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
        <Field label={copy.newPlace.category} error={errors.category}>
          <OptionChips
            options={CATEGORY_OPTIONS}
            selected={values.category ? [values.category] : []}
            onToggle={(value) => set('category', value)}
            disabled={saving}
            accessibilityLabel={copy.newPlace.category}
          />
        </Field>
        <Field label={copy.newPlace.area} error={errors.area}>
          <OptionChips
            options={AREA_OPTIONS}
            selected={values.area ? [values.area] : []}
            onToggle={(value) => set('area', value)}
            disabled={saving}
            accessibilityLabel={copy.newPlace.area}
          />
        </Field>
        <Field label={copy.newPlace.price} error={errors.price_range}>
          <OptionChips
            options={PRICE_OPTIONS}
            selected={values.price_range ? [values.price_range] : []}
            onToggle={(value) => set('price_range', value)}
            disabled={saving}
            accessibilityLabel={copy.newPlace.price}
          />
        </Field>

        {TEXT_FIELDS.map(({ field, label, input }) => (
          <Field key={field} label={label} error={errors[field]}>
            <TextInput
              {...input}
              style={[styles.input, input.multiline && styles.multiline, errors[field] && styles.inputError]}
              value={values[field]}
              onChangeText={(text) => set(field, text)}
              editable={!saving}
              accessibilityLabel={label}
            />
          </Field>
        ))}
        <Text style={[styles.hint, errors.contact && styles.errorText]}>{errors.contact ?? copy.newPlace.contactHint}</Text>

        <Field label={copy.newPlace.tags}>
          <OptionChips
            options={TAG_OPTIONS}
            selected={values.tags}
            onToggle={toggleTag}
            disabled={saving}
            accessibilityLabel={copy.newPlace.tags}
            multiple
          />
        </Field>

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

        {hasErrors ? <Text style={styles.errorText}>{copy.newPlace.fixErrors}</Text> : null}
        {serverError ? (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {serverError}
          </Text>
        ) : null}
        <Button label={saving ? copy.newPlace.saving : copy.newPlace.save} onPress={onSave} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.small, fontWeight: '600', color: colors.mutedText },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  hint: { fontSize: fontSize.small, color: colors.mutedText },
  errorText: { fontSize: fontSize.small, color: colors.danger },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchLabel: { fontSize: fontSize.body, color: colors.text, flexShrink: 1 },
});
