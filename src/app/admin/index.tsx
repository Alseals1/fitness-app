import { Link, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { ClaimCard } from '../../components/ClaimCard';
import { PendingPlaceCard } from '../../components/PendingPlaceCard';
import { useAuth } from '../../hooks/useAuth';
import {
  applyClaimAction,
  applyClaimCertified,
  applyQueueAction,
  approveClaim,
  approvePlace,
  fetchPendingPlaces,
  fetchPendingSubmissions,
  hidePlace,
  isQueueAtLimit,
  queueSections,
  rejectClaim,
  rejectPlace,
  setPlaceCertified,
  setPlaceVerified,
  splitSubmissions,
  type AdminResult,
  type Submission,
} from '../../lib/admin';
import { copy } from '../../lib/copy';
import type { PublicPlace } from '../../lib/places';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function AdminQueueScreen() {
  const { signOut } = useAuth();
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [claims, setClaims] = useState<Submission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [placesResult, submissionsResult] = await Promise.all([
      fetchPendingPlaces(supabase),
      fetchPendingSubmissions(supabase),
    ]);
    if (placesResult.ok && submissionsResult.ok) {
      const split = splitSubmissions(submissionsResult.data);
      setPlaces(placesResult.data);
      setSubmissions(split.byPlaceId);
      setClaims(split.claims);
      setLoadError(null);
      setErrors({});
    } else {
      setLoadError(!placesResult.ok ? placesResult.message : !submissionsResult.ok ? submissionsResult.message : null);
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

  /** Runs one action on a card (a place or a claim, by id) and applies it to the queue when it succeeds. */
  async function act<T>(id: string, call: () => Promise<AdminResult<T>>, onSuccess: (data: T) => void) {
    setBusyId(id);
    const result = await call();
    setBusyId(null);
    if (result.ok) {
      onSuccess(result.data);
      setErrors(({ [id]: _cleared, ...rest }) => rest);
    } else {
      setErrors((current) => ({ ...current, [id]: result.message }));
    }
  }

  /** Certifies (a name) or uncertifies (null) a trainer, from its pending card or a claim card. */
  function certify(cardId: string, placeId: string, name: string | null) {
    act(cardId, () => setPlaceCertified(supabase, placeId, name), (saved) => {
      setPlaces((current) => applyQueueAction(current, placeId, { kind: 'certify', name: saved }));
      setClaims((current) => applyClaimCertified(current, placeId, saved));
    });
  }

  const sections = useMemo(() => queueSections(places, claims), [places, claims]);

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
        <SectionList
          sections={sections}
          keyExtractor={(item) => (item.kind === 'claim' ? `claim-${item.claim.id}` : `place-${item.place.id}`)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
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
              ) : isQueueAtLimit(places) || isQueueAtLimit(claims) ? (
                <Text style={styles.muted}>{copy.queue.limitReached}</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={loadError ? undefined : <Text style={styles.muted}>{copy.queue.empty}</Text>}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {section.title}
            </Text>
          )}
          ItemSeparatorComponent={Separator}
          renderItem={({ item }) => {
            if (item.kind === 'claim') {
              const claim = item.claim;
              return (
                <ClaimCard
                  claim={claim}
                  busy={busyId === claim.id}
                  error={errors[claim.id] ?? null}
                  onApprove={() =>
                    act(claim.id, () => approveClaim(supabase, claim.id), () =>
                      setClaims((current) => applyClaimAction(current, claim.id)),
                    )
                  }
                  onReject={(reason) =>
                    act(claim.id, () => rejectClaim(supabase, claim.id, reason), () =>
                      setClaims((current) => applyClaimAction(current, claim.id)),
                    )
                  }
                  onCertify={(name) => certify(claim.id, claim.place_id, name)}
                  onUncertify={() => certify(claim.id, claim.place_id, null)}
                />
              );
            }
            const place = item.place;
            const remove = (kind: 'approve' | 'reject' | 'hide') => () =>
              setPlaces((current) => applyQueueAction(current, place.id, { kind }));
            return (
              <PendingPlaceCard
                place={place}
                submission={submissions[place.id]}
                busy={busyId === place.id}
                error={errors[place.id] ?? null}
                onApprove={() => act(place.id, () => approvePlace(supabase, place.id), remove('approve'))}
                onReject={(reason) => act(place.id, () => rejectPlace(supabase, place.id, reason), remove('reject'))}
                onHide={() => act(place.id, () => hidePlace(supabase, place.id), remove('hide'))}
                onToggleVerified={() =>
                  act(place.id, () => setPlaceVerified(supabase, place.id, !place.is_verified), () =>
                    setPlaces((current) =>
                      applyQueueAction(current, place.id, { kind: 'verify', verified: !place.is_verified }),
                    ),
                  )
                }
                onCertify={(name) => certify(place.id, place.id, name)}
                onUncertify={() => certify(place.id, place.id, null)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1 },
  list: { padding: spacing.lg },
  separator: { height: spacing.md },
  sectionTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  notice: { gap: spacing.sm },
  error: { fontSize: fontSize.body, color: colors.danger },
  addLink: { fontSize: fontSize.body, fontWeight: '600', color: colors.primary, paddingVertical: spacing.sm },
  muted: { fontSize: fontSize.body, color: colors.mutedText, textAlign: 'center', marginBottom: spacing.md },
});
