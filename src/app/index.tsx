import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { copy } from '../lib/copy';
import { colors, fontSize, spacing } from '../lib/theme';

export default function HomeScreen() {
  const { session, isAdmin, loading, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.appName}</Text>
      <Text style={styles.subtitle}>{copy.tagline}</Text>

      {/* Browsing never needs an account: this only offers the sign-in for admins. */}
      {loading ? null : !session ? (
        <Link href="/sign-in" style={styles.link}>
          {copy.signIn}
        </Link>
      ) : isAdmin ? (
        <Link href="/admin" style={styles.link}>
          {copy.admin}
        </Link>
      ) : (
        <View style={styles.account}>
          <Text style={styles.subtitle}>{copy.notAdmin}</Text>
          <Button label={copy.signOut} variant="secondary" onPress={signOut} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: fontSize.heading, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  subtitle: { fontSize: fontSize.body, textAlign: 'center', color: colors.mutedText },
  link: {
    marginTop: spacing.xl,
    fontSize: fontSize.body,
    color: colors.primary,
    fontWeight: '600',
    padding: spacing.sm,
  },
  account: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
});
