import type { SupabaseClient } from '@supabase/supabase-js';

import { copy } from './copy';
import type { Database, Enums } from './database.types';
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

/** admin_list_reports returns at most this many open reports, newest first. */
export const ADMIN_REPORTS_LIMIT = 200;

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

/**
 * Whether a card shows the certify control: always for a trainer, and for any other place
 * that still carries the mark (a business can change its pending trainer's category), so
 * the admin can remove it.
 */
export function showsCertifyControl(category: string, certificationName: string | null): boolean {
  return category === 'trainer' || certificationName !== null;
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
 * with null. The database refuses a name for any place that is not a trainer; null always
 * removes the mark.
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

// ---------------------------------------------------------------------------
// Reports on listings
// ---------------------------------------------------------------------------

type ListedReport = Database['public']['Functions']['admin_list_reports']['Returns'][number];

export type ReportReason = Enums<'report_reason'>;

/**
 * One open report, without the reporter's device id (the database never returns it).
 * The type generator marks every returned column as non-null; the note can be null.
 */
export type Report = Omit<ListedReport, 'note'> & { note: string | null };

/** Open reports, newest first, up to ADMIN_REPORTS_LIMIT. */
export function fetchOpenReports(client: AdminClient): Promise<AdminResult<Report[]>> {
  return run(
    () => client.rpc('admin_list_reports'),
    // Widening the generated non-null note to string | null is safe.
    (data) => (data ?? []) as Report[],
  );
}

/** Dismisses every open report on a place. The place does not change. */
export function dismissReports(client: AdminClient, placeId: string): Promise<AdminResult<null>> {
  return run(
    () => client.rpc('admin_resolve_reports', { p_place_id: placeId, p_hide_place: false }),
    () => null,
  );
}

/** Hides a reported place and resolves its open reports, in one transaction. */
export function hideReportedPlace(client: AdminClient, placeId: string): Promise<AdminResult<null>> {
  return run(
    () => client.rpc('admin_resolve_reports', { p_place_id: placeId, p_hide_place: true }),
    () => null,
  );
}

/** A report note for the admin. Untrusted input: shown as plain text, never a link. */
export type ReportNote = { text: string; createdAt: string };

/** The open reports on one place, for one card. */
export type ReportedPlace = {
  placeId: string;
  placeName: string;
  placeCategory: Enums<'place_category'>;
  placeStatus: Enums<'place_status'>;
  count: number;
  reasonCounts: Partial<Record<ReportReason, number>>;
  /** Newest first. Blank notes are left out. */
  notes: ReportNote[];
  /** When the newest report on the place arrived. */
  latestAt: string;
};

function newer(a: string, b: string): number {
  return Date.parse(b) - Date.parse(a);
}

/**
 * Open reports grouped by place: the places with the most reports first, then the most
 * recently reported. Notes are newest first.
 */
export function groupReports(reports: readonly Report[]): ReportedPlace[] {
  const byPlace = new Map<string, ReportedPlace>();
  for (const report of reports) {
    let group = byPlace.get(report.place_id);
    if (!group) {
      group = {
        placeId: report.place_id,
        placeName: report.place_name,
        placeCategory: report.place_category,
        placeStatus: report.place_status,
        count: 0,
        reasonCounts: {},
        notes: [],
        latestAt: report.created_at,
      };
      byPlace.set(report.place_id, group);
    }
    group.count += 1;
    group.reasonCounts[report.reason] = (group.reasonCounts[report.reason] ?? 0) + 1;
    const text = report.note?.trim();
    if (text) group.notes.push({ text, createdAt: report.created_at });
    if (newer(group.latestAt, report.created_at) > 0) group.latestAt = report.created_at;
  }
  const groups = [...byPlace.values()];
  for (const group of groups) group.notes.sort((a, b) => newer(a.createdAt, b.createdAt));
  return groups.sort((a, b) => b.count - a.count || newer(a.latestAt, b.latestAt));
}

/** The notes a card shows at first, and how many more there are. */
export function visibleNotes(place: ReportedPlace, max = 5): { notes: ReportNote[]; more: number } {
  return { notes: place.notes.slice(0, max), more: Math.max(0, place.notes.length - max) };
}

/** The reported places after the admin hid one or dismissed its reports. */
export function applyReportResolved(groups: ReportedPlace[], placeId: string): ReportedPlace[] {
  return groups.filter((group) => group.placeId !== placeId);
}

/** One row of the admin queue. */
export type QueueItem =
  | { kind: 'reports'; reported: ReportedPlace }
  | { kind: 'claim'; claim: Submission }
  | { kind: 'place'; place: PublicPlace };

export type QueueSection = { key: 'reports' | 'claims' | 'places'; title: string; data: QueueItem[] };

/**
 * The queue's sections: reported places first, then claims, then pending listings. An empty
 * section is left out.
 */
export function queueSections(
  places: readonly PublicPlace[],
  claims: readonly Submission[],
  reported: readonly ReportedPlace[] = [],
): QueueSection[] {
  const sections: QueueSection[] = [
    { key: 'reports', title: copy.queue.reports, data: reported.map((group) => ({ kind: 'reports', reported: group })) },
    { key: 'claims', title: copy.queue.claims, data: claims.map((claim) => ({ kind: 'claim', claim })) },
    { key: 'places', title: copy.queue.pendingListings, data: places.map((place) => ({ kind: 'place', place })) },
  ];
  return sections.filter((section) => section.data.length > 0);
}

/** A stable key for a queue row. */
export function queueItemKey(item: QueueItem): string {
  switch (item.kind) {
    case 'reports':
      return `report-${item.reported.placeId}`;
    case 'claim':
      return `claim-${item.claim.id}`;
    case 'place':
      return `place-${item.place.id}`;
  }
}

/** True when a list may hold more rows than it shows. */
export function isQueueAtLimit(rows: readonly unknown[], limit: number = ADMIN_QUEUE_LIMIT): boolean {
  return rows.length >= limit;
}
