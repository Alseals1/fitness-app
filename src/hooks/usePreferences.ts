import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { deviceStorage } from '../lib/deviceStorage';
import { loadPreferences, type Preferences } from '../lib/preferences';

/**
 * The saved onboarding answers, reloaded each time the screen comes into focus so a change
 * made on /onboarding shows on return. `preferences` is null when nothing is saved.
 * `loading` is true only for the first load, so the screen does not flicker on later ones.
 */
export function usePreferences(): { preferences: Preferences | null; loading: boolean } {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadPreferences(deviceStorage).then((loaded) => {
        if (!active) return;
        setPreferences(loaded);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return { preferences, loading };
}
