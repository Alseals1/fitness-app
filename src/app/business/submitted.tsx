import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { copy } from '../../lib/copy';
import { colors, fontSize, spacing } from '../../lib/theme';

export default function SubmittedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.body} accessibilityLiveRegion="polite">
        {copy.business.submittedBody}
      </Text>
      <Link href="/" dismissTo style={styles.link}>
        {copy.business.homeLink}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.lg },
  body: { fontSize: fontSize.body, color: colors.text },
  link: { fontSize: fontSize.body, color: colors.primary, fontWeight: '600', paddingVertical: spacing.sm },
});
