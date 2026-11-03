import type { SupabaseClient } from '@supabase/supabase-js';

import { copy } from './copy';
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

/** The same limit as places.certification_name. */
export const CERTIFICATION_NAME_MAX = 120;

export const ADMIN_MESSAGES = {
  noAccess: "You don't have admin access.",
  notFound: 'This place no longer exists.',
  invalid: "Some details aren't valid.",
  missing: 'A required field is missing.',
  generic: 'Something went wrong. Please try again.',
  reasonRequired: 'Enter a reason for the rejection.',
  reasonTooLong: `Keep the reason to ${REJECTION_REASON_MAX} characters or less.`,
  claimGone: 'This claim was already decided, or the place is gone.',
  certificationRequired: 'Enter the certification you saw proof of.',
  certificationTooLong: `Keep the certification name to ${CERTIFICATION_NAME_MAX} characters or less.`,
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

export type CertificationResult = { ok: true; name: string } | { ok: false; message: string };

/** The same rule as admin_set_place_certified: 1 to 120 characters after trimming. */
export function validateCertificationName(name: string): CertificationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, message: ADMIN_MESSAGES.certificationRequired };
  if (trimmed.length > CERTIFICATION_NAME_MAX) return { ok: false, message: ADMIN_MESSAGES.certificationTooLong };
  return { ok: true, name: trimmed };
}

type DbResponse<T> = { data: T | null; error: DbErrorLike };

