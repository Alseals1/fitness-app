import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { copy } from '../lib/copy';
import { deviceStorage } from '../lib/deviceStorage';
import {
  ONBOARDING_STEPS,
  isLastStep,
  primaryActionLabel,
  progressLabel,
  selectedValues,
  toggleAnswer,
} from '../lib/onboarding';
import { emptyPreferences, loadPreferences, savePreferences, type Preferences } from '../lib/preferences';
import { colors, spacing, typography } from '../lib/theme';

/** Five skippable questions. The answers stay on this device; nothing is sent anywhere. */
export default function OnboardingScreen() {
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!draft) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const current = ONBOARDING_STEPS[stepIndex];

  async function save(answers: Preferences) {
    setError(null);
    setSaving(true);
    try {
      await savePreferences(deviceStorage, answers);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch {
      setError(copy.onboarding.saveFailed);
      setSaving(false);
    }
  }

  function onPrimary(answers: Preferences) {
    if (isLastStep(stepIndex)) {
      void save(answers);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.progress}>{progressLabel(stepIndex)}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {current.title}
      </Text>
      {current.multiple ? <Text style={styles.hint}>{copy.onboarding.multipleHint}</Text> : null}

      <OptionChips
        options={current.options}
        selected={selectedValues(draft, current.key)}
        onToggle={(value) => setDraft(toggleAnswer(draft, current.key, value))}
        multiple={current.multiple}
        disabled={saving}
        accessibilityLabel={current.title}
      />

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
            onPress={() => setStepIndex(stepIndex - 1)}
            disabled={saving}
          />
        ) : null}
        {isLastStep(stepIndex) ? null : (
          <Button
            label={copy.onboarding.skipRest}
            variant="secondary"
            onPress={() => void save(draft)}
            disabled={saving}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.xl, gap: spacing.md },
  progress: { ...typography.caption, color: colors.mutedText },
  title: { ...typography.title, color: colors.text },
  hint: { ...typography.caption, color: colors.mutedText },
  error: { ...typography.caption, color: colors.danger, marginVertical: spacing.xs },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
