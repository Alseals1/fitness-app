import { copy } from './copy';
import { rankPlaces, type RankedPlace } from './matching';
import { AREA_LABELS, CATEGORY_LABELS, PRICE_LABELS } from './placeOptions';
import type { PublicPlace } from './places';
import { isEmptyPreferences, type Preferences } from './preferences';
import { stackedCardFontScale } from './theme';

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

/** The "category · area · price" line on a result card. */
export function resultCardMeta(result: RankedPlace): string {
  const { place } = result;
  return [CATEGORY_LABELS[place.category], AREA_LABELS[place.area], PRICE_LABELS[place.price_range]].join(' · ');
}

/** What a screen reader says for a result card: one link with the name, the details and the reasons. */
export function resultCardAccessibilityLabel(result: RankedPlace): string {
  const parts = [result.place.name, resultCardMeta(result)];
  if (result.reasons.length > 0) {
    parts.push(`${copy.results.reasonsLabel}: ${result.reasons.map((reason) => reason.label).join(', ')}`);
  }
  return parts.join('. ');
}

/** The visible text of a result card above its name and under it: the category, then "<part of town> · <price>". */
export function resultCardText(result: RankedPlace): { category: string; facts: string } {
  const { place } = result;
  return {
    category: CATEGORY_LABELS[place.category],
    facts: [AREA_LABELS[place.area], copy.results.priceShort[place.price_range]].join(' · '),
  };
}

/** The line above the cards, for example "12 places, best fit first". Ranked by fit only with preferences. */
export function resultsSummary(count: number, hasPreferences: boolean): string {
  return copy.results.summary(count, hasPreferences);
}

/** Whether a result card puts Save beside its text (`row`) or under it (`stacked`, for large system text). */
export function resultCardLayout(fontScale: number): 'row' | 'stacked' {
  return fontScale >= stackedCardFontScale ? 'stacked' : 'row';
}
