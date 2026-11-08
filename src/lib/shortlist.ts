import { copy } from './copy';
import { isPlaceId } from './places';
import type { KeyValueStorage } from './preferences';

/**
 * The shortlist: the ids of the places a person saved, kept on the device only, newest first.
 * Only place ids are stored: no names, no location, no personal data. Pure module: it never
 * imports AsyncStorage (that native module throws at import under jest), so storage is injected.
 */

export const SHORTLIST_STORAGE_KEY = 'fitness-app.shortlist';
export const SHORTLIST_VERSION = 1;
/** Above the v1 target of 30-50 listings, and keeps the by-ids query small. */
export const SHORTLIST_LIMIT = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Turns anything into a clean id list: uuids only, first copy of each, at most the limit. Never throws. */
export function parseShortlistIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isPlaceId))].slice(0, SHORTLIST_LIMIT);
}

/**
 * The saved ids, newest first. Nothing saved, a stored record that cannot be read (bad JSON,
 * another version, no `ids`) or a storage error all give an empty list.
 */
export async function loadShortlist(storage: KeyValueStorage): Promise<string[]> {
  let raw: string | null;
  try {
    raw = await storage.getItem(SHORTLIST_STORAGE_KEY);
  } catch {
    return [];
  }
  return parseStoredShortlist(raw);
}

/** The ids in a stored record. Nothing stored, bad JSON, another version or no `ids` give `[]`. */
function parseStoredShortlist(raw: string | null): string[] {
  if (raw === null) return [];

  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isRecord(record) || record.version !== SHORTLIST_VERSION || !('ids' in record)) return [];
  return parseShortlistIds(record.ids);
}

/** Saves the ids as one record and returns what was saved. A storage error is rethrown. */
export async function saveShortlist(storage: KeyValueStorage, ids: readonly string[]): Promise<string[]> {
  const clean = parseShortlistIds(ids);
  await storage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify({ version: SHORTLIST_VERSION, ids: clean }));
  return clean;
}

/**
 * Saves (`save: true`) or removes one place, applied to the list as it is stored right now, not
 * to a copy a screen holds, so a change made elsewhere is never lost. Returns what was saved.
 * A read or write error is rethrown and nothing is written: a failed read must not be taken
 * for an empty list and overwrite the saved places.
 */
export async function updateShortlist(storage: KeyValueStorage, id: string, save: boolean): Promise<string[]> {
  const current = parseStoredShortlist(await storage.getItem(SHORTLIST_STORAGE_KEY));
  return saveShortlist(storage, save ? addId(current, id) : removeId(current, id));
}

/**
 * Puts a removed place back at `index` in the list as it is stored right now (an undo), so it
 * keeps its place instead of moving to the front. Returns what was saved. A read or write error
 * is rethrown and nothing is written, as in `updateShortlist`.
 */
export async function restoreShortlistId(storage: KeyValueStorage, id: string, index: number): Promise<string[]> {
  const current = parseStoredShortlist(await storage.getItem(SHORTLIST_STORAGE_KEY));
  return saveShortlist(storage, insertIdAt(current, id, index));
}

export function isSaved(ids: readonly string[], id: string): boolean {
  return ids.includes(id);
}

/**
 * Puts `id` first, removing an older copy. Past the limit the oldest is dropped. An id that
 * is not a uuid leaves the list unchanged.
 */
export function addId(ids: readonly string[], id: string): string[] {
  if (!isPlaceId(id)) return [...ids];
  return [id, ...ids.filter((saved) => saved !== id)].slice(0, SHORTLIST_LIMIT);
}

/**
 * Puts `id` at `index` (clamped to the list), for an undo. An id that is not a uuid or is
 * already saved leaves the list unchanged. Past the limit the oldest is dropped.
 */
export function insertIdAt(ids: readonly string[], id: string, index: number): string[] {
  if (!isPlaceId(id) || ids.includes(id)) return [...ids];
  const at = Math.min(Math.max(Math.trunc(index), 0), ids.length);
  return [...ids.slice(0, at), id, ...ids.slice(at)].slice(0, SHORTLIST_LIMIT);
}

export function removeId(ids: readonly string[], id: string): string[] {
  return ids.filter((saved) => saved !== id);
}

/** Removes `id` when it is saved, otherwise adds it. */
export function toggleId(ids: readonly string[], id: string): string[] {
  return isSaved(ids, id) ? removeId(ids, id) : addId(ids, id);
}

/** What a screen reader says for the save button: the action and the place's name. */
export function saveButtonLabel(name: string, saved: boolean): string {
  return saved ? copy.shortlist.removeLabel(name) : copy.shortlist.saveLabel(name);
}
