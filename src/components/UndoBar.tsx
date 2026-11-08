import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { copy } from '../lib/copy';
import { resultCardLayout } from '../lib/results';
import { noticeMessage, type ShortlistNotice } from '../lib/shortlistEdits';
import { borderWidth, colors, shadow, spacing, typography } from '../lib/theme';
import { Button } from './Button';

type Props = {
  /** What to say: the newest removal (with Undo), or that the place is back. Nothing when null. */
  notice: ShortlistNotice | null;
  onUndo: () => void;
};

/**
 * The bar under the shortlist after a removal: "Removed <name>." and an Undo button, then "<name>
 * is back on your shortlist." after Undo. It has no timer (WCAG 2.2.1): the screen replaces or
 * clears the notice. It stays mounted with no notice, so its live region exists before the text
 * changes and Android and web read each change. At a large font scale or in a narrow window the
 * button moves under the text, as on a result card.
 */
export function UndoBar({ notice, onUndo }: Props) {
  const insets = useSafeAreaInsets();
  const { fontScale, width } = useWindowDimensions();
  const stacked = resultCardLayout(fontScale, width) === 'stacked';
  return (
    <View
      style={
        notice
          ? [styles.bar, stacked ? styles.barStacked : styles.barRow, { paddingBottom: spacing.lg + insets.bottom }]
          : undefined
      }
    >
      <Text style={[styles.message, !notice && styles.messageEmpty, notice && !stacked && styles.messageRow]} accessibilityLiveRegion="polite">
        {notice ? noticeMessage(notice) : ''}
      </Text>
      {notice?.kind === 'removed' ? (
        <View style={stacked ? styles.buttonStacked : undefined}>
          <Button
            label={copy.shortlist.undo}
            variant="secondary"
            accessibilityLabel={copy.shortlist.undoLabel(notice.name)}
            onPress={onUndo}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: borderWidth.thin,
    borderTopColor: colors.border,
    boxShadow: shadow.raised,
    padding: spacing.lg,
    gap: spacing.md,
  },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barStacked: { flexDirection: 'column', alignItems: 'stretch' },
  message: { ...typography.body, color: colors.text },
  // Only beside the button: in a column, `flex` would collapse the text to a zero height on web.
  messageRow: { flex: 1 },
  buttonStacked: { alignSelf: 'flex-start' },
  // The live region stays mounted with no text: it must take no room then.
  messageEmpty: { height: 0 },
});
