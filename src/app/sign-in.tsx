import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '../components/Button';
import { FormField, formStyles } from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { useMotion } from '../hooks/useMotion';
import { useWindowTop } from '../hooks/useWindowTop';
import { entranceStyle } from '../lib/animations';
import { authErrorMessage, EMAIL_MAX, PASSWORD_MAX } from '../lib/auth';
import { inputBorderColor } from '../lib/controlStyles';
import { copy } from '../lib/copy';
import { entranceFor, messageEntrance } from '../lib/motion';
import {
  firstInvalidField,
  validateSignInFields,
  withoutFieldError,
  type SignInField,
  type SignInFieldErrors,
} from '../lib/signInForm';
import { colors, spacing, textLinkStyle, typography } from '../lib/theme';

/** On native, an input carries its error as a hint, so focus on it reads the error too. */
const errorHint = (error: string | undefined) => (Platform.OS === 'web' ? undefined : error);

export default function SignInScreen() {
  const { signIn } = useAuth();
  const { reduced } = useMotion();
  const { ref: screenRef, onLayout, top } = useWindowTop();
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Counts failed submits. The form error's key, so its fade runs again on every failed attempt.
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<SignInField | null>(null);

  const inputRefs = { email: emailRef, password: passwordRef };

  async function onSubmit() {
    const checked = validateSignInFields(email, password);
    if (!checked.ok) {
      setFieldErrors(checked.errors);
      setFormError(null);
      setAttempt((n) => n + 1);
      const first = firstInvalidField(checked.errors);
      if (first) inputRefs[first].current?.focus();
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await signIn(checked.email, checked.password);
      if (signInError) {
        setFormError(authErrorMessage(signInError));
        setAttempt((n) => n + 1);
        setPassword('');
      }
      // On success the sign-in guard turns false and the router returns to the home screen.
    } catch {
      setFormError(authErrorMessage(null));
      setAttempt((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  function onEdit(field: SignInField, setValue: (value: string) => void) {
    return (value: string) => {
      setValue(value);
      setFieldErrors((errors) => withoutFieldError(errors, field));
      setFormError(null);
    };
  }

  function inputStyle(field: SignInField) {
    return [
      formStyles.input,
      styles.input,
      { borderColor: inputBorderColor({ focused: focusedField === field, invalid: !!fieldErrors[field] }) },
    ];
  }

  const onBlur = () => setFocusedField(null);

  return (
    <View ref={screenRef} onLayout={onLayout} style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={top} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.form, entranceStyle(entranceFor({ index: 0, reduced, animate: true }))]}>
            <View style={styles.intro}>
              <Text style={styles.title} accessibilityRole="header">
                {copy.signInScreen.title}
              </Text>
              <Text style={styles.body}>{copy.signInScreen.intro}</Text>
            </View>

            <FormField label={copy.email} error={fieldErrors.email} liveError>
              <TextInput
                ref={emailRef}
                style={inputStyle('email')}
                value={email}
                onChangeText={onEdit('email', setEmail)}
                onFocus={() => setFocusedField('email')}
                onBlur={onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                inputMode="email"
                maxLength={EMAIL_MAX}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!submitting}
                accessibilityLabel={copy.email}
                accessibilityHint={errorHint(fieldErrors.email)}
              />
            </FormField>

            <FormField label={copy.password} error={fieldErrors.password} liveError>
              <TextInput
                ref={passwordRef}
                style={inputStyle('password')}
                value={password}
                onChangeText={onEdit('password', setPassword)}
                onFocus={() => setFocusedField('password')}
                onBlur={onBlur}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                maxLength={PASSWORD_MAX}
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                editable={!submitting}
                accessibilityLabel={copy.password}
                accessibilityHint={errorHint(fieldErrors.password)}
              />
            </FormField>

            <View>
              {/* Always mounted, so screen readers on Android and web read each new error. */}
              <View accessibilityLiveRegion="polite" aria-live="polite">
                {formError ? (
                  <Animated.Text key={attempt} style={[styles.formError, entranceStyle(messageEntrance())]}>
                    {formError}
                  </Animated.Text>
                ) : null}
              </View>
              <Button
                label={submitting ? copy.signingIn : copy.signIn}
                onPress={onSubmit}
                disabled={submitting}
              />
            </View>

            <View style={styles.links}>
              <Link href="/sign-up" replace style={textLinkStyle}>
                {copy.signUp.link}
              </Link>
              <Link href="/results" replace style={textLinkStyle}>
                {copy.signInScreen.browseLink}
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.xl },
  form: { gap: spacing.lg },
  intro: { gap: spacing.sm },
  title: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.mutedText },
  input: { backgroundColor: colors.surface },
  formError: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  links: { gap: spacing.xs },
});
