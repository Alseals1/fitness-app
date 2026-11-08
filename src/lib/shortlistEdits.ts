import { copy } from './copy';
import type { RankedPlace } from './matching';
import type { LeavingRow } from './shortlistView';

/**
 * The shortlist screen's own edit state: the rows still playing their exit, the undo bar's notice,
 * and the place just put back (so only that row replays an entrance). Pure module: the storage
 * writes go through `useShortlist`; this only tracks what the screen shows around them.
 */

/** What the undo bar says. Only the newest removal can be undone. Neither notice has a timer. */
export type ShortlistNotice =
  | { kind: 'removed'; id: string; name: string; savedIndex: number }
  | { kind: 'restored'; name: string };

/** What the undo bar says (and iOS announces) for a notice. */
export function noticeMessage(notice: ShortlistNotice): string {
  return notice.kind === 'removed' ? copy.shortlist.removed(notice.name) : copy.shortlist.restored(notice.name);
}

export type ShortlistEdits = {
  leaving: LeavingRow[];
  notice: ShortlistNotice | null;
  restoredId: string | null;
};

export type ShortlistEditAction =
  /** A place was removed: `displayIndex` is its row on screen, `savedIndex` its place in the stored list. */
  | { type: 'removed'; result: RankedPlace; displayIndex: number; savedIndex: number }
  /** Undo was tapped on the current `removed` notice. */
  | { type: 'undone' }
  /** A leaving row's exit finished. */
  | { type: 'exitDone'; id: string }
  /** The screen lost focus: drop everything. */
  | { type: 'reset' };

export const initialShortlistEdits: ShortlistEdits = { leaving: [], notice: null, restoredId: null };

export function shortlistEditsReducer(state: ShortlistEdits, action: ShortlistEditAction): ShortlistEdits {
  switch (action.type) {
    case 'removed': {
      const { place } = action.result;
      return {
        leaving: [
          ...state.leaving.filter((row) => row.result.place.id !== place.id),
          { result: action.result, index: action.displayIndex },
        ],
        notice: { kind: 'removed', id: place.id, name: place.name, savedIndex: action.savedIndex },
        restoredId: state.restoredId === place.id ? null : state.restoredId,
      };
    }
    case 'undone': {
      const { notice } = state;
      if (notice?.kind !== 'removed') return state;
      return {
        leaving: state.leaving.filter((row) => row.result.place.id !== notice.id),
        notice: { kind: 'restored', name: notice.name },
        restoredId: notice.id,
      };
    }
    case 'exitDone': {
      if (!state.leaving.some((row) => row.result.place.id === action.id)) return state;
      return { ...state, leaving: state.leaving.filter((row) => row.result.place.id !== action.id) };
    }
    case 'reset':
      return initialShortlistEdits;
  }
}
