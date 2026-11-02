import { Link, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { PendingPlaceCard } from '../../components/PendingPlaceCard';
import { useAuth } from '../../hooks/useAuth';
import {
  applyQueueAction,
  approvePlace,
  fetchPendingPlaces,
  hidePlace,
  isQueueAtLimit,
  rejectPlace,
  setPlaceVerified,
  type AdminResult,
  type QueueAction,
} from '../../lib/admin';
import { copy } from '../../lib/copy';
import type { PublicPlace } from '../../lib/places';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function AdminQueueScreen() {
  const { signOut } = useAuth();
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const result = await fetchPendingPlaces(supabase);
    if (result.ok) {
      setPlaces(result.data);
      setLoadError(null);
      setErrors({});
    } else {
      setLoadError(result.message);
    }
    setLoaded(true);
  }, []);

  // Reload whenever the screen comes back into view, for example after adding a place.
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

  async function act(placeId: string, action: QueueAction, call: () => Promise<AdminResult<null>>) {
    setBusyId(placeId);
    const result = await call();
    setBusyId(null);
    if (result.ok) {
      setPlaces((current) => applyQueueAction(current, placeId, action));
      setErrors(({ [placeId]: _cleared, ...rest }) => rest);
    } else {
      setErrors((current) => ({ ...current, [placeId]: result.message }));
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => <Button label={copy.signOut} variant="secondary" onPress={signOut} />,
        }}
      />
      {!loaded ? (
        <ActivityIndicator style={styles.center} color={colors.primary} />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(place) => place.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.notice}>
              <Link href="/admin/new-place" style={styles.addLink}>
                {copy.newPlace.title}
              </Link>
              {loadError ? (
                <>
                  <Text style={styles.error}>
                    {copy.queue.loadFailed} {loadError}
                  </Text>
                  <Button label={copy.queue.retry} variant="secondary" onPress={onRefresh} />
                </>
              ) : isQueueAtLimit(places) ? (
                <Text style={styles.muted}>{copy.queue.limitReached}</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={loadError ? undefined : <Text style={styles.muted}>{copy.queue.empty}</Text>}
          renderItem={({ item }) => (
            <PendingPlaceCard
              place={item}
              busy={busyId === item.id}
              error={errors[item.id] ?? null}
              onApprove={() => act(item.id, { kind: 'approve' }, () => approvePlace(supabase, item.id))}
              onReject={(reason) => act(item.id, { kind: 'reject' }, () => rejectPlace(supabase, item.id, reason))}
              onHide={() => act(item.id, { kind: 'hide' }, () => hidePlace(supabase, item.id))}
              onToggleVerified={() =>
                act(item.id, { kind: 'verify', verified: !item.is_verified }, () =>
                  setPlaceVerified(supabase, item.id, !item.is_verified),
                )
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  notice: { gap: spacing.sm },
  error: { fontSize: fontSize.body, color: colors.danger },
  addLink: { fontSize: fontSize.body, fontWeight: '600', color: colors.primary, paddingVertical: spacing.sm },
  muted: { fontSize: fontSize.body, color: colors.mutedText, textAlign: 'center', marginBottom: spacing.md },
});
