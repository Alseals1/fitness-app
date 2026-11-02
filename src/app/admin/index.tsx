import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { copy } from '../../lib/copy';
import { colors, fontSize, spacing } from '../../lib/theme';

// Placeholder: the pending queue replaces this screen in the next part of the stack.
export default function AdminScreen() {
  const { signOut } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.admin}</Text>
      <Button label={copy.signOut} variant="secondary" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
});
