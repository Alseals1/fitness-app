import { Constants, type Enums } from './database.types';

/**
 * The onboarding answers, kept on the device only. Pure module: it never imports
 * AsyncStorage (that native module throws at import under jest), so storage is injected.
 */

/** Goals are a subset of the place tags, so matching can compare them directly. */
export const GOALS = ['strength', 'cardio', 'yoga', 'running'] as const satisfies readonly Enums<'place_tag'>[];
export type Goal = (typeof GOALS)[number];

export const LEVELS = ['beginner', 'some_experience', 'experienced'] as const;
export type Level = (typeof LEVELS)[number];

export const TIMES = ['mornings', 'evenings', 'weekends'] as const;
export type PreferredTime = (typeof TIMES)[number];

export const BUDGETS = Constants.public.Enums.price_range;
export const AREAS = Constants.public.Enums.place_area;

export type Preferences = {
  goals: Goal[];
  level: Level | null;
  /**
   * The most the person wants to pay, in the order of `Constants.public.Enums.price_range`
   * (free, budget, moderate, premium). `null` means no answer.
   */
  budget: Enums<'price_range'> | null;
  times: PreferredTime[];
  /** Approximate parts of town only: `place_area` values, never coordinates. */
  areas: Enums<'place_area'>[];
};

export const emptyPreferences: Preferences = {
  goals: [],
  level: null,
  budget: null,
  times: [],
  areas: [],
};

export function isEmptyPreferences(p: Preferences): boolean {
  return (
    p.goals.length === 0 &&
    p.level === null &&
    p.budget === null &&
    p.times.length === 0 &&
    p.areas.length === 0
  );
}

export const PREFERENCES_STORAGE_KEY = 'fitness-app.preferences';
export const PREFERENCES_VERSION = 1;

/** The part of AsyncStorage this module needs. Tests pass an in-memory fake. */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Known values only, without duplicates, in the order of `allowed`. */
function pickList<T extends string>(raw: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(raw)) return [];
  return allowed.filter((value) => raw.includes(value));
}

function pickOne<T extends string>(raw: unknown, allowed: readonly T[]): T | null {
  return allowed.find((value) => value === raw) ?? null;
}

/** Turns anything into valid preferences. Never throws; unknown values and keys are dropped. */
export function parsePreferences(raw: unknown): Preferences {
  const source = isRecord(raw) ? raw : {};
  return {
    goals: pickList(source.goals, GOALS),
    level: pickOne(source.level, LEVELS),
    budget: pickOne(source.budget, BUDGETS),
    times: pickList(source.times, TIMES),
    areas: pickList(source.areas, AREAS),
  };
}

/**
 * The saved preferences, or `null` when none are saved or the stored record cannot be
 * read (bad JSON, another version, a storage error). `null` means "not set".
 */
export async function loadPreferences(storage: KeyValueStorage): Promise<Preferences | null> {
  let raw: string | null;
  try {
    raw = await storage.getItem(PREFERENCES_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(record) || record.version !== PREFERENCES_VERSION || !('preferences' in record)) {
    return null;
  }
  return parsePreferences(record.preferences);
}

/** Saves the preferences as one record and returns what was saved. A storage error is rethrown. */
export async function savePreferences(storage: KeyValueStorage, p: Preferences): Promise<Preferences> {
  const preferences = parsePreferences(p);
  await storage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ version: PREFERENCES_VERSION, preferences }),
  );
  return preferences;
}
