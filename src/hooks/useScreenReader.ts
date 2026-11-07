import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether a screen reader (VoiceOver, TalkBack) is running, kept current while the app runs.
 * Starts as `false` until the platform answers. On web, react-native-web cannot tell and always
 * reports `true`, so anything that waits for a screen reader waits there too.
 */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (active) setEnabled(value);
      })
      // Keep `false` if the platform cannot say.
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
