import type { PublicPlace } from './places';
import { emptyPreferences, type Preferences } from './preferences';
import {
  resultCardAccessibilityLabel,
  resultCardLayout,
  resultCardMeta,
  resultCardText,
  resultsSummary,
  resultsView,
  type PlacesLoad,
} from './results';

function makePlace(overrides: Partial<PublicPlace>): PublicPlace {
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
    is_certified: false,
    certification_name: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

const yogaFan: Preferences = { ...emptyPreferences, goals: ['yoga'] };
const gym = makePlace({ id: 'gym', name: 'A Gym (sample)', tags: ['strength'] });
const yoga = makePlace({ id: 'yoga', name: 'Z Yoga (sample)', tags: ['yoga'] });
const loaded = (places: PublicPlace[]): PlacesLoad => ({ status: 'loaded', places });

describe('resultsView', () => {
  it('is loading while the preferences load', () => {
    expect(resultsView({ preferencesLoading: true, preferences: null, places: loaded([gym]) })).toEqual({
      kind: 'loading',
    });
  });

  it('is loading while the places load', () => {
    expect(resultsView({ preferencesLoading: false, preferences: yogaFan, places: { status: 'loading' } })).toEqual({
      kind: 'loading',
    });
  });

  it('passes the error message through', () => {
    expect(
      resultsView({ preferencesLoading: false, preferences: null, places: { status: 'error', message: 'Oops' } }),
    ).toEqual({ kind: 'error', message: 'Oops' });
  });

  it.each([
    [null, false],
    [yogaFan, true],
  ])('is empty when there are no places (preferences %p)', (preferences, hasPreferences) => {
    expect(resultsView({ preferencesLoading: false, preferences, places: loaded([]) })).toEqual({
      kind: 'empty',
      hasPreferences,
    });
  });

  it('lists the best match first when there are preferences', () => {
    const view = resultsView({ preferencesLoading: false, preferences: yogaFan, places: loaded([gym, yoga]) });
    expect(view.kind).toBe('list');
    if (view.kind !== 'list') return;
    expect(view.hasPreferences).toBe(true);
    expect(view.results.map((result) => result.place.id)).toEqual(['yoga', 'gym']);
    expect(view.results[0].reasons.map((reason) => reason.label)).toEqual(['Good for yoga']);
  });

  it('still lists places, sorted, with no preferences', () => {
    const view = resultsView({ preferencesLoading: false, preferences: null, places: loaded([yoga, gym]) });
    expect(view).toMatchObject({ kind: 'list', hasPreferences: false });
    if (view.kind !== 'list') return;
    expect(view.results.map((result) => result.place.id)).toEqual(['gym', 'yoga']);
  });

  it('counts empty preferences as no preferences', () => {
    const view = resultsView({ preferencesLoading: false, preferences: emptyPreferences, places: loaded([gym]) });
    expect(view).toMatchObject({ kind: 'list', hasPreferences: false });
  });

  it('never shows a pending place', () => {
    const pending = makePlace({ id: 'pending', tags: ['yoga'], status: 'pending' });
    const view = resultsView({ preferencesLoading: false, preferences: yogaFan, places: loaded([pending, gym]) });
    if (view.kind !== 'list') throw new Error(`expected a list, got ${view.kind}`);
    expect(view.results.map((result) => result.place.id)).toEqual(['gym']);
  });

  it('is empty when every row is non-approved', () => {
    const pending = makePlace({ id: 'pending', status: 'pending' });
    expect(resultsView({ preferencesLoading: false, preferences: null, places: loaded([pending]) })).toEqual({
      kind: 'empty',
      hasPreferences: false,
    });
  });
});

describe('resultCardAccessibilityLabel', () => {
  it('reads the name, the details and the reasons as one label', () => {
    const result = {
      place: makePlace({ name: 'Z Yoga (sample)', category: 'studio', area: 'southside', price_range: 'budget' }),
      score: 5,
      reasons: [
        { key: 'goals' as const, label: 'Good for yoga' },
        { key: 'budget' as const, label: 'Within your budget' },
      ],
    };
    expect(resultCardMeta(result)).toBe('Studio · Southside · Budget');
    expect(resultCardAccessibilityLabel(result)).toBe(
      'Z Yoga (sample). Studio · Southside · Budget. Why this fits you: Good for yoga, Within your budget',
    );
  });

  it('leaves out the reasons part when there are none', () => {
    const result = { place: makePlace({ name: 'A Gym (sample)' }), score: 0, reasons: [] };
    expect(resultCardAccessibilityLabel(result)).toBe('A Gym (sample). Gym · Downtown · Moderate');
  });
});

describe('resultCardText', () => {
  it('gives the category label and "area · price"', () => {
    const result = { place: makePlace({ category: 'gym', area: 'downtown', price_range: 'moderate' }), score: 0, reasons: [] };
    expect(resultCardText(result)).toEqual({ category: 'Gym', facts: 'Downtown · Moderate price' });
  });

  it('says just "Free" for a free place', () => {
    const result = { place: makePlace({ category: 'run_club', area: 'southside', price_range: 'free' }), score: 0, reasons: [] };
    expect(resultCardText(result)).toEqual({ category: 'Run club', facts: 'Southside · Free' });
  });
});

describe('resultsSummary', () => {
  it.each([
    [1, false, '1 place'],
    [2, false, '2 places'],
    [2, true, '2 places, best fit first'],
    [1, true, '1 place, best fit first'],
    [0, false, '0 places'],
  ])('%p places, preferences %p → %p', (count, hasPreferences, expected) => {
    expect(resultsSummary(count, hasPreferences)).toBe(expected);
  });
});

describe('resultCardLayout', () => {
  it.each([
    [1, 'row'],
    [1.29, 'row'],
    [1.3, 'stacked'],
    [2, 'stacked'],
  ])('font scale %p on a phone → %p', (fontScale, expected) => {
    expect(resultCardLayout(fontScale, 390)).toBe(expected);
  });

  it.each([
    [320, 'row'],
    [319, 'stacked'],
    [195, 'stacked'],
  ])('window width %p at font scale 1 → %p', (windowWidth, expected) => {
    expect(resultCardLayout(1, windowWidth)).toBe(expected);
  });
});
