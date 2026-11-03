import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '../hooks/useAuth';
import { copy } from '../lib/copy';

function RootNavigator() {
  const { session, isAdmin } = useAuth();

  // The guards are a convenience: RLS and the admin_* functions are the real protection.
  // When a guard is false, Expo Router sends the user to the anchor route (index).
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: copy.appName }} />
      {/* Open to everyone: onboarding is optional and needs no account. */}
      <Stack.Screen name="onboarding" options={{ title: copy.onboarding.title }} />
      {/* Open to everyone: browsing results needs no account. */}
      <Stack.Screen name="results" options={{ title: copy.results.title }} />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ title: copy.signIn }} />
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
