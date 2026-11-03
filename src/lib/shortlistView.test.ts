import type { PublicPlace } from './places';
import { shortlistView } from './shortlistView';

/** A uuid-shaped place id ending in `n`. */
function placeId(n: number): string {
  return `5eed0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const A = placeId(1);
const B = placeId(2);
const C = placeId(3);

function makePlace(id: string, overrides: Partial<PublicPlace> = {}): PublicPlace {
  return {
    id,
    name: `Sample ${id.slice(-1)} (sample)`,
    category: 'gym',
    description: null,
    area: 'hoover',
    price_range: 'budget',
    schedule: null,
    website_url: null,
    contact_phone: '205-555-0101',
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

function loaded(...places: PublicPlace[]) {
  return { status: 'loaded' as const, places };
}

describe('shortlistView', () => {
  it('is loading while the saved ids load', () => {
    expect(shortlistView({ idsLoading: true, ids: [], places: loaded() })).toEqual({ kind: 'loading' });
  });

  it('is empty when nothing is saved, without waiting for the places', () => {
    expect(shortlistView({ idsLoading: false, ids: [], places: { status: 'loading' } })).toEqual({ kind: 'empty' });
  });

  it('is loading while the places load', () => {
    expect(shortlistView({ idsLoading: false, ids: [A], places: { status: 'loading' } })).toEqual({ kind: 'loading' });
  });

  it('shows the load error', () => {
    expect(shortlistView({ idsLoading: false, ids: [A], places: { status: 'error', message: 'Oops' } })).toEqual({
      kind: 'error',
      message: 'Oops',
    });
  });

  it('skips a saved place that was not returned, with no error', () => {
    const view = shortlistView({ idsLoading: false, ids: [A, B], places: loaded(makePlace(B)) });
    expect(view).toEqual({ kind: 'list', results: [{ place: makePlace(B), score: 0, reasons: [] }] });
  });

  it.each(['pending', 'rejected', 'hidden'] as const)('skips a fetched place whose status is %s', (status) => {
    const view = shortlistView({ idsLoading: false, ids: [A, B], places: loaded(makePlace(A, { status }), makePlace(B)) });
    expect(view.kind === 'list' && view.results.map((result) => result.place.id)).toEqual([B]);
  });

  it('is empty when every saved place is missing', () => {
    expect(shortlistView({ idsLoading: false, ids: [A, B], places: loaded() })).toEqual({ kind: 'empty' });
  });

  it('follows the saved order, not the fetch order', () => {
    const view = shortlistView({
      idsLoading: false,
      ids: [C, A, B],
      places: loaded(makePlace(A), makePlace(B), makePlace(C)),
    });
    expect(view.kind === 'list' && view.results.map((result) => result.place.id)).toEqual([C, A, B]);
  });

  it('leaves out a fetched place that was just unsaved', () => {
    const view = shortlistView({ idsLoading: false, ids: [B], places: loaded(makePlace(A), makePlace(B)) });
    expect(view.kind === 'list' && view.results.map((result) => result.place.id)).toEqual([B]);
  });
});
