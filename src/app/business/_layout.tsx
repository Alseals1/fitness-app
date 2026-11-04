import { Stack } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';
import { copy } from '../../lib/copy';
import { stackScreenOptions } from '../../lib/stackScreenOptions';

export default function BusinessLayout() {
  const { session } = useAuth();

  // The guard is a convenience: the submit functions refuse anyone not signed in.
  return (
    <Stack screenOptions={stackScreenOptions}>
      {/* Open to everyone: signed out it explains how to get an account. */}
      <Stack.Screen name="index" options={{ title: copy.business.title }} />
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="new" options={{ title: copy.business.newTitle }} />
        <Stack.Screen name="claim" options={{ title: copy.business.claimTitle }} />
      </Stack.Protected>
      {/* No back to the filled form: the forms replace themselves with this screen. */}
      <Stack.Screen name="submitted" options={{ title: copy.business.submittedTitle, headerBackVisible: false }} />
    </Stack>
  );
}
