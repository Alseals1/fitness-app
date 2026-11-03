import type { SupabaseClient } from '@supabase/supabase-js';

import type { SubmitClaimArgs, SubmitNewPlaceArgs } from './businessForm';
import type { Database } from './database.types';
import type { PublicPlace } from './places';

/**
 * Business data calls. Each takes the Supabase client as an argument (so jest can pass a
 * fake) and returns a result instead of throwing. submit_new_place and submit_place_claim
 * are the only way a business submits: the database forces pending, checks the details and
 * applies the daily limit.
 */

export type BusinessClient = SupabaseClient<Database>;

export type BusinessResult = { ok: true; id: string } | { ok: false; message: string };

/** The database allows this many submissions (new listings and claims) per account per 24 hours. */
export const SUBMISSIONS_PER_DAY = 5;

/** The claim search shows at most this many matches. */
export const CLAIM_SEARCH_LIMIT = 20;

export const BUSINESS_MESSAGES = {
  tooMany: `You've sent ${SUBMISSIONS_PER_DAY} today. Try again tomorrow.`,
  signIn: 'Sign in again to send this.',
  gone: "That place isn't listed any more.",
  duplicateClaim: 'You already have a claim waiting for this place.',
  alreadyYours: "You already manage this place, so there's nothing to claim.",
  invalid: "Some details aren't valid. Check the form and try again.",
  generic: 'Something went wrong. Please try again.',
} as const;

/** The parts of a PostgrestError (and the response status) that the mapping needs. */
export type BusinessErrorLike = { code?: string | null; message?: string } | null | undefined;

/**
 * Turns a database error into plain words. It never repeats the database's own message.
 * PostgREST sends SQLSTATE PT429 as HTTP 429 with code 'PT429'; both are checked.
 * PT409 means the caller already manages the place it tried to claim.
 */
export function businessErrorMessage(error: BusinessErrorLike, status?: number): string {
  if (error?.code === 'PT429' || status === 429) return BUSINESS_MESSAGES.tooMany;
  switch (error?.code) {
    case '42501':
      return BUSINESS_MESSAGES.signIn;
    case 'P0002':
      return BUSINESS_MESSAGES.gone;
    case '23505':
      return BUSINESS_MESSAGES.duplicateClaim;
    case 'PT409':
      return BUSINESS_MESSAGES.alreadyYours;
    case '22023':
    case '23514':
      return BUSINESS_MESSAGES.invalid;
    default:
      return BUSINESS_MESSAGES.generic;
  }
}

type RpcResponse = { data: string | null; error: BusinessErrorLike; status?: number };

async function run(call: () => PromiseLike<RpcResponse>): Promise<BusinessResult> {
  try {
    const { data, error, status } = await call();
    if (error) return { ok: false, message: businessErrorMessage(error, status) };
    return { ok: true, id: data ?? '' };
  } catch {
    return { ok: false, message: BUSINESS_MESSAGES.generic };
  }
}

/** Submits a new listing. Returns the new place's id; the place is pending until an admin approves it. */
export function submitNewPlace(client: BusinessClient, args: SubmitNewPlaceArgs): Promise<BusinessResult> {
  return run(() => client.rpc('submit_new_place', args));
}

/** Claims an approved place. Returns the claim's id; the place does not change until an admin approves. */
export function submitClaim(client: BusinessClient, args: SubmitClaimArgs): Promise<BusinessResult> {
  return run(() => client.rpc('submit_place_claim', args));
}

/**
 * The approved places whose name contains `query` (ignoring case and surrounding spaces), up
 * to `limit`. An empty query matches nothing, so the list starts empty. v1 has 30-50 places,
 * so this runs on the device on the list fetchApprovedPlaces already loads.
 */
export function filterClaimablePlaces(
  places: readonly PublicPlace[],
  query: string,
  limit: number = CLAIM_SEARCH_LIMIT,
): PublicPlace[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  return places
    .filter((place) => place.status === 'approved' && place.name.toLowerCase().includes(needle))
    .slice(0, limit);
}
