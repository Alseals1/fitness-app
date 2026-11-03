import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { EMAIL_MAX, PASSWORD_MAX, signUpErrorMessage, signUpOutcome, validateSignUp } from '../lib/auth';
import { copy } from '../lib/copy';
import { colors, fontSize, radius, spacing } from '../lib/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
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
      // signedIn: the sign-up guard turns false and the router returns to the home screen.
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
        <Link href="/sign-in" replace style={styles.link}>
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
        <Link href="/sign-in" replace style={styles.link}>
          {copy.signUp.signInLink}
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  form: { gap: spacing.sm },
  body: { fontSize: fontSize.body, color: colors.text },
  label: { fontSize: fontSize.small, color: colors.mutedText, marginTop: spacing.sm },
  hint: { fontSize: fontSize.small, color: colors.mutedText },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text,
    minHeight: 44,
  },
  error: { color: colors.danger, fontSize: fontSize.small, marginVertical: spacing.xs },
  link: { fontSize: fontSize.body, color: colors.primary, fontWeight: '600', paddingVertical: spacing.sm },
});
