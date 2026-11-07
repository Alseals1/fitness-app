import * as Linking from 'expo-linking';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '../../components/Button';
import { ContactList } from '../../components/ContactRow';
import { FactList } from '../../components/FactList';
import { ProfileSection } from '../../components/ProfileSection';
import { SaveButton } from '../../components/SaveButton';
import { PlaceProfileSkeleton } from '../../components/Skeleton';
import { useShortlist } from '../../hooks/useShortlist';
import { profileEntering } from '../../lib/animations';
import { copy } from '../../lib/copy';
import { placeProfileView, profileFacts, type PlaceLoad, type PlaceProfile } from '../../lib/placeProfile';
import { fetchApprovedPlace, type PlaceResult } from '../../lib/places';
import { supabase } from '../../lib/supabase';
import { colors, noticeStyle, radius, spacing, textLinkStyle, typography } from '../../lib/theme';

function toLoad(result: PlaceResult): PlaceLoad {
  return result.ok ? { status: 'loaded', place: result.place } : { status: 'error', message: result.message };
}

/**
 * One approved place. Open to everyone: no account needed. A missing, non-approved or
 * malformed id shows the same not-found view, so a pending place can't be found by its id.
 */
export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [load, setLoad] = useState<PlaceLoad>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after the id changed or the screen closed.
    let cancelled = false;
    fetchApprovedPlace(supabase, id).then((result) => {
      if (!cancelled) setLoad(toLoad(result));
    });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const onRetry = useCallback(() => {
    setLoad({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  const view = useMemo(() => placeProfileView(load), [load]);

  if (view.kind === 'loading') {
    return (
      <View style={styles.container}>
        <PlaceProfileSkeleton />
      </View>
    );
  }

  if (view.kind === 'error') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.error, styles.textCentered]} accessibilityLiveRegion="polite">
          {view.message}
        </Text>
        <Button label={copy.place.retry} variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  if (view.kind === 'notFound') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.title} accessibilityRole="header">
          {copy.place.notFoundTitle}
        </Text>
        <Text style={[styles.body, styles.textCentered]}>{copy.place.notFoundBody}</Text>
        <Link href="/results" accessibilityRole="link" style={textLinkStyle}>
          {copy.place.backToResults}
        </Link>
      </View>
    );
  }

  return <Profile profile={view.profile} />;
}

/**
 * The profile, top to bottom: the header (category, name, certified mark, Save), "At a glance",
 * About, Good to know, the trainer safety note, then "Get in touch". One column, so the reading
 * and focus order match what is on screen. The safety note sits right above the contact rows,
 * so it is read before contacting a trainer.
 */
function Profile({ profile }: { profile: PlaceProfile }) {
  const [openError, setOpenError] = useState<string | null>(null);
  const { loading: shortlistLoading, isSaved, toggle, saveError } = useShortlist();
  const facts = useMemo(() => profileFacts(profile), [profile]);

  const open = useCallback((url: string) => {
    setOpenError(null);
    // openURL rejects when no app can handle the link, for example no mail app.
    Linking.openURL(url).catch(() => setOpenError(copy.place.openFailed));
  }, []);

  return (
    <Animated.ScrollView entering={profileEntering} style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.category}>{profile.category}</Text>
        <Text style={styles.heading} accessibilityRole="header">
          {profile.name}
        </Text>
        {profile.certified ? (
          <View style={styles.certifiedRow}>
            {/* Decorative: the text says "Certified" itself. */}
            <Text style={styles.certified} aria-hidden importantForAccessibility="no-hide-descendants">
              {copy.place.certifiedGlyph}
            </Text>
            <Text style={[styles.certified, styles.certifiedText]}>{profile.certified}</Text>
          </View>
        ) : null}
        <View style={styles.save}>
          {/* Hidden until the shortlist has loaded, so it never shows "Save" for a saved place. */}
          {shortlistLoading ? null : (
            <SaveButton name={profile.name} saved={isSaved(profile.id)} onPress={() => toggle(profile.id)} />
          )}
          {saveError ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {saveError}
            </Text>
          ) : null}
        </View>
      </View>

      <ProfileSection label={copy.place.glance}>
        <FactList facts={facts} />
      </ProfileSection>

      {profile.description ? (
        <ProfileSection label={copy.place.about}>
          <Text style={styles.body}>{profile.description}</Text>
        </ProfileSection>
      ) : null}

      {profile.tags.length > 0 ? (
        <ProfileSection label={copy.place.tags}>
          <View style={styles.chips}>
            {profile.tags.map((tag) => (
              <View key={tag} style={styles.chip}>
                <Text style={styles.chipText}>{tag}</Text>
              </View>
            ))}
          </View>
        </ProfileSection>
      ) : null}

      {profile.safetyNote ? (
        <View style={noticeStyle}>
          <Text style={styles.body}>{profile.safetyNote}</Text>
        </View>
      ) : null}

      {profile.contacts.length > 0 ? (
        <ProfileSection label={copy.place.contact}>
          <ContactList contacts={profile.contacts} onOpen={open} />
          {openError ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {openError}
            </Text>
          ) : null}
        </ProfileSection>
      ) : null}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  content: { padding: spacing.lg, gap: spacing.xl },
  header: { gap: spacing.xs },
  category: { ...typography.label, color: colors.mutedText },
  heading: { ...typography.heading, color: colors.text },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  certifiedRow: { flexDirection: 'row', gap: spacing.xs },
  certified: { ...typography.bodyStrong, color: colors.success },
  // In a row, so it wraps beside the glyph instead of running off screen.
  certifiedText: { flexShrink: 1 },
  save: { alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.sm },
  body: { ...typography.body, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.reasonBackground,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { ...typography.label, color: colors.reasonText },
  error: { ...typography.body, color: colors.danger },
  textCentered: { textAlign: 'center' },
});