async function run<T, R>(
  call: () => PromiseLike<DbResponse<T>>,
  pick: (data: T | null) => R,
  notFoundMessage: string = ADMIN_MESSAGES.notFound,
): Promise<AdminResult<R>> {
  try {
    const { data, error } = await call();
    if (error?.code === 'P0002') return { ok: false, message: notFoundMessage };
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

/**
 * Marks a trainer certified with `name` after the admin has seen proof, or removes the mark
 * with null. The database refuses any place that is not a trainer.
 */
export async function setPlaceCertified(
  client: AdminClient,
  placeId: string,
  name: string | null,
): Promise<AdminResult<string | null>> {
  let checkedName: string | null = null;
  if (name !== null) {
    const checked = validateCertificationName(name);
    if (!checked.ok) return checked;
    checkedName = checked.name;
  }
  return run(
    () =>
      client.rpc('admin_set_place_certified', {
        p_place_id: placeId,
        // The generated type says string, but the function takes null to remove the mark.
        p_certification_name: checkedName as string,
      }),
    () => checkedName,
  );
}

// ---------------------------------------------------------------------------
// Submissions from businesses
// ---------------------------------------------------------------------------

type ListedSubmission = Database['public']['Functions']['admin_list_submissions']['Returns'][number];

/**
 * A pending new listing or claim from a business, with its private verification details.
 * The type generator marks every returned column as non-null; these can be null.
 */
export type Submission = Omit<
  ListedSubmission,
  'account_email' | 'verification_email' | 'verification_social' | 'certification_name' | 'note' | 'place_certification_name'
> & {
  account_email: string | null;
  verification_email: string | null;
  verification_social: string | null;
  certification_name: string | null;
  note: string | null;
  /** The place's current certification; null when it is not certified. */
  place_certification_name: string | null;
};

/** Pending new-listing submissions and pending claims, newest first. */
export function fetchPendingSubmissions(client: AdminClient): Promise<AdminResult<Submission[]>> {
  return run(
    () => client.rpc('admin_list_submissions'),
    // Widening the generated non-null strings to string | null is safe.
    (data) => (data ?? []) as Submission[],
  );
}

/** Approves a claim: the claimant becomes the place's owner (claimed_by). */
export function approveClaim(client: AdminClient, submissionId: string): Promise<AdminResult<null>> {
  return run(
    () => client.rpc('admin_approve_claim', { p_submission_id: submissionId }),
    () => null,
    ADMIN_MESSAGES.claimGone,
  );
}

/** Rejects a claim with a reason. The place does not change. */
export async function rejectClaim(
  client: AdminClient,
  submissionId: string,
  reason: string,
): Promise<AdminResult<null>> {
  const checked = validateRejectionReason(reason);
  if (!checked.ok) return checked;
  return run(
    () => client.rpc('admin_reject_claim', { p_submission_id: submissionId, p_reason: checked.reason }),
    () => null,
    ADMIN_MESSAGES.claimGone,
  );
}

/** New-listing submissions by the place they created, and the claims, in the order given. */
export function splitSubmissions(submissions: readonly Submission[]): {
  byPlaceId: Record<string, Submission>;
  claims: Submission[];
} {
  const byPlaceId: Record<string, Submission> = {};
  const claims: Submission[] = [];
  for (const submission of submissions) {
    if (submission.kind === 'claim') claims.push(submission);
    else byPlaceId[submission.place_id] = submission;
  }
  return { byPlaceId, claims };
}

/** One labelled line of submission details. Plain text only: never a link. */
export type SubmissionDetail = { label: string; value: string };

/**
 * The details a business sent, as labelled plain strings for the admin to read and copy.
 * Untrusted input: nothing here is turned into a link or a URL. Empty values are left out.
 */
export function toSubmissionDetails(submission: Submission): SubmissionDetail[] {
  const rows: [string, string | null][] = [
    [copy.queue.details.account, submission.account_email],
    [copy.queue.details.verificationEmail, submission.verification_email],
    [copy.queue.details.verificationSocial, submission.verification_social],
    [copy.queue.details.certification, submission.certification_name],
    [copy.queue.details.note, submission.note],
  ];
  return rows.flatMap(([label, value]) => {
    const trimmed = value?.trim();
    return trimmed ? [{ label, value: trimmed }] : [];
  });
}

/** The claims after one was approved or rejected. */
export function applyClaimAction(claims: Submission[], submissionId: string): Submission[] {
  return claims.filter((claim) => claim.id !== submissionId);
}

/** The claims after a place's certification changed: every claim on that place shows the new state. */
export function applyClaimCertified(claims: Submission[], placeId: string, name: string | null): Submission[] {
  return claims.map((claim) => (claim.place_id === placeId ? { ...claim, place_certification_name: name } : claim));
}

export type QueueAction =
  | { kind: 'approve' | 'reject' | 'hide' }
  | { kind: 'verify'; verified: boolean }
  | { kind: 'certify'; name: string | null };

/**
 * The queue after an action succeeded: approve, reject and hide take the place out of the
 * pending queue; verify and certify only change its marks.
 */
export function applyQueueAction(places: PublicPlace[], placeId: string, action: QueueAction): PublicPlace[] {
  if (action.kind === 'verify') {
    return places.map((place) => (place.id === placeId ? { ...place, is_verified: action.verified } : place));
  }
  if (action.kind === 'certify') {
    return places.map((place) =>
      place.id === placeId ? { ...place, is_certified: action.name !== null, certification_name: action.name } : place,
    );
  }
  return places.filter((place) => place.id !== placeId);
}

/** One row of the admin queue. */
export type QueueItem = { kind: 'claim'; claim: Submission } | { kind: 'place'; place: PublicPlace };

export type QueueSection = { key: 'claims' | 'places'; title: string; data: QueueItem[] };

/** The queue's sections: claims first, then pending listings. An empty section is left out. */
export function queueSections(places: readonly PublicPlace[], claims: readonly Submission[]): QueueSection[] {
  const sections: QueueSection[] = [
    { key: 'claims', title: copy.queue.claims, data: claims.map((claim) => ({ kind: 'claim', claim })) },
    { key: 'places', title: copy.queue.pendingListings, data: places.map((place) => ({ kind: 'place', place })) },
  ];
  return sections.filter((section) => section.data.length > 0);
}

/** True when the queue may hold more pending places than it shows. */
export function isQueueAtLimit(places: readonly unknown[]): boolean {
  return places.length >= ADMIN_QUEUE_LIMIT;
}
