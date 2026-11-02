import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import type { CreatePlaceArgs } from './placeForm';
import { PUBLIC_PLACE_SELECT, type PublicPlace } from './places';

/**
 * Admin data calls. Each takes the Supabase client as an argument (so jest can pass a fake)
 * and returns a result instead of throwing. The database decides who may do what: these
 * calls fail with 42501 for anyone who is not an admin.
 */

export type AdminClient = SupabaseClient<Database>;

export type AdminResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** The queue shows at most this many pending places, newest first. */
export const ADMIN_QUEUE_LIMIT = 100;

export const REJECTION_REASON_MAX = 500;

export const ADMIN_MESSAGES = {
  noAccess: "You don't have admin access.",
  notFound: 'This place no longer exists.',
  invalid: "Some details aren't valid.",
  missing: 'A required field is missing.',
  generic: 'Something went wrong. Please try again.',
  reasonRequired: 'Enter a reason for the rejection.',
  reasonTooLong: `Keep the reason to ${REJECTION_REASON_MAX} characters or less.`,
} as const;

/** The parts of a PostgrestError that the mapping needs. */
export type DbErrorLike = { code?: string | null; message?: string } | null | undefined;

/** Turns a database error into plain words. It never repeats the database's own message. */
export function adminErrorMessage(error: DbErrorLike): string {
  switch (error?.code) {
    case '42501':
      return ADMIN_MESSAGES.noAccess;
    case 'P0002':
      return ADMIN_MESSAGES.notFound;
    case '22023':
    case '23514':
      return ADMIN_MESSAGES.invalid;
    case '23502':
      return ADMIN_MESSAGES.missing;
    default:
      return ADMIN_MESSAGES.generic;
  }
}

export type ReasonResult = { ok: true; reason: string } | { ok: false; message: string };

/** The same rule as admin_reject_place: 1 to 500 characters after trimming. */
export function validateRejectionReason(reason: string): ReasonResult {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return { ok: false, message: ADMIN_MESSAGES.reasonRequired };
  if (trimmed.length > REJECTION_REASON_MAX) return { ok: false, message: ADMIN_MESSAGES.reasonTooLong };
  return { ok: true, reason: trimmed };
}

type DbResponse<T> = { data: T | null; error: DbErrorLike };

async function run<T, R>(call: () => PromiseLike<DbResponse<T>>, pick: (data: T | null) => R): Promise<AdminResult<R>> {
  try {
    const { data, error } = await call();
    if (error) return { ok: false, message: adminErrorMessage(error) };
    return { ok: true, data: pick(data) };
  } catch {
    return { ok: false, message: ADMIN_MESSAGES.generic };
  }
}

/** Pending places, newest first. An admin may read every place (places_select_admin). */
export function fetchPendingPlaces(client: AdminClient): Promise<AdminResult<PublicPlace[]>> {
  return run(
    () =>
      client
        .from('places')
        .select(PUBLIC_PLACE_SELECT)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(ADMIN_QUEUE_LIMIT)
        .overrideTypes<PublicPlace[], { merge: false }>(),
    (data) => data ?? [],
  );
}

export function approvePlace(client: AdminClient, placeId: string): Promise<AdminResult<null>> {
  return run(
    () => client.rpc('admin_set_place_status', { p_place_id: placeId, p_status: 'approved' }),
    () => null,
  );
}

export function hidePlace(client: AdminClient, placeId: string): Promise<AdminResult<null>> {
  return run(
    () => client.rpc('admin_set_place_status', { p_place_id: placeId, p_status: 'hidden' }),
    () => null,
  );
}

export async function rejectPlace(
  client: AdminClient,
  placeId: string,
  reason: string,
): Promise<AdminResult<null>> {
  const checked = validateRejectionReason(reason);
  if (!checked.ok) return checked;
  return run(
    () => client.rpc('admin_reject_place', { p_place_id: placeId, p_reason: checked.reason }),
    () => null,
  );
}

export function setPlaceVerified(
  client: AdminClient,
  placeId: string,
  verified: boolean,
): Promise<AdminResult<null>> {
  return run(
    () => client.rpc('admin_set_place_verified', { p_place_id: placeId, p_verified: verified }),
    () => null,
  );
}

/** Adds a place by hand through admin_create_place and returns the new place's id. */
export function createPlace(client: AdminClient, args: CreatePlaceArgs): Promise<AdminResult<string>> {
  return run(
    () => client.rpc('admin_create_place', args),
    (data) => data ?? '',
  );
}

export type QueueAction =
  | { kind: 'approve' | 'reject' | 'hide' }
  | { kind: 'verify'; verified: boolean };

/**
 * The queue after an action succeeded: approve, reject and hide take the place out of the
 * pending queue; verify only changes its mark.
 */
export function applyQueueAction(places: PublicPlace[], placeId: string, action: QueueAction): PublicPlace[] {
  if (action.kind === 'verify') {
    return places.map((place) => (place.id === placeId ? { ...place, is_verified: action.verified } : place));
  }
  return places.filter((place) => place.id !== placeId);
}

/** True when the queue may hold more pending places than it shows. */
export function isQueueAtLimit(places: readonly unknown[]): boolean {
  return places.length >= ADMIN_QUEUE_LIMIT;
}
