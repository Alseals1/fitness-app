import { useCallback, useRef, useState } from 'react';
import type { ViewInstance } from 'react-native';

/**
 * A view's top edge in window coordinates, measured after each layout. React Native's
 * `KeyboardAvoidingView` compares its own frame (relative to its parent) with the keyboard's
 * position on screen, so it needs this as `keyboardVerticalOffset`. Measuring covers the stack
 * header and the status bar on every device and text size, without hard-coding their heights.
 */
export function useWindowTop() {
  const ref = useRef<ViewInstance>(null);
  const [top, setTop] = useState(0);
  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((_x, y) => setTop(y));
  }, []);
  return { ref, onLayout, top };
}
