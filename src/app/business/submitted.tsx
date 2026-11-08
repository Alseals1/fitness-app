import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { copy } from '../../lib/copy';
import { clearJustSent, wasJustSent } from '../../lib/submitted';
import { colors, spacing, typography } from '../../lib/theme';

export default function SubmittedScreen() {
  // Read once, without clearing: a double render must see the same answer.
  const [show] = useState(wasJustSent);

  // Cleared after mount, so a later visit or a refresh redirects instead of repeating the message.
  useEffect(() => {
    clearJustSent();
  }, []);

  if (!show) return <Redirect href="/business" />;

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
