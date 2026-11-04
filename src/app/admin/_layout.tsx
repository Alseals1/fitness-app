import { Stack } from 'expo-router';

import { copy } from '../../lib/copy';
import { stackScreenOptions } from '../../lib/stackScreenOptions';

export default function AdminLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: copy.admin }} />
      <Stack.Screen name="new-place" options={{ title: copy.newPlace.title }} />
    </Stack>
  );
}
