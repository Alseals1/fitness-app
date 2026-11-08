import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ResultCard } from '../components/ResultCard';
import { ResultListSkeleton } from '../components/Skeleton';
import { useMotion } from '../hooks/useMotion';
import { usePreferences } from '../hooks/usePreferences';
import { useShortlist } from '../hooks/useShortlist';
import { copy } from '../lib/copy';
import { entranceFor } from '../lib/motion';
import { fetchApprovedPlaces } from '../lib/places';
import { resultsSummary, resultsView, type PlacesLoad } from '../lib/results';
import { supabase } from '../lib/supabase';
import { colors, noticeStyle, spacing, textLinkStyle, typography } from '../lib/theme';

/** Approved places, best fit first. Open to everyone: no account needed. */
export default function ResultsScreen() {
  const { preferences, loading: preferencesLoading } = usePreferences();
  const shortlist = useShortlist();
  const [places, setPlaces] = useState<PlacesLoad>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const { reduced } = useMotion();
  // Only the cards on the list's first paint animate in. Rows that mount later (scrolling,
  // a refresh) appear at once, so a virtualized list never replays the entrance.
  const [entered, setEntered] = useState(false);

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
        <ResultListSkeleton />
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
        // The cards read their saved state from the shortlist, so a toggle must repaint them.
        extraData={shortlist.ids}
        onLayout={() => setEntered(true)}
        ListHeaderComponent={
          <View style={styles.header}>
            {view.hasPreferences ? null : (
              <View style={noticeStyle}>
                <Text style={styles.noticeText}>{copy.results.noPreferences}</Text>
                <Link href="/onboarding" accessibilityRole="link" style={textLinkStyle}>
                  {copy.onboarding.setLink}
                </Link>
              </View>
            )}
            <View style={styles.links}>
              {view.hasPreferences ? (
                <Link href="/onboarding" accessibilityRole="link" style={textLinkStyle}>
                  {copy.onboarding.changeLink}
                </Link>
              ) : null}
              <Link href="/shortlist" accessibilityRole="link" style={textLinkStyle}>
                {copy.shortlist.resultsLink}
              </Link>
            </View>
            {view.kind === 'list' ? (
              <Text style={styles.summary}>{resultsSummary(view.results.length, view.hasPreferences)}</Text>
            ) : null}
            {shortlist.saveError ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {shortlist.saveError}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle} accessibilityRole="header">
              {copy.results.emptyTitle}
            </Text>
            <Text style={styles.emptyBody}>{copy.results.emptyBody}</Text>
            <Button label={copy.results.refresh} variant="secondary" onPress={onRetry} />
          </View>
        }
        renderItem={({ item, index }) => (
          <ResultCard
            result={item}
            saved={shortlist.isSaved(item.place.id)}
            onToggleSave={shortlist.toggle}
            entrance={entranceFor({ index, reduced, animate: !entered })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  list: { padding: spacing.lg, gap: spacing.md },
  header: { gap: spacing.sm },
  noticeText: { ...typography.body, color: colors.text },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg },
  summary: { ...typography.label, color: colors.mutedText, marginTop: spacing.sm },
  error: { ...typography.body, color: colors.danger, textAlign: 'center' },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  emptyBody: { ...typography.body, color: colors.mutedText, textAlign: 'center' },
});
