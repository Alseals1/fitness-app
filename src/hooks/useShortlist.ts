import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { copy } from '../lib/copy';
import { deviceStorage } from '../lib/deviceStorage';
import {
  addId,
  insertIdAt,
  isSaved as isSavedIn,
  loadShortlist,
  removeId,
  restoreShortlistId,
  updateShortlist,
} from '../lib/shortlist';

/**
 * Every shortlist read and write, in order, shared by all screens. A load waits for the writes
 * before it, so a screen coming back into focus never reads a list that is about to change.
 * Each write reads the stored list itself, so it never builds on a stale copy.
 */
let writeChain: Promise<unknown> = Promise.resolve();

export type Shortlist = {
  /** The saved place ids, newest first. */
  ids: string[];
  /** True only for the first load, so the screen does not flicker on later ones. */
  loading: boolean;
  isSaved: (id: string) => boolean;
  /** Saves or removes a place. Ignored until the first load is done: returns false when it was. */
  toggle: (id: string) => boolean;
  /**
   * Removes a saved place. Returns its index in the list before the removal (for an undo), or
   * null when nothing changed: the first load is not done, or the place is not saved.
   */
  remove: (id: string) => number | null;
  /**
   * Puts a removed place back at `index` (an undo), not at the front. A place saved again by then
   * stays where it is. Ignored until the first load is done: returns false when it was.
   */
  restore: (id: string, index: number) => boolean;
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
  // What this screen shows, so quick taps build on each other before a re-render.
  const idsRef = useRef<string[]>([]);
  const loadingRef = useRef(true);
  // Writes from this screen still in the chain. While any are, a stored list read earlier is
  // older than what the screen shows, so only the last write's result is put on screen.
  const pendingRef = useRef(0);

  const apply = useCallback((next: string[]) => {
    idsRef.current = next;
    setIds(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = writeChain.then(() => loadShortlist(deviceStorage));
      writeChain = load;
      load.then((loaded) => {
        if (!active) return;
        if (pendingRef.current === 0) apply(loaded);
        loadingRef.current = false;
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [apply]),
  );

  /** Shows `next` at once, then runs `write` in the chain; on failure, shows what is stored and the error. */
  const commit = useCallback(
    (next: string[], write: () => Promise<string[]>) => {
      apply(next);
      setSaveError(null);
      pendingRef.current += 1;

      // A state update after unmount is a no-op.
      const settle = (storedIds: string[]) => {
        pendingRef.current -= 1;
        if (pendingRef.current === 0) apply(storedIds);
      };
      writeChain = writeChain.then(write).then(settle, async () => {
        setSaveError(copy.shortlist.saveFailed);
        // Put the list back to what is stored.
        settle(await loadShortlist(deviceStorage));
      });
    },
    [apply],
  );

  const toggle = useCallback(
    (id: string) => {
      // Before the first load the screen does not know what is saved, so a tap could undo it.
      if (loadingRef.current) return false;
      // Decide from what the button shows, then apply that to the stored list in the chain.
      const save = !isSavedIn(idsRef.current, id);
      commit(save ? addId(idsRef.current, id) : removeId(idsRef.current, id), () =>
        updateShortlist(deviceStorage, id, save),
      );
      return true;
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => {
      if (loadingRef.current) return null;
      const index = idsRef.current.indexOf(id);
      if (index === -1) return null;
      commit(removeId(idsRef.current, id), () => updateShortlist(deviceStorage, id, false));
      return index;
    },
    [commit],
  );

  const restore = useCallback(
    (id: string, index: number) => {
      if (loadingRef.current) return false;
      commit(insertIdAt(idsRef.current, id, index), () => restoreShortlistId(deviceStorage, id, index));
      return true;
    },
    [commit],
  );

  const isSaved = useCallback((id: string) => isSavedIn(ids, id), [ids]);

  return { ids, loading, isSaved, toggle, remove, restore, saveError };
}
