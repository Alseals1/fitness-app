import { createDeviceId, DEVICE_ID_STORAGE_KEY, getDeviceId, isDeviceId } from './deviceId';
import type { KeyValueStorage } from './preferences';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A seeded pseudo-random source, so the fallback path is tested without crypto. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const storage: KeyValueStorage = {
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
  return { storage, data };
}

describe('createDeviceId', () => {
  it('builds a valid v4 UUID from an injected random source', () => {
    const id = createDeviceId(seeded(42));
    expect(id).toMatch(V4);
    expect(isDeviceId(id)).toBe(true);
  });

  it('gives different ids for different random sources', () => {
    expect(createDeviceId(seeded(1))).not.toEqual(createDeviceId(seeded(2)));
  });

  it('sets the version and variant even when random returns its extremes', () => {
    expect(createDeviceId(() => 0)).toMatch(V4);
    expect(createDeviceId(() => 0.9999999)).toMatch(V4);
  });

  it('gives a valid id with no arguments', () => {
    expect(createDeviceId()).toMatch(V4);
  });
});

describe('isDeviceId', () => {
  it('accepts a UUID and refuses anything else', () => {
    expect(isDeviceId('de5eed00-0000-4000-8000-000000000001')).toBe(true);
    expect(isDeviceId('not-a-uuid')).toBe(false);
    expect(isDeviceId('')).toBe(false);
    expect(isDeviceId(null)).toBe(false);
    expect(isDeviceId(42)).toBe(false);
  });
});

describe('getDeviceId', () => {
  it('stores a new id and then returns the same id', async () => {
    const { storage, data } = memoryStorage();
    const make = jest.fn(() => createDeviceId(seeded(7)));
    const first = await getDeviceId(storage, make);
    expect(first).toMatch(V4);
    expect(data[DEVICE_ID_STORAGE_KEY]).toBe(first);
    await expect(getDeviceId(storage, make)).resolves.toBe(first);
    expect(make).toHaveBeenCalledTimes(1);
  });

  it('reuses a valid stored id', async () => {
    const stored = 'de5eed00-0000-4000-8000-000000000002';
    const { storage } = memoryStorage({ [DEVICE_ID_STORAGE_KEY]: stored });
    await expect(getDeviceId(storage)).resolves.toBe(stored);
  });

  it('replaces a stored garbage value', async () => {
    const { storage, data } = memoryStorage({ [DEVICE_ID_STORAGE_KEY]: 'garbage' });
    const id = await getDeviceId(storage, () => createDeviceId(seeded(3)));
    expect(id).toMatch(V4);
    expect(data[DEVICE_ID_STORAGE_KEY]).toBe(id);
  });

  it('still returns an id when storage throws', async () => {
    const storage: KeyValueStorage = {
      getItem: () => Promise.reject(new Error('storage broken')),
      setItem: () => Promise.reject(new Error('storage broken')),
    };
    await expect(getDeviceId(storage)).resolves.toMatch(V4);
  });

  it('still returns the new id when only saving fails', async () => {
    const storage: KeyValueStorage = {
      getItem: async () => null,
      setItem: () => Promise.reject(new Error('disk full')),
    };
    await expect(getDeviceId(storage)).resolves.toMatch(V4);
  });
});
