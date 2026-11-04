import { useCallback, useState } from 'react';
import type { BlurEvent, FocusEvent } from 'react-native';

type Handlers = { onFocus?: (event: FocusEvent) => void; onBlur?: (event: BlurEvent) => void };

/**
 * Whether a `Pressable` has keyboard, switch or TV focus, for drawing a focus ring. Spread the
 * returned `onFocus` and `onBlur` on the `Pressable`. A caller's own handlers are still called.
 */
export function useFocusState({ onFocus, onBlur }: Handlers = {}) {
  const [focused, setFocused] = useState(false);
  const handleFocus = useCallback(
    (event: FocusEvent) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );
  const handleBlur = useCallback(
    (event: BlurEvent) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );
  return { focused, onFocus: handleFocus, onBlur: handleBlur };
}
