import { Text, TextInput } from 'react-native';

import { VERIFICATION_LIMITS, type VerificationErrors, type VerificationValues } from '../lib/businessForm';
import { copy } from '../lib/copy';
import { FormField, formStyles } from './FormField';

type Props = {
  values: VerificationValues;
  errors: VerificationErrors;
  onChange: (key: keyof VerificationValues, value: string) => void;
  /** Only for a trainer. */
  showCertification: boolean;
  disabled?: boolean;
};

/** The private details sent with a new listing or a claim. Only an admin sees them. */
export function VerificationFields({ values, errors, onChange, showCertification, disabled = false }: Props) {
  return (
    <>
      <Text style={formStyles.sectionTitle}>{copy.business.verificationTitle}</Text>
      <Text style={formStyles.hint}>{copy.business.verificationHint}</Text>
      <FormField label={copy.business.verificationEmail} error={errors.verification_email}>
        <TextInput
          style={[formStyles.input, errors.verification_email && formStyles.inputError]}
          value={values.verification_email}
          onChangeText={(text) => onChange('verification_email', text)}
          keyboardType="email-address"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          maxLength={VERIFICATION_LIMITS.emailMax + 20}
          editable={!disabled}
          accessibilityLabel={copy.business.verificationEmail}
        />
      </FormField>
      <FormField label={copy.business.verificationSocial} error={errors.verification_social}>
        <TextInput
          style={[formStyles.input, errors.verification_social && formStyles.inputError]}
          value={values.verification_social}
          onChangeText={(text) => onChange('verification_social', text)}
          placeholder={copy.business.verificationSocialPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={VERIFICATION_LIMITS.socialMax + 20}
          editable={!disabled}
          accessibilityLabel={copy.business.verificationSocial}
        />
      </FormField>
      <Text style={[formStyles.hint, errors.verification && formStyles.errorText]}>
        {errors.verification ?? copy.business.verificationRequiredHint}
      </Text>
      {showCertification ? (
        <FormField label={copy.business.certification} error={errors.certification_name}>
          <TextInput
            style={[formStyles.input, errors.certification_name && formStyles.inputError]}
            value={values.certification_name}
            onChangeText={(text) => onChange('certification_name', text)}
            placeholder={copy.business.certificationPlaceholder}
            maxLength={VERIFICATION_LIMITS.certificationMax + 20}
            editable={!disabled}
            accessibilityLabel={copy.business.certification}
            accessibilityHint={copy.business.certificationHint}
          />
          <Text style={formStyles.hint}>{copy.business.certificationHint}</Text>
        </FormField>
      ) : null}
      <FormField label={copy.business.note} error={errors.note}>
        <TextInput
          style={[formStyles.input, formStyles.multiline, errors.note && formStyles.inputError]}
          value={values.note}
          onChangeText={(text) => onChange('note', text)}
          multiline
          maxLength={VERIFICATION_LIMITS.noteMax + 50}
          editable={!disabled}
          accessibilityLabel={copy.business.note}
        />
      </FormField>
    </>
  );
}
