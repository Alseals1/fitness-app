import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { copy } from '../lib/copy';
import { deviceStorage } from '../lib/deviceStorage';
import { isSaved as isSavedIn, loadShortlist, saveShortlist, toggleId } from '../lib/shortlist';

/**
 * Every shortlist write, in order, shared by all screens. A load waits for the writes before
 * it, so a screen coming back into focus never reads a list that is about to change.
 */
let writeChain: Promise<unknown> = Promise.resolve();

export type Shortlist = {
  /** The saved place ids, newest first. */
  ids: string[];
  /** True only for the first load, so the screen does not flicker on later ones. */
  loading: boolean;
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Set when the last change could not be saved; the list is then back to what is stored. */
  saveError: string | null;
};

/**
 * The shortlist on this device, reloaded each time the screen comes into focus so a change
 * made on another screen shows on return. A toggle shows at once; the write follows in order.
 */
export function useShortlist(): Shortlist {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The newest list, so quick taps build on each other before a re-render.
  const idsRef = useRef<string[]>([]);

  const apply = useCallback((next: string[]) => {
    idsRef.current = next;
    setIds(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      writeChain
        .then(() => loadShortlist(deviceStorage))
        .then((loaded) => {
          if (!active) return;
          apply(loaded);
          setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [apply]),
  );

  const toggle = useCallback(
    (id: string) => {
      const next = toggleId(idsRef.current, id);
      apply(next);
      setSaveError(null);
      writeChain = writeChain
        .then(() => saveShortlist(deviceStorage, next))
        .catch(async () => {
          // Put the list back to what is stored. A state update after unmount is a no-op.
          const storedIds = await loadShortlist(deviceStorage);
          setSaveError(copy.shortlist.saveFailed);
          apply(storedIds);
        });
    },
    [apply],
  );

  const isSaved = useCallback((id: string) => isSavedIn(ids, id), [ids]);

  return { ids, loading, isSaved, toggle, saveError };
}
