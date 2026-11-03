import type { SupabaseClient } from '@supabase/supabase-js';

import { copy } from './copy';
import type { Database, Tables } from './database.types';

/**
 * The columns of `places` that the app may read.
 *
 * The database grants `select` on these columns only. `submitted_by` and `claimed_by` hold
 * user ids and are never readable through the API, so `select('*')` on `places` is refused
 * on purpose (Postgres error 42501). Every read, including `.insert(...).select()` and
 * `.update(...).select()`, must pass `PUBLIC_PLACE_SELECT` instead.
 *
 * Keep this list in the same order as the `grant select (...)` in
 * `supabase/migrations/*_places_access.sql`. The pgTAP test `places_access.test.sql` checks
 * the granted list.
 */
export const PUBLIC_PLACE_COLUMNS = [
  'id',
  'name',
  'category',
  'description',
  'area',
  'price_range',
  'schedule',
  'website_url',
  'contact_phone',
  'contact_email',
  'instagram_handle',
  'tags',
  'status',
  'is_verified',
  'last_confirmed_at',
  'created_at',
  'updated_at',
] as const satisfies readonly (keyof Tables<'places'>)[];

/** The select string for reading places, for example `supabase.from('places').select(PUBLIC_PLACE_SELECT)`. */
export const PUBLIC_PLACE_SELECT = PUBLIC_PLACE_COLUMNS.join(',');

/** A place as the app sees it: every column the API may read. */
export type PublicPlace = Pick<Tables<'places'>, (typeof PUBLIC_PLACE_COLUMNS)[number]>;

/** The results screen reads at most this many places. v1 has 30-50 listings, so no paging. */
export const PUBLIC_PLACES_LIMIT = 200;

export type PlacesClient = SupabaseClient<Database>;

export type PlacesResult = { ok: true; data: PublicPlace[] } | { ok: false; message: string };

/**
 * Approved places for anyone, with or without an account. The `status = 'approved'` filter
 * is required, not only RLS: a signed-in admin (places_select_admin) or business
 * (places_select_own) may also read pending rows, and those must never show in results.
 * Never throws, and never shows the database's own message.
 */
export async function fetchApprovedPlaces(client: PlacesClient): Promise<PlacesResult> {
  try {
    const { data, error } = await client
      .from('places')
      .select(PUBLIC_PLACE_SELECT)
      .eq('status', 'approved')
      .order('name')
      .limit(PUBLIC_PLACES_LIMIT)
      .overrideTypes<PublicPlace[], { merge: false }>();
    if (error) return { ok: false, message: copy.results.loadFailed };
    return { ok: true, data: data ?? [] };
  } catch {
    return { ok: false, message: copy.results.loadFailed };
  }
}

/** A place id is a uuid. Checked before any request, so a malformed id never reaches the database. */
export const PLACE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPlaceId(id: unknown): id is string {
  return typeof id === 'string' && PLACE_ID_PATTERN.test(id);
}

/** `place: null` means not found: no row, a row that is not approved, or a malformed id. */
export type PlaceResult = { ok: true; place: PublicPlace | null } | { ok: false; message: string };

/** Postgres "invalid text representation", for example an id that is not a uuid. */
const INVALID_TEXT_REPRESENTATION = '22P02';

/**
 * One approved place, for anyone, with or without an account. The `status = 'approved'`
 * filter is required, not only RLS: a signed-in admin (places_select_admin) or business
 * (places_select_own) may also read pending rows, and a pending place must look exactly like
 * a missing one, so nobody can find it by guessing its id.
 *
 * A malformed id is not found, and never reaches the database. Never throws, and never shows
 * the database's own message.
 */
export async function fetchApprovedPlace(client: PlacesClient, id: unknown): Promise<PlaceResult> {
  if (!isPlaceId(id)) return { ok: true, place: null };
  try {
    const { data, error } = await client
      .from('places')
      .select(PUBLIC_PLACE_SELECT)
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle()
      .overrideTypes<PublicPlace, { merge: false }>();
    if (error) {
      if (error.code === INVALID_TEXT_REPRESENTATION) return { ok: true, place: null };
      return { ok: false, message: copy.place.loadFailed };
    }
    return { ok: true, place: data ?? null };
  } catch {
    return { ok: false, message: copy.place.loadFailed };
  }
}

/**
 * The approved places among `ids`, for anyone, with or without an account. Used by the
 * shortlist, whose ids come from the device. Ids that are not uuids are dropped before the
 * request, and an empty list makes no request. A saved place that is no longer approved
 * (hidden, rejected, back to pending) or was deleted is simply not returned.
 *
 * The `status = 'approved'` filter is required, not only RLS: a signed-in admin
 * (places_select_admin) or business (places_select_own) may also read pending rows, and those
 * must never show on the shortlist. Never throws, and never shows the database's own message.
 */
export async function fetchApprovedPlacesByIds(client: PlacesClient, ids: readonly string[]): Promise<PlacesResult> {
  const validIds = [...new Set(ids.filter(isPlaceId))];
  if (validIds.length === 0) return { ok: true, data: [] };
  try {
    const { data, error } = await client
      .from('places')
      .select(PUBLIC_PLACE_SELECT)
      .in('id', validIds)
      .eq('status', 'approved')
      .limit(validIds.length)
      .overrideTypes<PublicPlace[], { merge: false }>();
    if (error) return { ok: false, message: copy.shortlist.loadFailed };
    return { ok: true, data: data ?? [] };
  } catch {
    return { ok: false, message: copy.shortlist.loadFailed };
  }
}
