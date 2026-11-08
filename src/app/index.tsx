import { Link, router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';
import { homeAccountView } from '../lib/adminCheck';
import { copy } from '../lib/copy';
import { firstRunOnboarding } from '../lib/onboarding';
import { colors, spacing, typography } from '../lib/theme';

// Onboarding opens by itself at most once per app launch, so backing out of it never loops.
let promptedThisLaunch = false;

export default function HomeScreen() {
  const { session, adminStatus, recheckAdmin, loading, signOut } = useAuth();
  const { preferences, loading: preferencesLoading } = usePreferences();
  const [retrying, setRetrying] = useState(false);
  const account = homeAccountView({ loading, signedIn: session !== null, status: adminStatus });

  const onRetry = async () => {
    setRetrying(true);
    try {
      await recheckAdmin();
    } finally {
      setRetrying(false);
    }
  };

  // First run: a signed-out person with nothing saved yet. This never blocks browsing; the
  // person can back out. A signed-in business or admin is never sent to the consumer quiz.
  // Only while home is in view: a deep link mounts home under the opened screen, and the quiz
  // waits until the person backs out to home.
  const signedIn = session !== null;
  const focused = useIsFocused();
  useEffect(() => {
    const next = firstRunOnboarding({
      preferencesLoading,
      stored: preferences,
      alreadyPrompted: promptedThisLaunch,
      authLoading: loading,
      signedIn,
      focused,
    });
    if (next === 'skip') {
      promptedThisLaunch = true;
    } else if (next === 'open') {
      promptedThisLaunch = true;
      router.push('/onboarding');
    }
  }, [preferencesLoading, preferences, loading, signedIn, focused]);

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

      {/* Always shown: businesses add or claim a listing here. */}
      <Link href="/business" style={styles.link}>
        {copy.business.listLink}
      </Link>

      {/* Browsing never needs an account: this only offers the sign-in for admins and businesses. */}
      {account === 'signIn' ? (
        <Link href="/sign-in" style={styles.link}>
          {copy.signIn}
        </Link>
      ) : null}
      {account === 'admin' ? (
        <Link href="/admin" style={styles.link}>
          {copy.admin}
        </Link>
      ) : null}
      {account === 'signOut' ? (
        <View style={styles.account}>
          <Button label={copy.signOut} variant="secondary" onPress={signOut} />
        </View>
      ) : null}
      {/* The admin check could not run (for example no network). Never shown as "not an admin". */}
      {account === 'checkFailed' ? (
        <View style={styles.account}>
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {copy.account.checkFailed}
          </Text>
          <Button
            label={retrying ? copy.account.retrying : copy.account.retry}
            disabled={retrying}
            onPress={onRetry}
          />
          <Button label={copy.signOut} variant="secondary" onPress={signOut} />
        </View>
      ) : null}
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
  title: { ...typography.heading, marginBottom: spacing.sm, color: colors.text },
  subtitle: { ...typography.body, textAlign: 'center', color: colors.mutedText },
  link: {
    marginTop: spacing.xl,
    ...typography.bodyStrong,
    color: colors.primary,
    padding: spacing.sm,
  },
  account: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  notice: { ...typography.body, textAlign: 'center', color: colors.mutedText },
});
