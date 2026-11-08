import type { RankedPlace } from './matching';
import type { PublicPlace } from './places';
import { initialShortlistEdits, noticeMessage, shortlistEditsReducer, type ShortlistEdits } from './shortlistEdits';

/** A uuid-shaped place id ending in `n`. */
function placeId(n: number): string {
  return `5eed0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const A = placeId(1);
const B = placeId(2);

function result(id: string): RankedPlace {
  const place = { id, name: `Sample ${id.slice(-1)} (sample)` } as PublicPlace;
  return { place, score: 0, reasons: [] };
}

function removed(id: string, displayIndex: number, savedIndex = displayIndex) {
  return { type: 'removed' as const, result: result(id), displayIndex, savedIndex };
}

describe('shortlistEditsReducer', () => {
  it('starts with nothing leaving, no notice and nothing restored', () => {
    expect(initialShortlistEdits).toEqual({ leaving: [], notice: null, restoredId: null });
  });

  it('adds a leaving row and a removed notice on a removal', () => {
    const state = shortlistEditsReducer(initialShortlistEdits, removed(A, 2, 3));
    expect(state).toEqual({
      leaving: [{ result: result(A), index: 2 }],
      notice: { kind: 'removed', id: A, name: 'Sample 1 (sample)', savedIndex: 3 },
      restoredId: null,
    });
  });

  it('shows only the newest removal in the notice, and keeps both rows leaving', () => {
    let state = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    state = shortlistEditsReducer(state, removed(B, 1));
    expect(state.notice).toEqual({ kind: 'removed', id: B, name: 'Sample 2 (sample)', savedIndex: 1 });
    expect(state.leaving.map((row) => row.result.place.id)).toEqual([A, B]);
  });

  it('replaces the leaving row when the same place is removed again', () => {
    let state = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    state = shortlistEditsReducer(state, removed(A, 3));
    expect(state.leaving).toEqual([{ result: result(A), index: 3 }]);
  });

  it('undoes the newest removal: a restored notice, the row back, its id restored', () => {
    let state = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    state = shortlistEditsReducer(state, removed(B, 1));
    state = shortlistEditsReducer(state, { type: 'undone' });
    expect(state).toEqual({
      leaving: [{ result: result(A), index: 0 }],
      notice: { kind: 'restored', name: 'Sample 2 (sample)' },
      restoredId: B,
    });
  });

  it('ignores undo without a removed notice', () => {
    expect(shortlistEditsReducer(initialShortlistEdits, { type: 'undone' })).toBe(initialShortlistEdits);
    let state = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    state = shortlistEditsReducer(state, { type: 'undone' });
    expect(shortlistEditsReducer(state, { type: 'undone' })).toBe(state);
  });

  it('clears the restored id when that place is removed again', () => {
    let state = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    state = shortlistEditsReducer(state, { type: 'undone' });
    state = shortlistEditsReducer(state, removed(A, 0));
    expect(state.restoredId).toBeNull();
  });

  it('keeps the restored id when another place is removed', () => {
    let state = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    state = shortlistEditsReducer(state, { type: 'undone' });
    state = shortlistEditsReducer(state, removed(B, 1));
    expect(state.restoredId).toBe(A);
  });

  it('drops a leaving row when its exit is done, and keeps the notice', () => {
    let state = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    state = shortlistEditsReducer(state, { type: 'exitDone', id: A });
    expect(state.leaving).toEqual([]);
    expect(state.notice?.kind).toBe('removed');
  });

  it('ignores an exit for a row that is no longer leaving', () => {
    const state: ShortlistEdits = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    expect(shortlistEditsReducer(state, { type: 'exitDone', id: B })).toBe(state);
  });

  it('resets to the initial state', () => {
    let state = shortlistEditsReducer(initialShortlistEdits, removed(A, 0));
    state = shortlistEditsReducer(state, { type: 'undone' });
    expect(shortlistEditsReducer(state, { type: 'reset' })).toBe(initialShortlistEdits);
  });
});

describe('noticeMessage', () => {
  it('names the removed place', () => {
    expect(noticeMessage({ kind: 'removed', id: A, name: 'Lakeview Run Club', savedIndex: 0 })).toBe(
      'Removed Lakeview Run Club.',
    );
  });

  it('says the place is back after Undo', () => {
    expect(noticeMessage({ kind: 'restored', name: 'Lakeview Run Club' })).toBe(
      'Lakeview Run Club is back on your shortlist.',
    );
  });
});
