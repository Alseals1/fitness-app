import { Stack } from 'expo-router';

import { copy } from '../../lib/copy';

export default function BusinessLayout() {
  return (
    <Stack>
      {/* Open to everyone: signed out it explains how to get an account. */}
      <Stack.Screen name="index" options={{ title: copy.business.title }} />
    </Stack>
  );
}
