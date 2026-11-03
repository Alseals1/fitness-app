import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useAuth } from '../../hooks/useAuth';
import { businessHomeLinks } from '../../lib/businessHome';
import { copy } from '../../lib/copy';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function BusinessHomeScreen() {
  const { session, loading } = useAuth();
  const signedIn = !!session;
  const links = businessHomeLinks(signedIn);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.intro}>{copy.business.intro}</Text>
      {loading ? null : (
        <>
          {signedIn ? null : <Text style={styles.hint}>{copy.business.signedOutHint}</Text>}
          {links.map((link) => (
            <Link key={link.href} href={link.href} style={styles.link}>
              {link.label}
            </Link>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.md },
  intro: { fontSize: fontSize.body, color: colors.text },
  hint: { fontSize: fontSize.body, color: colors.mutedText },
  link: { fontSize: fontSize.body, color: colors.primary, fontWeight: '600', paddingVertical: spacing.sm },
});
