import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  type ScrollViewInstance,
  type TextInputInstance,
  type ViewInstance,
} from 'react-native';

import {
  createFieldRegistry,
  firstErrorField,
  focusMethod,
  scrollOffsetFor,
  scrollTargetField,
  type FieldRegistration,
} from '../lib/formErrors';
import { useMotion } from './useMotion';

/** What a form component calls for each field, to say where the field is and what takes focus. */
export type FieldRegister = (key: string) => FieldRegistration<ViewInstance, TextInputInstance>;

/**
 * After a failed send, brings the first field with an error into view and moves focus to it.
 * Put `scrollRef` on the form's `ScrollView`, pass `register` to the fields, and call
 * `reveal(errors)` when the check fails. "First" follows `order`, the screen's top-to-bottom
 * field order.
 */
export function useScrollToFirstError<K extends string>(order: readonly K[]) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [registry] = useState(() => createFieldRegistry<ViewInstance, TextInputInstance>());
  // `n` counts requests, so a second failed send on the same field scrolls again.
  const [request, setRequest] = useState<{ field: string; n: number } | null>(null);

  // Read through a ref, so changing the motion setting never re-runs a scroll.
  const { reduced } = useMotion();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  const reveal = useCallback(
    (errors: Partial<Record<K, string | undefined>>) => {
      const first = firstErrorField(errors, order);
      if (first) setRequest((current) => ({ field: scrollTargetField(first), n: (current?.n ?? 0) + 1 }));
    },
    [order],
  );

  // Runs after the errors have rendered, so the measure sees the layout with the error texts in it.
  useEffect(() => {
    if (!request) return;
    const target = registry.target(request.field);
    const scroll = scrollRef.current;
    const content = scroll?.getInnerViewRef();
    if (!target.container || !scroll || !content) return;
    let active = true;
    target.container.measureLayout(content, (_x, y) => {
      if (!active) return;
      scroll.scrollTo({ y: scrollOffsetFor(y), animated: !reducedRef.current });
      const method = focusMethod({ input: target.input !== undefined, chip: target.chip !== undefined }, Platform.OS);
      if (method === 'input') target.input?.focus();
      else if (method === 'web-focus') target.chip?.focus();
      // Not on web: react-native-web has no sendAccessibilityEvent.
      else if (method === 'a11y-focus' && target.chip) AccessibilityInfo.sendAccessibilityEvent(target.chip, 'focus');
    });
    return () => {
      active = false;
    };
  }, [request, registry]);

  return { scrollRef, register: registry.register satisfies FieldRegister, reveal };
}
