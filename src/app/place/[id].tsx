import * as Linking from 'expo-linking';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { SaveButton } from '../../components/SaveButton';
import { useShortlist } from '../../hooks/useShortlist';
import { copy } from '../../lib/copy';
import { placeProfileView, type ContactLink, type PlaceLoad, type PlaceProfile } from '../../lib/placeProfile';
import { fetchApprovedPlace, type PlaceResult } from '../../lib/places';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, radius, spacing } from '../../lib/theme';

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
        <Text style={styles.body}>{copy.place.notFoundBody}</Text>
        <Link href="/results" style={styles.link}>
          {copy.place.backToResults}
        </Link>
      </View>
    );
  }

  return <Profile profile={view.profile} />;
}

function Profile({ profile }: { profile: PlaceProfile }) {
  const [openError, setOpenError] = useState<string | null>(null);
  const { loading: shortlistLoading, isSaved, toggle, saveError } = useShortlist();

  const open = useCallback((url: string) => {
    setOpenError(null);
    // openURL rejects when no app can handle the link, for example no mail app.
    Linking.openURL(url).catch(() => setOpenError(copy.place.openFailed));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">
        {profile.name}
      </Text>
      <Text style={styles.meta}>{[profile.category, profile.area].join(' · ')}</Text>
      {profile.certified ? <Text style={styles.certified}>{profile.certified}</Text> : null}
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

      {profile.description ? (
        <Section label={copy.place.about}>
          <Text style={styles.body}>{profile.description}</Text>
        </Section>
      ) : null}
      <Section label={copy.place.price}>
        <Text style={styles.body}>{profile.price}</Text>
      </Section>
      {profile.schedule ? (
        <Section label={copy.place.schedule}>
          <Text style={styles.body}>{profile.schedule}</Text>
        </Section>
      ) : null}
      <Section label={copy.place.area}>
        <Text style={styles.body}>{profile.area}</Text>
      </Section>
      {profile.tags.length > 0 ? (
        <Section label={copy.place.tags}>
          <View style={styles.chips}>
            {profile.tags.map((tag) => (
              <View key={tag} style={styles.chip}>
                <Text style={styles.chipText}>{tag}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {profile.safetyNote ? (
        <View style={styles.note}>
          <Text style={styles.body}>{profile.safetyNote}</Text>
        </View>
      ) : null}

      {profile.contacts.length > 0 ? (
        <Section label={copy.place.contact}>
          {profile.contacts.map((contact) => (
            <ContactRow key={contact.kind} contact={contact} onOpen={open} />
          ))}
          {openError ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {openError}
            </Text>
          ) : null}
        </Section>
      ) : null}
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** A tappable link when the value is safe to open, otherwise selectable text. */
function ContactRow({ contact, onOpen }: { contact: ContactLink; onOpen: (url: string) => void }) {
  const { url } = contact;
  if (url === null) {
    return (
      <Text style={[styles.body, styles.contactRow]} selectable>
        {contact.text}
      </Text>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={contact.accessibilityLabel}
      onPress={() => onOpen(url)}
      style={({ pressed }) => [styles.contactRow, pressed && styles.dimmed]}
    >
      <Text style={styles.link}>{contact.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  content: { padding: spacing.lg, gap: spacing.lg },
  heading: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
  title: { fontSize: fontSize.title, fontWeight: '700', color: colors.text, textAlign: 'center' },
  meta: { fontSize: fontSize.body, color: colors.mutedText },
  certified: { fontSize: fontSize.body, fontWeight: '600', color: colors.success },
  save: { alignItems: 'flex-start', gap: spacing.xs },
  section: { gap: spacing.xs },
  sectionLabel: { fontSize: fontSize.small, fontWeight: '700', color: colors.mutedText },
  body: { fontSize: fontSize.body, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.reasonBackground,
    borderRadius: radius * 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { fontSize: fontSize.small, fontWeight: '600', color: colors.reasonText },
  note: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  contactRow: { minHeight: 44, justifyContent: 'center' },
  link: { fontSize: fontSize.body, fontWeight: '600', color: colors.primary, paddingVertical: spacing.sm },
  dimmed: { opacity: 0.6 },
  error: { fontSize: fontSize.body, color: colors.danger, textAlign: 'center' },
});
