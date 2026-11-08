import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';

import { exitStyle } from '../lib/animations';
import type { RankedPlace } from '../lib/matching';
import type { Entrance, Exit } from '../lib/motion';
import { spacing } from '../lib/theme';
import { ResultCard } from './ResultCard';

type Props = {
  result: RankedPlace;
  /** True while the row plays its exit after a removal. */
  leaving: boolean;
  /** How a leaving row goes: see `exitFor`. */
  exit: Exit;
  /** How the card first appears: see `rowEntrance`. */
  entrance: Entrance;
  /** Returns false when the tap was ignored (the shortlist is still loading). */
  onRemove: (id: string) => boolean;
};

/**
 * One saved place on the shortlist, with a Remove button. The row carries the gap below it, so a
 * removed row takes its gap with it as it collapses. A leaving row is out of the screen-reader
 * tree and takes no touches at once; it only stays on screen for its exit. The exit is a CSS
 * animation on this wrapper, never a layout animation (see `exitStyle`).
 */
export function ShortlistRow({ result, leaving, exit, entrance, onRemove }: Props) {
  // The last height before the row started leaving: the collapse starts from it.
  const [height, setHeight] = useState<number | null>(null);
  // A row put back while it was still leaving mounts a fresh card, so it replays the entrance.
  const [generation, setGeneration] = useState(0);
  const [wasLeaving, setWasLeaving] = useState(leaving);
  if (wasLeaving !== leaving) {
    setWasLeaving(leaving);
    if (!leaving) setGeneration((count) => count + 1);
  }

  const onLayout = (event: LayoutChangeEvent) => {
    if (!leaving) setHeight(event.nativeEvent.layout.height);
  };
  const exitAnimation = useMemo(() => (leaving ? exitStyle(exit, height) : undefined), [leaving, exit, height]);

  return (
    <Animated.View
      onLayout={onLayout}
      style={[leaving && styles.leaving, exitAnimation]}
      aria-hidden={leaving}
      importantForAccessibility={leaving ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={leaving}
    >
      {/* The gap is inside the clipped wrapper, so the collapse reaches 0 with no last jump. */}
      <View style={styles.gap}>
        <ResultCard
          key={generation}
          result={result}
          saved
          onToggleSave={onRemove}
          entrance={entrance}
          action="remove"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gap: { paddingBottom: spacing.md },
  // Clip only while collapsing, so a resting card's shadow and focus ring are never cut off.
  leaving: { overflow: 'hidden', pointerEvents: 'none' },
});
