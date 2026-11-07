import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * One light confirming tap: a place saved, or onboarding finished. Android uses `performAndroidHapticsAsync`, which needs no
 * VIBRATE permission (`app.json` blocks it). Web has none. A failure is ignored: the haptic is
 * never the only sign that something was saved.
 */
export function saveHaptic(): void {
  const done =
    Platform.OS === 'ios'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Platform.OS === 'android'
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
        : undefined;
  done?.catch(() => {});
}
