import type { Tables } from './database.types';

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
