import { Constants } from './database.types';
import {
  GOALS,
  PREFERENCES_STORAGE_KEY,
  emptyPreferences,
  isEmptyPreferences,
  loadPreferences,
  parsePreferences,
  savePreferences,
  type KeyValueStorage,
  type Preferences,
} from './preferences';

/** An in-memory stand-in for AsyncStorage. No native module, no network. */
function fakeStorage(options: { failGet?: boolean; failSet?: boolean } = {}) {
  const data = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: async (key) => {
      if (options.failGet) throw new Error('read failed');
      return data.get(key) ?? null;
    },
    setItem: async (key, value) => {
      if (options.failSet) throw new Error('write failed');
      data.set(key, value);
    },
  };
  return { storage, data };
}

const full: Preferences = {
  goals: ['strength', 'running'],
  level: 'some_experience',
  budget: 'moderate',
  times: ['mornings', 'weekends'],
  areas: ['downtown', 'hoover'],
};

describe('save and load', () => {
  it.each([
    ['empty', emptyPreferences],
    ['full', full],
  ])('round-trips %s answers', async (_name, prefs) => {
    const { storage } = fakeStorage();
    await savePreferences(storage, prefs);
    await expect(loadPreferences(storage)).resolves.toEqual(prefs);
  });

  it('writes one versioned record with only the five fields', async () => {
    const { storage, data } = fakeStorage();
    await savePreferences(storage, full);
    expect([...data.keys()]).toEqual([PREFERENCES_STORAGE_KEY]);
    const record = JSON.parse(data.get(PREFERENCES_STORAGE_KEY)!);
    expect(record).toEqual({ version: 1, preferences: full });
    expect(Object.keys(record.preferences).sort()).toEqual(['areas', 'budget', 'goals', 'level', 'times']);
  });

  it('sanitises what it saves and returns the saved value', async () => {
    const { storage, data } = fakeStorage();
    const dirty = { ...full, goals: ['running', 'strength', 'running'], lat: 33.5 } as unknown as Preferences;
    const saved = await savePreferences(storage, dirty);
    expect(saved).toEqual(full);
    expect(JSON.parse(data.get(PREFERENCES_STORAGE_KEY)!).preferences).toEqual(full);
  });

  it('lets a write error propagate', async () => {
    const { storage } = fakeStorage({ failSet: true });
    await expect(savePreferences(storage, full)).rejects.toThrow('write failed');
  });
});

describe('loadPreferences', () => {
  it('returns null when nothing is stored', async () => {
    const { storage } = fakeStorage();
    await expect(loadPreferences(storage)).resolves.toBeNull();
  });

  it('returns null when the read fails', async () => {
    const { storage } = fakeStorage({ failGet: true });
    await expect(loadPreferences(storage)).resolves.toBeNull();
  });

  it.each([
    ['bad JSON', '{not json'],
    ['null', 'null'],
    ['a number', '42'],
    ['an array', '[1,2]'],
    ['another version', JSON.stringify({ version: 2, preferences: full })],
    ['no version', JSON.stringify({ preferences: full })],
    ['no preferences', JSON.stringify({ version: 1 })],
  ])('returns null for %s', async (_name, raw) => {
    const { storage, data } = fakeStorage();
    data.set(PREFERENCES_STORAGE_KEY, raw);
    await expect(loadPreferences(storage)).resolves.toBeNull();
  });

  it('cleans up a stored record with bad values', async () => {
    const { storage, data } = fakeStorage();
    data.set(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: 1, preferences: { goals: ['dance', 'yoga'], level: 'pro' } }),
    );
    await expect(loadPreferences(storage)).resolves.toEqual({ ...emptyPreferences, goals: ['yoga'] });
  });
});

describe('parsePreferences', () => {
  it('drops unknown list values', () => {
    expect(
      parsePreferences({ goals: ['strength', 'dance'], times: ['noon', 'evenings'], areas: ['paris', 'avondale'] }),
    ).toEqual({ ...emptyPreferences, goals: ['strength'], times: ['evenings'], areas: ['avondale'] });
  });

  it('removes duplicates and puts lists in option order', () => {
    expect(
      parsePreferences({
        goals: ['running', 'strength', 'running'],
        times: ['weekends', 'mornings', 'weekends'],
        areas: ['trussville', 'downtown', 'downtown'],
      }),
    ).toEqual({
      ...emptyPreferences,
      goals: ['strength', 'running'],
      times: ['mornings', 'weekends'],
      areas: ['downtown', 'trussville'],
    });
  });

  it('turns an invalid single value into null', () => {
    expect(parsePreferences({ level: 'pro', budget: 'cheap' })).toEqual(emptyPreferences);
    expect(parsePreferences({ level: 3, budget: ['free'] })).toEqual(emptyPreferences);
  });

  it('turns a list field that is not an array into []', () => {
    expect(parsePreferences({ goals: 'strength', times: { 0: 'mornings' }, areas: null })).toEqual(
      emptyPreferences,
    );
  });

  it('drops extra keys such as coordinates', () => {
    const parsed = parsePreferences({ ...full, lat: 33.5, lng: -86.8, email: 'a@b.c' });
    expect(parsed).toEqual(full);
    expect(Object.keys(parsed).sort()).toEqual(['areas', 'budget', 'goals', 'level', 'times']);
  });

  it('accepts a partial object', () => {
    expect(parsePreferences({ budget: 'free' })).toEqual({ ...emptyPreferences, budget: 'free' });
  });

  it.each([null, undefined, 'x', 7, []])('gives empty preferences for %p', (raw) => {
    expect(parsePreferences(raw)).toEqual(emptyPreferences);
  });
});

describe('isEmptyPreferences', () => {
  it('is true only when nothing is answered', () => {
    expect(isEmptyPreferences(emptyPreferences)).toBe(true);
    expect(isEmptyPreferences(full)).toBe(false);
    expect(isEmptyPreferences({ ...emptyPreferences, level: 'beginner' })).toBe(false);
    expect(isEmptyPreferences({ ...emptyPreferences, areas: ['hoover'] })).toBe(false);
  });
});

it('every goal is a place tag', () => {
  const tags: readonly string[] = Constants.public.Enums.place_tag;
  for (const goal of GOALS) expect(tags).toContain(goal);
});
