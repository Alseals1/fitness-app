import { copy } from './copy';
import { AREA_LABELS } from './placeOptions';
import type { PublicPlace } from './places';
import {
  BUDGETS,
  GOALS,
  isEmptyPreferences,
  TIMES,
  type Goal,
  type Preferences,
  type PreferredTime,
} from './preferences';

/**
 * Ranks places against a person's onboarding preferences.
 *
 * The rule: ranking uses fit only. It never reads payment, sponsorship or the verified mark
 * (`is_verified`), and it never reads contact fields, `created_at` or `updated_at`. Every
 * point comes with a reason that is shown on the result, and there are no penalties: a place
 * that fits less scores less, and nothing is hidden for fitting badly.
 *
 * Pure module: no I/O, no clock, and the input is never changed.
 */

export const WEIGHTS = {
  goal: 3,
  beginnerFriendly: 2,
  allLevels: 1,
  budget: 2,
  time: 1,
  area: 2,
} as const;

export type ReasonKey = 'goals' | 'level' | 'budget' | 'times' | 'area';
export type Reason = { key: ReasonKey; label: string };
export type RankedPlace = { place: PublicPlace; score: number; reasons: Reason[] };

// Typed as Records so typecheck fails if a goal or time has no word.
const GOAL_WORDS: Record<Goal, string> = copy.results.words.goals;
const TIME_WORDS: Record<PreferredTime, string> = copy.results.words.times;

/** `[]` → `''`, `[a]` → `a`, `[a, b]` → `a and b`, `[a, b, c]` → `a, b and c`. */
export function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The position of a price in the order free < budget < moderate < premium. */
function priceRank(price: PublicPlace['price_range']): number {
  return BUDGETS.indexOf(price);
}

/**
 * The score of one place and the reasons for it, in the order goals, level, budget, times,
 * area. `null` preferences, or preferences with no answers, give 0 and no reasons.
 */
export function scorePlace(
  place: PublicPlace,
  preferences: Preferences | null,
): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  let score = 0;
  if (preferences === null) return { score, reasons };

  const goals = GOALS.filter((goal) => preferences.goals.includes(goal) && place.tags.includes(goal));
  if (goals.length > 0) {
    score += WEIGHTS.goal * goals.length;
    reasons.push({
      key: 'goals',
      label: copy.results.reasons.goals(joinWords(goals.map((goal) => GOAL_WORDS[goal]))),
    });
  }

  if (preferences.level === 'beginner' && place.tags.includes('beginner_friendly')) {
    score += WEIGHTS.beginnerFriendly;
    reasons.push({ key: 'level', label: copy.results.reasons.beginnerFriendly });
  } else if (preferences.level !== null && place.tags.includes('all_levels')) {
    score += WEIGHTS.allLevels;
    reasons.push({ key: 'level', label: copy.results.reasons.allLevels });
  }

  if (preferences.budget !== null && priceRank(place.price_range) <= priceRank(preferences.budget)) {
    score += WEIGHTS.budget;
    reasons.push({ key: 'budget', label: copy.results.reasons.withinBudget });
  }

  const times = TIMES.filter((time) => preferences.times.includes(time) && place.tags.includes(time));
  if (times.length > 0) {
    score += WEIGHTS.time * times.length;
    reasons.push({
      key: 'times',
      label: copy.results.reasons.times(capitalize(joinWords(times.map((time) => TIME_WORDS[time])))),
    });
  }

  if (preferences.areas.includes(place.area)) {
    score += WEIGHTS.area;
    reasons.push({ key: 'area', label: copy.results.reasons.area(AREA_LABELS[place.area]) });
  }

  return { score, reasons };
}

/** Milliseconds since the epoch, or null when the date is missing or unreadable. */
function confirmedAt(place: PublicPlace): number | null {
  if (place.last_confirmed_at === null) return null;
  const time = Date.parse(place.last_confirmed_at);
  return Number.isNaN(time) ? null : time;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * The fixed order: score (high first), then last confirmed (newest first, missing last),
 * then name (case-insensitive), then id. With no preferences every score is 0, so this
 * tie-break is the whole order.
 */
export function compareRanked(a: RankedPlace, b: RankedPlace): number {
  if (a.score !== b.score) return b.score - a.score;

  const aTime = confirmedAt(a.place);
  const bTime = confirmedAt(b.place);
  if (aTime !== bTime) {
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  }

  const byName = compareText(a.place.name.toLowerCase(), b.place.name.toLowerCase());
  if (byName !== 0) return byName;
  return compareText(a.place.id, b.place.id);
}

/**
 * Approved places, best fit first, each with its score and reasons. Non-approved rows are
 * dropped (the query already filters them; this is a second guard). Returns a new array.
 */
export function rankPlaces(places: readonly PublicPlace[], preferences: Preferences | null): RankedPlace[] {
  const active = preferences !== null && !isEmptyPreferences(preferences) ? preferences : null;
  return places
    .filter((place) => place.status === 'approved')
    .map((place) => ({ place, ...scorePlace(place, active) }))
    .sort(compareRanked);
}
