import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { FinishCelebration } from '../components/FinishCelebration';
import { OptionChips } from '../components/OptionChips';
import { StepProgress } from '../components/StepProgress';
import { useMotion } from '../hooks/useMotion';
import { useScreenReader } from '../hooks/useScreenReader';
import { entranceStyle } from '../lib/animations';
import { copy } from '../lib/copy';
import { deviceStorage } from '../lib/deviceStorage';
import { saveHaptic } from '../lib/haptics';
import { celebrationFor, entranceFor, type Celebration } from '../lib/motion';
import {
  ONBOARDING_STEPS,
  afterSave,
  exitOnboarding,
  isLastStep,
  primaryActionLabel,
  selectedValues,
  stepAnnouncement,
  toggleAnswer,
  type SaveTrigger,
} from '../lib/onboarding';
import { emptyPreferences, loadPreferences, savePreferences, type Preferences } from '../lib/preferences';
import { colors, spacing, typography } from '../lib/theme';

/**
 * Five skippable questions, one at a time, then a short "You're all set" moment. The answers stay
 * on this device; nothing is sent anywhere.
 */
export default function OnboardingScreen() {
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<'asking' | 'saving'>('asking');
  const [error, setError] = useState<string | null>(null);
  // False until the first step change: the first question arrives with the stack push, not its own entrance.
  const [moved, setMoved] = useState(false);
  // Non-null once Done has saved: the "done" moment is showing.
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const { reduced } = useMotion();
  const screenReader = useScreenReader();
  const insets = useSafeAreaInsets();
  // The screen closes once, even if the timer and "Continue" both fire.
  const leftRef = useRef(false);

  // Start from the saved answers, so "Change your preferences" shows what was chosen.
  useEffect(() => {
    let active = true;
    loadPreferences(deviceStorage).then((loaded) => {
      if (active) setDraft(loaded ?? emptyPreferences);
    });
    return () => {
      active = false;
    };
  }, []);

  const leave = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    exitOnboarding(router);
  }, []);

  // The "done" moment closes by itself unless a screen reader runs (then it waits for "Continue").
  // The timing is fixed when the moment starts, and the timer is cleared if the screen goes first.
  useEffect(() => {
    if (celebration?.autoCloseMs == null) return;
    const timer = setTimeout(leave, celebration.autoCloseMs);
    return () => clearTimeout(timer);
  }, [celebration, leave]);

  if (!draft) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const current = ONBOARDING_STEPS[stepIndex];
  const saving = phase === 'saving';

  function goTo(i: number) {
    setStepIndex(i);
    setMoved(true);
    // react-native-web cannot announce; on web `StepProgress` is a live region instead.
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(stepAnnouncement(i));
  }

  async function save(answers: Preferences, trigger: SaveTrigger) {
    setError(null);
    setPhase('saving');
    try {
      await savePreferences(deviceStorage, answers);
    } catch {
      setError(copy.onboarding.saveFailed);
      setPhase('asking');
      return;
    }
    if (afterSave(trigger) === 'leave') {
      leave();
      return;
    }
    setCelebration(celebrationFor({ reduced, screenReader }));
    saveHaptic();
    // Android and web read the panel's live region; iOS needs the announcement.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(copy.onboarding.finishedTitle);
  }

  function onPrimary(answers: Preferences) {
    if (isLastStep(stepIndex)) {
      void save(answers, 'done');
    } else {
      goTo(stepIndex + 1);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]}
    >
      {celebration ? (
        <FinishCelebration celebration={celebration} onContinue={leave} />
      ) : (
        <>
          <StepProgress stepIndex={stepIndex} />

          {/* Keyed by step, so each new question plays its entrance once. The buttons below stay mounted and keep focus. */}
          <Animated.View
            key={stepIndex}
            style={[styles.question, entranceStyle(entranceFor({ index: 0, reduced, animate: moved }))]}
          >
            <Text style={styles.title} accessibilityRole="header">
              {current.title}
            </Text>
            {current.multiple ? <Text style={styles.hint}>{copy.onboarding.multipleHint}</Text> : null}
            <OptionChips
              size="large"
              options={current.options}
              selected={selectedValues(draft, current.key)}
              onToggle={(value) => setDraft(toggleAnswer(draft, current.key, value))}
              multiple={current.multiple}
              disabled={saving}
              accessibilityLabel={current.title}
            />
          </Animated.View>

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              label={saving ? copy.onboarding.saving : primaryActionLabel(draft, stepIndex)}
              onPress={() => onPrimary(draft)}
              disabled={saving}
            />
            {stepIndex > 0 ? (
              <Button
                label={copy.onboarding.back}
                variant="secondary"
                onPress={() => goTo(stepIndex - 1)}
                disabled={saving}
              />
            ) : null}
            {isLastStep(stepIndex) ? null : (
              <Button
                label={copy.onboarding.skipRest}
                variant="secondary"
                onPress={() => void save(draft, 'skipRest')}
                disabled={saving}
              />
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  // `flexGrow` lets the actions sit at the bottom on tall screens and still scroll with large text.
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  question: { gap: spacing.md },
  title: { ...typography.heading, color: colors.text },
  hint: { ...typography.body, color: colors.mutedText },
  error: { ...typography.caption, color: colors.danger, marginVertical: spacing.xs },
  actions: { marginTop: 'auto', gap: spacing.sm },
});
