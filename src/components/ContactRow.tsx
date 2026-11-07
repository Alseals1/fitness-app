import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusState } from '../hooks/useFocusState';
import { copy } from '../lib/copy';
import { focusRing } from '../lib/controlStyles';
import type { ContactLink } from '../lib/placeProfile';
import { borderWidth, cardStyle, colors, minTouchTarget, radius, spacing, typography } from '../lib/theme';

type Props = { contact: ContactLink; onOpen: (url: string) => void };

/**
 * One way to contact a place: its kind ("Phone", …) above its value. A safe value is a
 * full-width link row with a "›" cue; an unsafe one (`url` null) is plain, selectable text,
 * never a link. Pressed and focused show colour only, so nothing moves under Reduced Motion.
 */
export function ContactRow({ contact, onOpen }: Props) {
  const { focused, onFocus, onBlur } = useFocusState();
  const { url } = contact;

  if (url === null) {
    return (
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.kind}>{contact.kindLabel}</Text>
          <Text style={styles.plainValue} selectable>
            {contact.text}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={contact.accessibilityLabel}
      onPress={() => onOpen(url)}
      onFocus={onFocus}
      onBlur={onBlur}
      // A plain Pressable (not Link asChild), so a style function is kept.
      style={({ pressed }) => [styles.row, pressed && styles.pressed, focusRing(focused)]}
    >
      <View style={styles.text}>
        <Text style={styles.kind}>{contact.kindLabel}</Text>
        <Text style={styles.linkValue}>{contact.text}</Text>
      </View>
      {/* Decorative: the link's label already says what it opens. */}
      <Text style={styles.glyph} aria-hidden importantForAccessibility="no-hide-descendants">
        {copy.place.contactGlyph}
      </Text>
    </Pressable>
  );
}

/** The "Get in touch" card: the rows, with a divider between them. */
export function ContactList({ contacts, onOpen }: { contacts: ContactLink[]; onOpen: (url: string) => void }) {
  return (
    <View style={styles.card}>
      {contacts.map((contact, index) => (
        <Fragment key={contact.kind}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <ContactRow contact={contact} onOpen={onOpen} />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Small card padding, so a row's pressed fill reaches close to the card edge.
  card: { ...cardStyle, padding: spacing.xs },
  // Inset to line up with the row text, decorative only.
  divider: { height: borderWidth.thin, backgroundColor: colors.border, marginHorizontal: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTouchTarget,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  // In a row, so `flex: 1` is safe on web (it only collapses children of a column).
  text: { flex: 1, flexShrink: 1, gap: spacing.xs },
  kind: { ...typography.label, color: colors.mutedText },
  linkValue: { ...typography.bodyStrong, color: colors.primary },
  plainValue: { ...typography.body, color: colors.text },
  glyph: { ...typography.title, color: colors.primary },
});
