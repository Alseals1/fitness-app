import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { authErrorMessage, validateCredentials } from '../lib/auth';
import { copy } from '../lib/copy';
import { borderWidth, colors, minTouchTarget, radius, spacing, typography } from '../lib/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const checked = validateCredentials(email, password);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await signIn(checked.email, checked.password);
      if (signInError) {
        setError(authErrorMessage(signInError));
        setPassword('');
      }
      // On success the sign-in guard turns false and the router returns to the home screen.
    } catch {
      setError(authErrorMessage(null));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
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
          autoComplete="current-password"
          textContentType="password"
          editable={!submitting}
          onSubmitEditing={onSubmit}
          accessibilityLabel={copy.password}
        />
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={submitting ? copy.signingIn : copy.signIn}
          onPress={onSubmit}
          disabled={submitting}
        />
        <Link href="/sign-up" replace style={styles.link}>
          {copy.signUp.link}
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  form: { gap: spacing.sm },
  label: { ...typography.caption, color: colors.mutedText, marginTop: spacing.sm },
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
