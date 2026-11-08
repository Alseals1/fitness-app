import type { ComponentProps } from 'react';
import { Text, TextInput } from 'react-native';

import { copy } from '../lib/copy';
import { PLACE_LIMITS, type PlaceFieldValues, type PlaceFormErrors } from '../lib/placeForm';
import { AREA_OPTIONS, CATEGORY_OPTIONS, PRICE_OPTIONS, TAG_OPTIONS } from '../lib/placeOptions';
import type { FieldRegister } from '../hooks/useScrollToFirstError';
import { FormField, formStyles } from './FormField';
import { OptionChips } from './OptionChips';

type TextField = 'name' | 'description' | 'schedule' | 'website_url' | 'contact_phone' | 'contact_email' | 'instagram_handle';

// maxLength sits a little above each limit, so a person sees the error instead of losing text.
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
    input: {
      keyboardType: 'url',
      autoCapitalize: 'none',
      autoCorrect: false,
      inputMode: 'url',
      maxLength: PLACE_LIMITS.websiteMax + 20,
    },
  },
  {
    field: 'contact_phone',
    label: copy.newPlace.phone,
    input: { keyboardType: 'phone-pad', inputMode: 'tel', maxLength: PLACE_LIMITS.phoneMax + 8 },
  },
  {
    field: 'contact_email',
    label: copy.newPlace.email,
    input: {
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      autoCorrect: false,
      inputMode: 'email',
      maxLength: PLACE_LIMITS.emailMax + 20,
    },
  },
  {
    field: 'instagram_handle',
    label: copy.newPlace.instagram,
    input: { autoCapitalize: 'none', autoCorrect: false, maxLength: PLACE_LIMITS.instagramMax + 2 },
  },
];

type Props = {
  values: PlaceFieldValues;
  errors: PlaceFormErrors;
  onChange: <K extends keyof PlaceFieldValues>(key: K, value: PlaceFieldValues[K]) => void;
  disabled?: boolean;
  /** Lets the form scroll to and focus a field with an error. Tags never have one. */
  register?: FieldRegister;
};

/** The place fields: category, part of town, price, the text fields and tags. Used by the admin and business forms. */
export function PlaceFields({ values, errors, onChange, disabled = false, register }: Props) {
  const category = register?.('category');
  const area = register?.('area');
  const price = register?.('price_range');
  function toggleTag(tag: PlaceFieldValues['tags'][number]) {
    onChange('tags', values.tags.includes(tag) ? values.tags.filter((t) => t !== tag) : [...values.tags, tag]);
  }

  return (
    <>
      <FormField ref={category?.container} label={copy.newPlace.category} error={errors.category}>
        <OptionChips
          firstChipRef={category?.chip}
          options={CATEGORY_OPTIONS}
          selected={values.category ? [values.category] : []}
          onToggle={(value) => onChange('category', value)}
          disabled={disabled}
          accessibilityLabel={copy.newPlace.category}
        />
      </FormField>
      <FormField ref={area?.container} label={copy.newPlace.area} error={errors.area}>
        <OptionChips
          firstChipRef={area?.chip}
          options={AREA_OPTIONS}
          selected={values.area ? [values.area] : []}
          onToggle={(value) => onChange('area', value)}
          disabled={disabled}
          accessibilityLabel={copy.newPlace.area}
        />
      </FormField>
      <FormField ref={price?.container} label={copy.newPlace.price} error={errors.price_range}>
        <OptionChips
          firstChipRef={price?.chip}
          options={PRICE_OPTIONS}
          selected={values.price_range ? [values.price_range] : []}
          onToggle={(value) => onChange('price_range', value)}
          disabled={disabled}
          accessibilityLabel={copy.newPlace.price}
        />
      </FormField>

      {TEXT_FIELDS.map(({ field, label, input }) => {
        const registration = register?.(field);
        return (
          <FormField key={field} ref={registration?.container} label={label} error={errors[field]}>
            <TextInput
              {...input}
              ref={registration?.input}
              style={[formStyles.input, input.multiline && formStyles.multiline, errors[field] && formStyles.inputError]}
              value={values[field]}
              onChangeText={(text) => onChange(field, text)}
              editable={!disabled}
              accessibilityLabel={label}
            />
          </FormField>
        );
      })}
      <Text style={[formStyles.hint, errors.contact && formStyles.errorText]}>
        {errors.contact ?? copy.newPlace.contactHint}
      </Text>

      <FormField label={copy.newPlace.tags}>
        <OptionChips
          options={TAG_OPTIONS}
          selected={values.tags}
          onToggle={toggleTag}
          disabled={disabled}
          accessibilityLabel={copy.newPlace.tags}
          multiple
        />
      </FormField>
    </>
  );
}
