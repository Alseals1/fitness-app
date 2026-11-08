import type { PublicPlace } from './places';
import { shortlistFetchKey, shortlistView, type LeavingRow } from './shortlistView';

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
    expect(view).toEqual({
      kind: 'list',
      rows: [{ result: { place: makePlace(B), score: 0, reasons: [] }, leaving: false }],
      savedCount: 1,
    });
  });

  it.each(['pending', 'rejected', 'hidden'] as const)('skips a fetched place whose status is %s', (status) => {
    const view = shortlistView({ idsLoading: false, ids: [A, B], places: loaded(makePlace(A, { status }), makePlace(B)) });
    expect(view.kind === 'list' && view.rows.map((row) => row.result.place.id)).toEqual([B]);
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
    expect(view.kind === 'list' && view.rows.map((row) => row.result.place.id)).toEqual([C, A, B]);
  });

  it('leaves out a fetched place that was just unsaved', () => {
    const view = shortlistView({ idsLoading: false, ids: [B], places: loaded(makePlace(A), makePlace(B)) });
    expect(view.kind === 'list' && view.rows.map((row) => row.result.place.id)).toEqual([B]);
  });

  describe('with leaving rows', () => {
    const D = placeId(4);
    const all = loaded(makePlace(A), makePlace(B), makePlace(C));

    function leavingRow(id: string, index: number): LeavingRow {
      return { result: { place: makePlace(id), score: 0, reasons: [] }, index };
    }

    function shape(view: ReturnType<typeof shortlistView>) {
      return view.kind === 'list' ? view.rows.map((row) => `${row.result.place.id.slice(-1)}${row.leaving ? '~' : ''}`) : view.kind;
    }

    it('puts a leaving row back at its old display index', () => {
      const view = shortlistView({ idsLoading: false, ids: [A, C], places: all, leaving: [leavingRow(B, 1)] });
      expect(shape(view)).toEqual(['1', '2~', '3']);
      expect(view.kind === 'list' && view.savedCount).toBe(2);
    });

    it('clamps a leaving index past the end to the end', () => {
      const view = shortlistView({ idsLoading: false, ids: [A], places: all, leaving: [leavingRow(D, 5)] });
      expect(shape(view)).toEqual(['1', '4~']);
    });

    it('inserts leaving rows in order, each at its own index', () => {
      // C left from index 2 of [A, B, C]; then A left from index 0 of [A, B, C~].
      const view = shortlistView({
        idsLoading: false,
        ids: [B],
        places: all,
        leaving: [leavingRow(C, 2), leavingRow(A, 0)],
      });
      expect(shape(view)).toEqual(['1~', '2', '3~']);
    });

    it('drops a leaving row whose place is saved again', () => {
      const view = shortlistView({ idsLoading: false, ids: [A, B, C], places: all, leaving: [leavingRow(B, 1)] });
      expect(shape(view)).toEqual(['1', '2', '3']);
    });

    it('keeps the list, with no saved rows, while the last removed place leaves', () => {
      const view = shortlistView({ idsLoading: false, ids: [], places: all, leaving: [leavingRow(A, 0)] });
      expect(view).toEqual({ kind: 'list', rows: [{ result: leavingRow(A, 0).result, leaving: true }], savedCount: 0 });
    });

    it('is empty with no saved rows and nothing leaving', () => {
      expect(shortlistView({ idsLoading: false, ids: [], places: all, leaving: [] })).toEqual({ kind: 'empty' });
    });
  });
});

describe('shortlistFetchKey', () => {
  it('is the sorted ids when nothing was fetched yet', () => {
    expect(shortlistFetchKey([C, A, B], null)).toBe([A, B, C].join(','));
  });

  it('keeps the last key when ids were only removed', () => {
    const key = [A, B, C].join(',');
    expect(shortlistFetchKey([C, A], key)).toBe(key);
  });

  it('keeps the last key when a removed id comes back', () => {
    const key = [A, B, C].join(',');
    expect(shortlistFetchKey([A, B, C], key)).toBe(key);
  });

  it('is a new sorted key when a new id appears', () => {
    expect(shortlistFetchKey([C, A], [A, B].join(','))).toBe([A, C].join(','));
  });

  it('is empty for no ids and no key', () => {
    expect(shortlistFetchKey([], null)).toBe('');
  });
});
