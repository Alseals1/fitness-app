import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ResultCard } from '../components/ResultCard';
import { usePreferences } from '../hooks/usePreferences';
import { copy } from '../lib/copy';
import { fetchApprovedPlaces } from '../lib/places';
import { resultsView, type PlacesLoad } from '../lib/results';
import { supabase } from '../lib/supabase';
import { colors, fontSize, spacing } from '../lib/theme';

/** Approved places, best fit first. Open to everyone: no account needed. */
export default function ResultsScreen() {
  const { preferences, loading: preferencesLoading } = usePreferences();
  const [places, setPlaces] = useState<PlacesLoad>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  // A reload keeps the current list on screen until the new one arrives.
  const load = useCallback(async () => {
    const result = await fetchApprovedPlaces(supabase);
    setPlaces(result.ok ? { status: 'loaded', places: result.data } : { status: 'error', message: result.message });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onRetry = useCallback(() => {
    setPlaces({ status: 'loading' });
    load();
  }, [load]);

  const view = useMemo(
    () => resultsView({ preferencesLoading, preferences, places }),
    [preferencesLoading, preferences, places],
  );

  if (view.kind === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.fill} color={colors.primary} />
      </View>
    );
  }

  if (view.kind === 'error') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {view.message}
        </Text>
        <Button label={copy.results.retry} variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={view.kind === 'list' ? view.results : []}
        keyExtractor={(result) => result.place.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          view.hasPreferences ? (
            <Link href="/onboarding" style={styles.link}>
              {copy.onboarding.changeLink}
            </Link>
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{copy.results.noPreferences}</Text>
              <Link href="/onboarding" style={styles.link}>
                {copy.onboarding.setLink}
              </Link>
            </View>
          )
        }
        ListEmptyComponent={<Text style={styles.muted}>{copy.results.empty}</Text>}
        renderItem={({ item }) => <ResultCard result={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  list: { padding: spacing.lg, gap: spacing.md },
  notice: { gap: spacing.xs },
  noticeText: { fontSize: fontSize.body, color: colors.text },
  link: { fontSize: fontSize.body, fontWeight: '600', color: colors.primary, paddingVertical: spacing.sm },
  error: { fontSize: fontSize.body, color: colors.danger, textAlign: 'center' },
  muted: { fontSize: fontSize.body, color: colors.mutedText, textAlign: 'center', marginTop: spacing.md },
});
