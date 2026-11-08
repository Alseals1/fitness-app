import type { RankedPlace } from './matching';
import type { PlacesLoad } from './results';

/** A row playing its exit after a removal. `index` is its display index when it was removed. */
export type LeavingRow = { result: RankedPlace; index: number };

/** One row of the list: a saved place, or a removed one still leaving (hidden from screen readers). */
export type ShortlistRowModel = { result: RankedPlace; leaving: boolean };

/** The shortlist screen's view model. Pure module: the screen owns the state, this decides what to show. */
export type ShortlistView =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'list'; rows: ShortlistRowModel[]; savedCount: number };

/**
 * What the shortlist screen shows. Places come in saved order (newest first), not fetch
 * order. A saved id with no approved place (hidden, rejected, pending or deleted) is skipped
 * without an error. The status check repeats the query's filter as a second guard. A fetched
 * place that is no longer in `ids` (just removed) is left out as a saved row at once.
 *
 * `leaving` holds the rows still playing their exit: each goes back in at its old display index
 * (in array order, clamped to the list), so the rows below can close the gap gently. A leaving
 * row whose id is saved again is dropped, since its saved row shows instead. The empty view
 * shows only once nothing is saved and nothing is leaving; `savedCount` counts saved rows only.
 */
export function shortlistView(input: {
  idsLoading: boolean;
  ids: readonly string[];
  places: PlacesLoad;
  leaving?: readonly LeavingRow[];
}): ShortlistView {
  const { idsLoading, ids, places, leaving = [] } = input;
  if (idsLoading) return { kind: 'loading' };
  const ghosts = leaving.filter((row) => !ids.includes(row.result.place.id));
  // Nothing saved: nothing to fetch, so the screen does not wait for the places.
  if (ids.length === 0) return ghosts.length === 0 ? { kind: 'empty' } : withGhosts([], ghosts);
  if (places.status === 'loading') return { kind: 'loading' };
  if (places.status === 'error') return { kind: 'error', message: places.message };

  const byId = new Map(places.places.filter((place) => place.status === 'approved').map((place) => [place.id, place]));
  const results: RankedPlace[] = [];
  for (const id of ids) {
    const place = byId.get(id);
    // Shortlist cards show no "why this fits you" reasons, so there is no score either.
    if (place) results.push({ place, score: 0, reasons: [] });
  }
  if (results.length === 0 && ghosts.length === 0) return { kind: 'empty' };
  return withGhosts(results, ghosts);
}

function withGhosts(results: readonly RankedPlace[], ghosts: readonly LeavingRow[]): ShortlistView {
  const rows: ShortlistRowModel[] = results.map((result) => ({ result, leaving: false }));
  for (const ghost of ghosts) {
    rows.splice(Math.min(Math.max(ghost.index, 0), rows.length), 0, { result: ghost.result, leaving: true });
  }
  return { kind: 'list', rows, savedCount: results.length };
}

/**
 * The key the places are fetched by. A removal (or an undo of it) keeps the last key, so the
 * places already fetched still cover the list and nothing reloads: an undone row comes back at
 * once. A new id gives a new key: the sorted ids, so a change of order alone never refetches.
 */
export function shortlistFetchKey(ids: readonly string[], requestedKey: string | null): string {
  if (requestedKey !== null) {
    const requested = new Set(requestedKey === '' ? [] : requestedKey.split(','));
    if (ids.every((id) => requested.has(id))) return requestedKey;
  }
  return [...ids].sort().join(',');
}
