import { compareRanked, joinWords, rankPlaces, scorePlace, WEIGHTS, type RankedPlace, type ReasonKey } from './matching';
import type { PublicPlace } from './places';
import { emptyPreferences, type Preferences } from './preferences';

/** A full approved place with fictional details; override what a test cares about. */
function makePlace(overrides: Partial<PublicPlace> = {}): PublicPlace {
  return {
    id: '5eed0000-0000-4000-8000-000000000000',
    name: 'Sample Place (sample)',
    category: 'gym',
    description: null,
    area: 'downtown',
    price_range: 'moderate',
    schedule: null,
    website_url: null,
    contact_phone: '205-555-0100',
    contact_email: null,
    instagram_handle: null,
    tags: [],
    status: 'approved',
    is_verified: false,
    last_confirmed_at: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

function prefs(overrides: Partial<Preferences>): Preferences {
  return { ...emptyPreferences, ...overrides };
}

const labels = (result: { reasons: { label: string }[] }) => result.reasons.map((reason) => reason.label);
const ids = (ranked: RankedPlace[]) => ranked.map((result) => result.place.id);

describe('joinWords', () => {
  it.each([
    [[], ''],
    [['yoga'], 'yoga'],
    [['strength', 'yoga'], 'strength and yoga'],
    [['strength', 'cardio', 'yoga'], 'strength, cardio and yoga'],
  ])('joins %p as %p', (words, joined) => {
    expect(joinWords(words)).toBe(joined);
  });
});

describe('scorePlace, one dimension at a time', () => {
  it('scores a matching goal', () => {
    const result = scorePlace(makePlace({ tags: ['yoga'] }), prefs({ goals: ['yoga'] }));
    expect(result).toEqual({ score: WEIGHTS.goal, reasons: [{ key: 'goals', label: 'Good for yoga' }] });
  });

  it('scores each matching goal, listed in GOALS order whatever order the preferences use', () => {
    const result = scorePlace(
      makePlace({ tags: ['cardio', 'strength', 'yoga'] }),
      prefs({ goals: ['cardio', 'strength', 'running'] }),
    );
    expect(result.score).toBe(2 * WEIGHTS.goal);
    expect(labels(result)).toEqual(['Good for strength and cardio']);
  });

  it('gives nothing for a goal the place does not offer', () => {
    expect(scorePlace(makePlace({ tags: ['yoga'] }), prefs({ goals: ['running'] }))).toEqual({
      score: 0,
      reasons: [],
    });
  });

  it('scores beginner plus beginner_friendly', () => {
    const result = scorePlace(makePlace({ tags: ['beginner_friendly'] }), prefs({ level: 'beginner' }));
    expect(result).toEqual({
      score: WEIGHTS.beginnerFriendly,
      reasons: [{ key: 'level', label: 'Beginner friendly' }],
    });
  });

  it('scores beginner plus only all_levels lower', () => {
    const result = scorePlace(makePlace({ tags: ['all_levels'] }), prefs({ level: 'beginner' }));
    expect(result).toEqual({ score: WEIGHTS.allLevels, reasons: [{ key: 'level', label: 'All levels welcome' }] });
  });

  it('gives one level reason when a place has both level tags', () => {
    const result = scorePlace(
      makePlace({ tags: ['beginner_friendly', 'all_levels'] }),
      prefs({ level: 'beginner' }),
    );
    expect(result.score).toBe(WEIGHTS.beginnerFriendly);
    expect(labels(result)).toEqual(['Beginner friendly']);
  });

  it('gives nothing to an experienced person for beginner_friendly alone', () => {
    expect(scorePlace(makePlace({ tags: ['beginner_friendly'] }), prefs({ level: 'experienced' }))).toEqual({
      score: 0,
      reasons: [],
    });
  });

  it.each(['some_experience', 'experienced'] as const)('scores all_levels for %s', (level) => {
    expect(scorePlace(makePlace({ tags: ['all_levels'] }), prefs({ level })).score).toBe(WEIGHTS.allLevels);
  });

  it.each([
    ['equal to', 'moderate', WEIGHTS.budget],
    ['below', 'budget', WEIGHTS.budget],
    ['above', 'premium', 0],
  ] as const)('budget: a price %s the budget scores %p', (_case, price, score) => {
    const result = scorePlace(makePlace({ price_range: price }), prefs({ budget: 'moderate' }));
    expect(result.score).toBe(score);
    expect(labels(result)).toEqual(score > 0 ? ['Within your budget'] : []);
  });

  it('budget: a free place fits a free budget, a budget place does not', () => {
    expect(scorePlace(makePlace({ price_range: 'free' }), prefs({ budget: 'free' })).score).toBe(WEIGHTS.budget);
    expect(scorePlace(makePlace({ price_range: 'budget' }), prefs({ budget: 'free' })).score).toBe(0);
  });

  it('scores one matching time', () => {
    const result = scorePlace(makePlace({ tags: ['evenings'] }), prefs({ times: ['evenings'] }));
    expect(result).toEqual({ score: WEIGHTS.time, reasons: [{ key: 'times', label: 'Evening times' }] });
  });

  it('scores each matching time, in TIMES order and capitalized', () => {
    const result = scorePlace(
      makePlace({ tags: ['weekends', 'mornings', 'evenings'] }),
      prefs({ times: ['weekends', 'mornings'] }),
    );
    expect(result.score).toBe(2 * WEIGHTS.time);
    expect(labels(result)).toEqual(['Morning and weekend times']);
  });

  it('scores an area in the list and nothing for one outside it', () => {
    expect(scorePlace(makePlace({ area: 'southside' }), prefs({ areas: ['hoover', 'southside'] }))).toEqual({
      score: WEIGHTS.area,
      reasons: [{ key: 'area', label: 'In Southside' }],
    });
    expect(scorePlace(makePlace({ area: 'downtown' }), prefs({ areas: ['hoover'] })).score).toBe(0);
  });
});

describe('scorePlace, all together', () => {
  const place = makePlace({
    area: 'mountain_brook',
    price_range: 'budget',
    tags: ['weekends', 'strength', 'beginner_friendly', 'yoga'],
  });
  const full = prefs({
    areas: ['mountain_brook'],
    times: ['weekends'],
    budget: 'premium',
    level: 'beginner',
    goals: ['yoga', 'strength'],
  });

  it('lists the reasons in the order goals, level, budget, times, area', () => {
    const result = scorePlace(place, full);
    expect(result.reasons.map((reason) => reason.key)).toEqual<ReasonKey[]>([
      'goals',
      'level',
      'budget',
      'times',
      'area',
    ]);
    expect(labels(result)).toEqual([
      'Good for strength and yoga',
      'Beginner friendly',
      'Within your budget',
      'Weekend times',
      'In Mountain Brook',
    ]);
  });

  it('scores exactly the sum of the weights behind the reasons shown', () => {
    expect(scorePlace(place, full).score).toBe(
      2 * WEIGHTS.goal + WEIGHTS.beginnerFriendly + WEIGHTS.budget + WEIGHTS.time + WEIGHTS.area,
    );
  });

  it('scores only budget when only budget is set', () => {
    expect(scorePlace(place, prefs({ budget: 'premium' }))).toEqual({
      score: WEIGHTS.budget,
      reasons: [{ key: 'budget', label: 'Within your budget' }],
    });
  });
});

describe('rankPlaces', () => {
  const yoga = makePlace({ id: 'a', name: 'Yoga (sample)', tags: ['yoga', 'beginner_friendly'], area: 'southside' });
  const gym = makePlace({ id: 'b', name: 'Gym (sample)', tags: ['strength'], price_range: 'premium' });
  const run = makePlace({ id: 'c', name: 'Run (sample)', tags: ['running'], price_range: 'free', area: 'lakeview' });
  const places = [gym, run, yoga];

  it('puts the best match first', () => {
    const ranked = rankPlaces(places, prefs({ goals: ['yoga'], level: 'beginner' }));
    expect(ids(ranked)[0]).toBe('a');
    expect(ranked[0].score).toBe(WEIGHTS.goal + WEIGHTS.beginnerFriendly);
  });

  it('keeps over-budget and wrong-area places, ranked lower', () => {
    const ranked = rankPlaces(places, prefs({ budget: 'budget', areas: ['lakeview'] }));
    // a and b tie at 0, so the name decides: Gym before Yoga.
    expect(ids(ranked)).toEqual(['c', 'b', 'a']);
    expect(ranked.map((result) => result.score)).toEqual([WEIGHTS.budget + WEIGHTS.area, 0, 0]);
  });

  it.each([
    ['null', null],
    ['empty', emptyPreferences],
  ])('gives every place 0 and no reasons with %s preferences', (_case, preferences) => {
    const ranked = rankPlaces(places, preferences);
    expect(ranked).toHaveLength(3);
    for (const result of ranked) expect(result).toMatchObject({ score: 0, reasons: [] });
  });

  it('drops pending, rejected and hidden rows', () => {
    const rows = [
      makePlace({ id: 'ok', status: 'approved' }),
      makePlace({ id: 'p', status: 'pending', tags: ['yoga'] }),
      makePlace({ id: 'r', status: 'rejected' }),
      makePlace({ id: 'h', status: 'hidden' }),
    ];
    expect(ids(rankPlaces(rows, prefs({ goals: ['yoga'] })))).toEqual(['ok']);
    expect(ids(rankPlaces(rows, null))).toEqual(['ok']);
  });

  it('returns an empty list for no places', () => {
    expect(rankPlaces([], prefs({ goals: ['yoga'] }))).toEqual([]);
  });
});

describe('ties', () => {
  const newer = makePlace({ id: 't1', name: 'Zed (sample)', last_confirmed_at: '2026-10-28T12:00:00+00:00' });
  const older = makePlace({ id: 't2', name: 'Alpha (sample)', last_confirmed_at: '2026-10-15T14:00:00+00:00' });
  const neverB = makePlace({ id: 't3', name: 'bravo (sample)' });
  const neverA = makePlace({ id: 't4', name: 'Alpha (sample)' });
  const neverASameName = makePlace({ id: 't0', name: 'ALPHA (sample)' });
  const expected = ['t1', 't2', 't0', 't4', 't3'];
  const set = [neverB, older, neverA, newer, neverASameName];

  it('orders equal scores by last confirmed (newest first, missing last), then name, then id', () => {
    expect(ids(rankPlaces(set, null))).toEqual(expected);
  });

  it('gives the same output whatever the input order', () => {
    const orders = [set, [...set].reverse(), [set[2], set[4], set[0], set[3], set[1]]];
    for (const order of orders) expect(ids(rankPlaces(order, null))).toEqual(expected);
  });

  it('compares names without case', () => {
    const lower = { place: makePlace({ id: 'x', name: 'apple' }), score: 0, reasons: [] };
    const upper = { place: makePlace({ id: 'y', name: 'Banana' }), score: 0, reasons: [] };
    expect(compareRanked(lower, upper)).toBeLessThan(0);
    expect(compareRanked(upper, lower)).toBeGreaterThan(0);
  });

  it('treats an unreadable date like a missing one', () => {
    const bad = makePlace({ id: 'bad', name: 'A (sample)', last_confirmed_at: 'not a date' });
    const dated = makePlace({ id: 'dated', name: 'Z (sample)', last_confirmed_at: '2026-01-01T00:00:00Z' });
    expect(ids(rankPlaces([bad, dated], null))).toEqual(['dated', 'bad']);
  });

  it('lets score win over the tie-break', () => {
    const fits = makePlace({ id: 'fits', name: 'Zzz (sample)', tags: ['running'] });
    expect(ids(rankPlaces([newer, fits], prefs({ goals: ['running'] })))).toEqual(['fits', 't1']);
  });

  it('with no preferences, the order is the tie-break order', () => {
    const ranked = rankPlaces(set, null);
    expect(ids([...ranked].sort(compareRanked))).toEqual(ids(ranked));
  });
});

describe('ranking never uses payment or the verified mark', () => {
  const places = [
    makePlace({ id: 'a', name: 'A (sample)', tags: ['yoga'], is_verified: false }),
    makePlace({ id: 'b', name: 'B (sample)', tags: ['strength'], is_verified: true }),
    makePlace({ id: 'c', name: 'C (sample)', tags: ['yoga', 'evenings'], is_verified: false }),
    makePlace({ id: 'd', name: 'D (sample)', is_verified: true, last_confirmed_at: '2026-10-01T00:00:00Z' }),
  ];
  const preferences = prefs({ goals: ['yoga'], times: ['evenings'] });
  const summary = (ranked: RankedPlace[]) => ranked.map((r) => [r.place.id, r.score, r.reasons]);

  it('gives the same order and scores when is_verified flips', () => {
    const flipped = places.map((place) => ({ ...place, is_verified: !place.is_verified }));
    expect(summary(rankPlaces(flipped, preferences))).toEqual(summary(rankPlaces(places, preferences)));
    expect(summary(rankPlaces(flipped, null))).toEqual(summary(rankPlaces(places, null)));
  });

  it('gives the same order and scores when created_at and updated_at change', () => {
    const moved = places.map((place, index) => ({
      ...place,
      created_at: `2020-0${index + 1}-01T00:00:00Z`,
      updated_at: `2030-0${4 - index}-01T00:00:00Z`,
    }));
    expect(summary(rankPlaces(moved, preferences))).toEqual(summary(rankPlaces(places, preferences)));
    expect(summary(rankPlaces(moved, null))).toEqual(summary(rankPlaces(places, null)));
  });
});

describe('purity', () => {
  it('never changes its input and returns a new array', () => {
    const places = [
      makePlace({ id: 'b', name: 'B (sample)', tags: ['cardio'] }),
      makePlace({ id: 'a', name: 'A (sample)', tags: ['yoga'], status: 'pending' }),
      makePlace({ id: 'c', name: 'C (sample)', tags: ['yoga'] }),
    ];
    const preferences = prefs({ goals: ['yoga'], areas: ['downtown'] });
    const placesBefore = structuredClone(places);
    const preferencesBefore = structuredClone(preferences);

    const ranked = rankPlaces(places, preferences);

    expect(places).toEqual(placesBefore);
    expect(preferences).toEqual(preferencesBefore);
    expect(ranked).not.toBe(places);
    expect(ids(ranked)).toEqual(['c', 'b']);
  });

  it('gives the same result when called twice', () => {
    const places = [makePlace({ id: 'a', tags: ['yoga'] }), makePlace({ id: 'b' })];
    const preferences = prefs({ goals: ['yoga'] });
    expect(rankPlaces(places, preferences)).toEqual(rankPlaces(places, preferences));
  });
});
