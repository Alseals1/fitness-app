import { copy } from './copy';
import type { KeyValueStorage } from './preferences';
import {
  addId,
  isSaved,
  loadShortlist,
  parseShortlistIds,
  removeId,
  saveButtonLabel,
  saveShortlist,
  SHORTLIST_LIMIT,
  SHORTLIST_STORAGE_KEY,
  toggleId,
  updateShortlist,
} from './shortlist';

/** A uuid-shaped place id ending in `n`. */
function placeId(n: number): string {
  return `5eed0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const A = placeId(1);
const B = placeId(2);
const C = placeId(3);

/** An in-memory store, standing in for AsyncStorage. */
function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const storage: KeyValueStorage = {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
  };
  return { storage, items };
}

function stored(record: unknown) {
  return memoryStorage({ [SHORTLIST_STORAGE_KEY]: JSON.stringify(record) }).storage;
}

describe('addId', () => {
  it('puts the id first', () => {
    expect(addId([B, C], A)).toEqual([A, B, C]);
  });

  it('moves an id that is already saved to the front, without a duplicate', () => {
    expect(addId([A, B, C], C)).toEqual([C, A, B]);
  });

  it('drops the oldest past the limit', () => {
    const full = Array.from({ length: SHORTLIST_LIMIT }, (_, i) => placeId(i + 10));
    const next = addId(full, A);
    expect(next).toHaveLength(SHORTLIST_LIMIT);
    expect(next[0]).toBe(A);
    expect(next).not.toContain(full[full.length - 1]);
  });

  it.each(['abc', '', `${A} `])('leaves the list unchanged for the malformed id %p', (id) => {
    expect(addId([A], id)).toEqual([A]);
  });
});

describe('removeId', () => {
  it('removes the id', () => {
    expect(removeId([A, B, C], B)).toEqual([A, C]);
  });

  it('does nothing when the id is not saved', () => {
    expect(removeId([A, C], B)).toEqual([A, C]);
  });
});

describe('toggleId and isSaved', () => {
  it('adds, then removes', () => {
    const added = toggleId([B], A);
    expect(added).toEqual([A, B]);
    expect(isSaved(added, A)).toBe(true);

    const removed = toggleId(added, A);
    expect(removed).toEqual([B]);
    expect(isSaved(removed, A)).toBe(false);
  });
});

describe('parseShortlistIds', () => {
  it('keeps uuids only, first copy of each, in order', () => {
    expect(parseShortlistIds([B, 'abc', A, 42, null, B, { id: C }])).toEqual([B, A]);
  });

  it('cuts to the limit', () => {
    const many = Array.from({ length: SHORTLIST_LIMIT + 5 }, (_, i) => placeId(i));
    expect(parseShortlistIds(many)).toEqual(many.slice(0, SHORTLIST_LIMIT));
  });

  it.each([null, undefined, 'abc', 42, { ids: [A] }])('gives an empty list for %p', (raw) => {
    expect(parseShortlistIds(raw)).toEqual([]);
  });
});

describe('saveShortlist and loadShortlist', () => {
  it('round-trips, stored as one versioned record', async () => {
    const { storage, items } = memoryStorage();
    await expect(saveShortlist(storage, [A, B])).resolves.toEqual([A, B]);
    expect(items.get(SHORTLIST_STORAGE_KEY)).toBe(JSON.stringify({ version: 1, ids: [A, B] }));
    await expect(loadShortlist(storage)).resolves.toEqual([A, B]);
  });

  it('saves a clean list', async () => {
    const { storage, items } = memoryStorage();
    await expect(saveShortlist(storage, [A, 'abc', A, B])).resolves.toEqual([A, B]);
    expect(JSON.parse(items.get(SHORTLIST_STORAGE_KEY) ?? '')).toEqual({ version: 1, ids: [A, B] });
  });

  it('rethrows a write error', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => null,
      setItem: async () => {
        throw new Error('disk full');
      },
    };
    await expect(saveShortlist(storage, [A])).rejects.toThrow('disk full');
  });

  it('drops malformed and duplicate ids, and cuts to the limit, on load', async () => {
    const many = Array.from({ length: SHORTLIST_LIMIT + 1 }, (_, i) => placeId(i));
    await expect(loadShortlist(stored({ version: 1, ids: [A, 'abc', A, B] }))).resolves.toEqual([A, B]);
    await expect(loadShortlist(stored({ version: 1, ids: many }))).resolves.toHaveLength(SHORTLIST_LIMIT);
  });

  it('is empty when nothing is stored', async () => {
    await expect(loadShortlist(memoryStorage().storage)).resolves.toEqual([]);
  });

  it('is empty for bad JSON', async () => {
    const { storage } = memoryStorage({ [SHORTLIST_STORAGE_KEY]: '{not json' });
    await expect(loadShortlist(storage)).resolves.toEqual([]);
  });

  it.each([
    ['an array record', [A]],
    ['a string record', 'abc'],
    ['another version', { version: 2, ids: [A] }],
    ['no ids', { version: 1 }],
    ['ids that are not an array', { version: 1, ids: A }],
  ])('is empty for %s', async (_case, record) => {
    await expect(loadShortlist(stored(record))).resolves.toEqual([]);
  });

  it('is empty when the storage read fails', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => {
        throw new Error('read failed');
      },
      setItem: async () => {},
    };
    await expect(loadShortlist(storage)).resolves.toEqual([]);
  });
});

describe('updateShortlist', () => {
  it('adds to the list as stored, not to a copy a screen holds', async () => {
    const { storage, items } = memoryStorage({
      [SHORTLIST_STORAGE_KEY]: JSON.stringify({ version: 1, ids: [B, A] }),
    });
    await expect(updateShortlist(storage, C, true)).resolves.toEqual([C, B, A]);
    expect(items.get(SHORTLIST_STORAGE_KEY)).toBe(JSON.stringify({ version: 1, ids: [C, B, A] }));
  });

  it('removes from the list as stored', async () => {
    const { storage } = memoryStorage({ [SHORTLIST_STORAGE_KEY]: JSON.stringify({ version: 1, ids: [C, B, A] }) });
    await expect(updateShortlist(storage, B, false)).resolves.toEqual([C, A]);
    await expect(loadShortlist(storage)).resolves.toEqual([C, A]);
  });

  it('keeps every change when two screens update one after the other', async () => {
    const { storage } = memoryStorage();
    await updateShortlist(storage, A, true);
    await updateShortlist(storage, B, true);
    await updateShortlist(storage, A, false);
    await updateShortlist(storage, C, true);
    await expect(loadShortlist(storage)).resolves.toEqual([C, B]);
  });

  it('is a no-op for saving a saved place or removing one that is not saved', async () => {
    const { storage } = memoryStorage({ [SHORTLIST_STORAGE_KEY]: JSON.stringify({ version: 1, ids: [B, A] }) });
    await expect(updateShortlist(storage, B, true)).resolves.toEqual([B, A]);
    await expect(updateShortlist(storage, C, false)).resolves.toEqual([B, A]);
  });

  it('starts from an empty list when nothing readable is stored', async () => {
    await expect(updateShortlist(memoryStorage().storage, A, true)).resolves.toEqual([A]);
    const { storage } = memoryStorage({ [SHORTLIST_STORAGE_KEY]: '{not json' });
    await expect(updateShortlist(storage, A, true)).resolves.toEqual([A]);
  });

  it('rethrows a read error and writes nothing', async () => {
    const setItem = jest.fn(async () => {});
    const storage: KeyValueStorage = {
      getItem: async () => {
        throw new Error('read failed');
      },
      setItem,
    };
    await expect(updateShortlist(storage, A, true)).rejects.toThrow('read failed');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('rethrows a write error', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => null,
      setItem: async () => {
        throw new Error('disk full');
      },
    };
    await expect(updateShortlist(storage, A, true)).rejects.toThrow('disk full');
  });
});

describe('saveButtonLabel', () => {
  it('names the place and the action', () => {
    expect(saveButtonLabel('Sample Gym', false)).toBe(copy.shortlist.saveLabel('Sample Gym'));
    expect(saveButtonLabel('Sample Gym', false)).toBe('Save Sample Gym to your shortlist');
    expect(saveButtonLabel('Sample Gym', true)).toBe('Remove Sample Gym from your shortlist');
  });
});
