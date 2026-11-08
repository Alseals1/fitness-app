import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ShortlistRow } from '../components/ShortlistRow';
import { ResultListSkeleton } from '../components/Skeleton';
import { UndoBar } from '../components/UndoBar';
import { useMotion } from '../hooks/useMotion';
import { useShortlist } from '../hooks/useShortlist';
import { copy } from '../lib/copy';
import { exitFor, rowEntrance } from '../lib/motion';
import { fetchApprovedPlacesByIds } from '../lib/places';
import type { PlacesLoad } from '../lib/results';
import { initialShortlistEdits, noticeMessage, shortlistEditsReducer } from '../lib/shortlistEdits';
import { shortlistFetchKey, shortlistView } from '../lib/shortlistView';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';

/** Android and web read the undo bar's live region; iOS needs the announcement. */
function announce(message: string) {
  if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
}

/**
 * The places saved on this device, newest first. Open to everyone: the shortlist needs no
 * account. A saved place that is no longer approved is simply not shown. A removal is saved at
 * once and can be undone from the bar at the bottom, with no time limit; Undo puts the place back
 * where it was.
 */
export default function ShortlistScreen() {
  const { ids, loading, saveError, remove, restore } = useShortlist();
  const [places, setPlaces] = useState<PlacesLoad>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [focusCount, setFocusCount] = useState(0);
  const { reduced } = useMotion();
  const exit = useMemo(() => exitFor({ reduced }), [reduced]);
  const [edits, dispatch] = useReducer(shortlistEditsReducer, initialShortlistEdits);
  // One exit timer per leaving row, so a new removal or Undo can cancel the right one.
  const exitTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // Only the cards on the list's first paint animate in. Rows that mount later (scrolling,
  // a refocus) appear at once, so a virtualized list never replays the entrance.
  const [entered, setEntered] = useState(false);

  // The ids the shown places were fetched for. A removal or an Undo keeps it, so nothing reloads.
  const [requestedKey, setRequestedKey] = useState<string | null>(null);
  const fetchKey = shortlistFetchKey(ids, requestedKey);

  const clearExitTimer = useCallback((id: string) => {
    const timer = exitTimers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    exitTimers.current.delete(id);
  }, []);

  const clearExitTimers = useCallback(() => {
    for (const timer of exitTimers.current.values()) clearTimeout(timer);
    exitTimers.current.clear();
  }, []);

  // Fetch again on each focus too, so a place approved or hidden meanwhile is picked up. Leaving
  // the screen drops the undo bar and any row still leaving.
  useFocusEffect(
    useCallback(() => {
      setFocusCount((count) => count + 1);
      return () => {
        clearExitTimers();
        dispatch({ type: 'reset' });
      };
    }, [clearExitTimers]),
  );

  useEffect(() => clearExitTimers, [clearExitTimers]);

  // A refetch keeps the current list on screen until the new one arrives.
  useEffect(() => {
    // Nothing saved yet: nothing to fetch. Removing the last place keeps the key, so an Undo
    // does not refetch either.
    if (loading || fetchKey === '') return;
    // Ignore a response that arrives after the ids changed or the screen closed.
    let cancelled = false;
    fetchApprovedPlacesByIds(supabase, fetchKey.split(',')).then((result) => {
      if (cancelled) return;
      if (result.ok) setRequestedKey(fetchKey);
      setPlaces(result.ok ? { status: 'loaded', places: result.data } : { status: 'error', message: result.message });
    });
    return () => {
      cancelled = true;
    };
  }, [loading, fetchKey, attempt, focusCount]);

  const onRetry = useCallback(() => {
    setPlaces({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  const view = useMemo(
    () => shortlistView({ idsLoading: loading, ids, places, leaving: edits.leaving }),
    [loading, ids, places, edits.leaving],
  );

  const onRemove = useCallback(
    (id: string) => {
      if (view.kind !== 'list') return false;
      const displayIndex = view.rows.findIndex((row) => !row.leaving && row.result.place.id === id);
      if (displayIndex === -1) return false;
      const { result } = view.rows[displayIndex];
      const savedIndex = remove(id);
      if (savedIndex === null) return false;
      dispatch({ type: 'removed', result, displayIndex, savedIndex });
      announce(copy.shortlist.removed(result.place.name));
      clearExitTimer(id);
      exitTimers.current.set(
        id,
        setTimeout(() => {
          exitTimers.current.delete(id);
          dispatch({ type: 'exitDone', id });
        }, exit.duration),
      );
      return true;
    },
    [view, remove, exit, clearExitTimer],
  );

  const onUndo = useCallback(() => {
    const { notice } = edits;
    if (notice?.kind !== 'removed') return;
    if (!restore(notice.id, notice.savedIndex)) return;
    clearExitTimer(notice.id);
    dispatch({ type: 'undone' });
    announce(noticeMessage({ kind: 'restored', name: notice.name }));
  }, [edits, restore, clearExitTimer]);

  const saveErrorText = saveError ? (
    <Text style={styles.error} accessibilityLiveRegion="polite">
      {saveError}
    </Text>
  ) : undefined;

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
        <Button label={copy.shortlist.retry} variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {view.kind === 'empty' ? (
        <View style={[styles.content, styles.centered]}>
          {saveErrorText}
          <Text style={styles.emptyTitle} accessibilityRole="header">
            {copy.shortlist.emptyTitle}
          </Text>
          <Text style={styles.emptyBody}>{copy.shortlist.emptyBody}</Text>
          {/* Back to results when they are in the history, otherwise open them. */}
          <Button label={copy.shortlist.browseLink} onPress={() => router.dismissTo('/results')} />
        </View>
      ) : (
        <FlatList
          style={styles.content}
          data={view.rows}
          keyExtractor={(row) => row.result.place.id}
          contentContainerStyle={styles.list}
          // Rows read their leaving and restored state from the edits, so a change must repaint them.
          extraData={edits}
          onLayout={() => setEntered(true)}
          ListHeaderComponent={
            view.savedCount > 0 || saveErrorText ? (
              <View style={styles.header}>
                {view.savedCount > 0 ? (
                  <Text style={styles.summary}>{copy.shortlist.summary(view.savedCount)}</Text>
                ) : null}
                {saveErrorText}
              </View>
            ) : undefined
          }
          renderItem={({ item, index }) => (
            <ShortlistRow
              result={item.result}
              leaving={item.leaving}
              exit={exit}
              entrance={rowEntrance({
                index,
                reduced,
                firstPaint: !entered,
                restored: item.result.place.id === edits.restoredId,
              })}
              onRemove={onRemove}
            />
          )}
        />
      )}
      <UndoBar notice={edits.notice} onUndo={onUndo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  list: { padding: spacing.lg },
  header: { gap: spacing.sm, paddingBottom: spacing.md },
  summary: { ...typography.label, color: colors.mutedText },
  emptyTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  emptyBody: { ...typography.body, color: colors.mutedText, textAlign: 'center' },
  error: { ...typography.body, color: colors.danger, textAlign: 'center' },
});
