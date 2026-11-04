import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '../hooks/useAuth';
import { copy } from '../lib/copy';
import { stackScreenOptions } from '../lib/stackScreenOptions';

function RootNavigator() {
  const { session, isAdmin } = useAuth();

  // The guards are a convenience: RLS and the admin_* functions are the real protection.
  // When a guard is false, Expo Router sends the user to the anchor route (index).
  return (
    <Stack screenOptions={stackScreenOptions}>
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
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ title: copy.signIn }} />
        <Stack.Screen name="sign-up" options={{ title: copy.signUp.title }} />
      </Stack.Protected>
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
