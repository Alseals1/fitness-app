import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ResultCard } from '../components/ResultCard';
import { useShortlist } from '../hooks/useShortlist';
import { copy } from '../lib/copy';
import { fetchApprovedPlacesByIds } from '../lib/places';
import type { PlacesLoad } from '../lib/results';
import { shortlistView } from '../lib/shortlistView';
import { supabase } from '../lib/supabase';
import { colors, fontSize, spacing } from '../lib/theme';

/**
 * The places saved on this device, newest first. Open to everyone: the shortlist needs no
 * account. A saved place that is no longer approved is simply not shown.
 */
export default function ShortlistScreen() {
  const { ids, loading, toggle, isSaved, saveError } = useShortlist();
  const [places, setPlaces] = useState<PlacesLoad>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [focusCount, setFocusCount] = useState(0);

  // The same ids in another order (a re-save moves one to the front) need no new fetch.
  const idsKey = useMemo(() => [...ids].sort().join(','), [ids]);

  // Fetch again on each focus too, so a place approved or hidden meanwhile is picked up.
  useFocusEffect(
    useCallback(() => {
      setFocusCount((count) => count + 1);
    }, []),
  );

  // A refetch keeps the current list on screen until the new one arrives.
  useEffect(() => {
    if (loading || idsKey === '') return;
    // Ignore a response that arrives after the ids changed or the screen closed.
    let cancelled = false;
    fetchApprovedPlacesByIds(supabase, idsKey.split(',')).then((result) => {
      if (cancelled) return;
      setPlaces(result.ok ? { status: 'loaded', places: result.data } : { status: 'error', message: result.message });
    });
    return () => {
      cancelled = true;
    };
  }, [loading, idsKey, attempt, focusCount]);

  const onRetry = useCallback(() => {
    setPlaces({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  const view = useMemo(() => shortlistView({ idsLoading: loading, ids, places }), [loading, ids, places]);

  const saveErrorText = saveError ? (
    <Text style={styles.error} accessibilityLiveRegion="polite">
      {saveError}
    </Text>
  ) : undefined;

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
        <Button label={copy.shortlist.retry} variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  if (view.kind === 'empty') {
    return (
      <View style={[styles.container, styles.centered]}>
        {saveErrorText}
        <Text style={styles.muted}>{copy.shortlist.empty}</Text>
        <Link href="/results" style={styles.link}>
          {copy.shortlist.browseLink}
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={view.results}
        keyExtractor={(result) => result.place.id}
        contentContainerStyle={styles.list}
        // The cards read their saved state from the shortlist, so a toggle must repaint them.
        extraData={ids}
        ListHeaderComponent={saveErrorText}
        renderItem={({ item }) => (
          <ResultCard result={item} saved={isSaved(item.place.id)} onToggleSave={toggle} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  list: { padding: spacing.lg, gap: spacing.md },
  link: { fontSize: fontSize.body, fontWeight: '600', color: colors.primary, paddingVertical: spacing.sm },
  error: { fontSize: fontSize.body, color: colors.danger, textAlign: 'center' },
  muted: { fontSize: fontSize.body, color: colors.mutedText, textAlign: 'center' },
});
