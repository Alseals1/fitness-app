import { Stack } from 'expo-router';

import { useStackScreenOptions } from '../../hooks/useStackScreenOptions';
import { copy } from '../../lib/copy';

export default function AdminLayout() {
  const screenOptions = useStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: copy.admin }} />
      <Stack.Screen name="new-place" options={{ title: copy.newPlace.title }} />
    </Stack>
  );
}
