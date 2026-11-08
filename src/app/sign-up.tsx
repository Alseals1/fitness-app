import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { EMAIL_MAX, PASSWORD_MAX, signUpErrorMessage, signUpOutcome, validateSignUp } from '../lib/auth';
import { authHref, authReturnPath } from '../lib/authRouting';
import { copy } from '../lib/copy';
import { borderWidth, colors, minTouchTarget, radius, spacing, typography } from '../lib/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  // Carried to the sign-in links, so switching screens still returns to the same place.
  const back = authReturnPath(returnTo);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const checked = validateSignUp(email, password);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const outcome = signUpOutcome(await signUp(checked.email, checked.password));
      if (outcome.kind === 'error') {
        setError(outcome.message);
        setPassword('');
      } else if (outcome.kind === 'confirmEmail') {
        setConfirmEmail(true);
        setPassword('');
      }
      // signedIn: the sign-up guard turns false and the root layout redirects to `returnTo` (home by default).
    } catch {
      setError(signUpErrorMessage(null));
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmEmail) {
    return (
      <View style={[styles.container, styles.form]}>
        <Text style={styles.body} accessibilityLiveRegion="polite">
          {copy.signUp.confirmEmail}
        </Text>
        <Link href={authHref('/sign-in', back)} replace style={styles.link}>
          {copy.signIn}
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.body}>{copy.signUp.intro}</Text>
        <Text style={styles.label}>{copy.email}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          inputMode="email"
          maxLength={EMAIL_MAX}
          editable={!submitting}
          accessibilityLabel={copy.email}
        />
        <Text style={styles.label}>{copy.password}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={PASSWORD_MAX}
          editable={!submitting}
          onSubmitEditing={onSubmit}
          accessibilityLabel={copy.password}
          accessibilityHint={copy.signUp.passwordHint}
        />
        <Text style={styles.hint}>{copy.signUp.passwordHint}</Text>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={submitting ? copy.signUp.submitting : copy.signUp.submit}
          onPress={onSubmit}
          disabled={submitting}
        />
        <Link href={authHref('/sign-in', back)} replace style={styles.link}>
          {copy.signUp.signInLink}
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  form: { gap: spacing.sm },
  body: { ...typography.body, color: colors.text },
  label: { ...typography.caption, color: colors.mutedText, marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.mutedText },
  input: {
    borderWidth: borderWidth.thin,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.input,
    color: colors.text,
    minHeight: minTouchTarget,
  },
  error: { ...typography.caption, color: colors.danger, marginVertical: spacing.xs },
  link: { ...typography.bodyStrong, color: colors.primary, paddingVertical: spacing.sm },
});
