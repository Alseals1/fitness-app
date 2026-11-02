import { Stack } from 'expo-router';

import { copy } from '../../lib/copy';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: copy.admin }} />
    </Stack>
  );
}
