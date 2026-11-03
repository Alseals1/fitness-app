import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';
import { copy } from '../lib/copy';
import { shouldOpenOnboarding } from '../lib/onboarding';
import { colors, fontSize, spacing } from '../lib/theme';

// Onboarding opens by itself at most once per app launch, so backing out of it never loops.
let promptedThisLaunch = false;

export default function HomeScreen() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const { preferences, loading: preferencesLoading } = usePreferences();

  // First run: nothing saved yet. This never blocks browsing; the person can back out.
  useEffect(() => {
    const state = { loading: preferencesLoading, stored: preferences, alreadyPrompted: promptedThisLaunch };
    if (shouldOpenOnboarding(state)) {
      promptedThisLaunch = true;
      router.push('/onboarding');
    }
  }, [preferencesLoading, preferences]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.appName}</Text>
      <Text style={styles.subtitle}>{copy.tagline}</Text>

      {/* Always shown: browsing needs no account and no preferences. */}
      <Link href="/results" style={styles.link}>
        {copy.results.homeLink}
      </Link>

      {/* Always shown: the shortlist is on the device and needs no account. */}
      <Link href="/shortlist" style={styles.link}>
        {copy.shortlist.homeLink}
      </Link>

      {preferencesLoading ? null : (
        <Link href="/onboarding" style={styles.link}>
          {preferences === null ? copy.onboarding.setLink : copy.onboarding.changeLink}
        </Link>
      )}

      {/* Browsing never needs an account: this only offers the sign-in for admins. */}
      {loading ? null : !session ? (
        <Link href="/sign-in" style={styles.link}>
          {copy.signIn}
        </Link>
      ) : isAdmin ? (
        <Link href="/admin" style={styles.link}>
          {copy.admin}
        </Link>
      ) : (
        <View style={styles.account}>
          <Text style={styles.subtitle}>{copy.notAdmin}</Text>
          <Button label={copy.signOut} variant="secondary" onPress={signOut} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: fontSize.heading, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  subtitle: { fontSize: fontSize.body, textAlign: 'center', color: colors.mutedText },
  link: {
    marginTop: spacing.xl,
    fontSize: fontSize.body,
    color: colors.primary,
    fontWeight: '600',
    padding: spacing.sm,
  },
  account: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
});
