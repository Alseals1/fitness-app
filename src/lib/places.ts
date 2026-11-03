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
