import { Stack, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from '../hooks/useAuth';
import { MotionProvider } from '../hooks/useMotion';
import { useStackScreenOptions } from '../hooks/useStackScreenOptions';
import { authReturnPath } from '../lib/authRouting';
import { copy } from '../lib/copy';
import { colors } from '../lib/theme';

function RootNavigator() {
  const { session, isAdmin, ready } = useAuth();
  const screenOptions = useStackScreenOptions();
  const { returnTo } = useGlobalSearchParams<{ returnTo?: string | string[] }>();
  // Where sign-in and sign-up go once signed in. Allowlisted, so never an open redirect.
  const afterAuth = authReturnPath(returnTo);

  // Wait for the first auth load, so no guard redirects on a stale "signed out" or "not admin"
  // (for example a refresh on /admin or /business/new). The URL is kept and the Stack mounts on it.
  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator accessibilityLabel={copy.loading} color={colors.primary} />
      </View>
    );
  }

  // The guards are a convenience: RLS and the admin_* functions are the real protection.
  // When a guard is false, Expo Router replaces the screen with the group's `redirectTo`:
  // sign-in and sign-up return to `returnTo` (home by default), admin goes to the anchor (index).
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: copy.appName }} />
      {/* Open to everyone: onboarding is optional and needs no account. */}
      <Stack.Screen name="onboarding" options={{ title: copy.onboarding.title }} />
      {/* Open to everyone: browsing results needs no account. */}
      <Stack.Screen name="results" options={{ title: copy.results.title }} />
      {/* Open to everyone: the shortlist is on the device and needs no account. */}
      <Stack.Screen name="shortlist" options={{ title: copy.shortlist.title }} />
      {/* Open to everyone: a place profile needs no account. */}
      <Stack.Screen name="place/[id]" options={{ title: copy.place.title }} />
      {/* Open to everyone: signed out it explains how to get an account. Its own layout guards the forms. */}
      <Stack.Screen name="business" options={{ headerShown: false }} />
      <Stack.Protected guard={!session} redirectTo={afterAuth}>
        <Stack.Screen name="sign-in" options={{ title: copy.signIn }} />
        <Stack.Screen name="sign-up" options={{ title: copy.signUp.title }} />
      </Stack.Protected>
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <MotionProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </MotionProvider>
    </AuthProvider>
  );
}
