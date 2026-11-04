import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { copy } from '../../lib/copy';
import { colors, spacing, typography } from '../../lib/theme';

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
  body: { ...typography.body, color: colors.text },
  link: { ...typography.bodyStrong, color: colors.primary, paddingVertical: spacing.sm },
});
