import { rankPlaces, type RankedPlace } from './matching';
import type { PublicPlace } from './places';
import { isEmptyPreferences, type Preferences } from './preferences';

/** The results screen's place data. Pure module: the screen owns the state, this decides what to show. */
export type PlacesLoad =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; places: PublicPlace[] };

export type ResultsView =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty'; hasPreferences: boolean }
  | { kind: 'list'; hasPreferences: boolean; results: RankedPlace[] };

/** What the results screen shows: loading, then an error, then the ranked list or "nothing here yet". */
export function resultsView(input: {
  preferencesLoading: boolean;
  preferences: Preferences | null;
  places: PlacesLoad;
}): ResultsView {
  const { preferencesLoading, preferences, places } = input;
  if (preferencesLoading || places.status === 'loading') return { kind: 'loading' };
  if (places.status === 'error') return { kind: 'error', message: places.message };

  const hasPreferences = preferences !== null && !isEmptyPreferences(preferences);
  const results = rankPlaces(places.places, preferences);
  if (results.length === 0) return { kind: 'empty', hasPreferences };
  return { kind: 'list', hasPreferences, results };
}
