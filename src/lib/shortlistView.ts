import type { RankedPlace } from './matching';
import type { PlacesLoad } from './results';

/** The shortlist screen's view model. Pure module: the screen owns the state, this decides what to show. */
export type ShortlistView =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'list'; results: RankedPlace[] };

/**
 * What the shortlist screen shows. Places come in saved order (newest first), not fetch
 * order. A saved id with no approved place (hidden, rejected, pending or deleted) is skipped
 * without an error; if nothing is left, the empty view shows. The status check repeats the
 * query's filter as a second guard. A fetched place that is no longer in `ids` (just unsaved)
 * is left out, so it leaves the screen at once.
 */
export function shortlistView(input: {
  idsLoading: boolean;
  ids: readonly string[];
  places: PlacesLoad;
}): ShortlistView {
  const { idsLoading, ids, places } = input;
  if (idsLoading) return { kind: 'loading' };
  // Nothing saved: nothing to fetch, so the screen does not wait for the places.
  if (ids.length === 0) return { kind: 'empty' };
  if (places.status === 'loading') return { kind: 'loading' };
  if (places.status === 'error') return { kind: 'error', message: places.message };

  const byId = new Map(places.places.filter((place) => place.status === 'approved').map((place) => [place.id, place]));
  const results: RankedPlace[] = [];
  for (const id of ids) {
    const place = byId.get(id);
    // Shortlist cards show no "why this fits you" reasons, so there is no score either.
    if (place) results.push({ place, score: 0, reasons: [] });
  }
  if (results.length === 0) return { kind: 'empty' };
  return { kind: 'list', results };
}
