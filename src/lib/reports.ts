import type { SupabaseClient } from '@supabase/supabase-js';

import { copy } from './copy';
import { Constants, type Database, type Enums } from './database.types';
import { toOptions } from './placeOptions';

/**
 * Reporting a problem with a listing. Anyone can report, with no account. Every rule here is
 * also enforced by submit_place_report in the database; the checks here only give quicker,
 * friendlier feedback. The data call takes the Supabase client as an argument (so jest can
 * pass a fake) and returns a result instead of throwing.
 */

export type ReportReason = Enums<'report_reason'>;

export type ReportClient = SupabaseClient<Database>;

/** In the database's enum order. */
export const REPORT_REASONS = Constants.public.Enums.report_reason;

/** The Record type makes typecheck fail when the database gains a reason with no label here. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  closed: 'Closed',
  wrong_details: 'Wrong details',
  spam: 'Spam',
  other: 'Other',
};

export const REPORT_REASON_OPTIONS = toOptions(REPORT_REASONS, REPORT_REASON_LABELS);

/** Keep in step with the note check in the place_reports migration. */
export const REPORT_NOTE_MAX = 500;

/** Keep in step with the device limit in submit_place_report. */
export const REPORTS_PER_DAY = 5;

export const REPORT_MESSAGES = {
  reasonRequired: 'Choose a reason.',
  noteRequired: "Add a short note so we know what's wrong.",
  noteTooLong: `Keep the note to ${REPORT_NOTE_MAX} characters or fewer.`,
  tooMany: "You can't send more reports right now. Please try again tomorrow.",
  alreadyReported: copy.report.alreadyReported,
  gone: "This listing isn't available any more.",
  invalid: "Some details aren't valid. Check the form and try again.",
  generic: "Couldn't send your report. Check your connection and try again.",
} as const;

export type ReportInput = { reason: ReportReason | null; note: string };

export type ReportErrors = { reason?: string; note?: string };

type SubmitReportArgs = Database['public']['Functions']['submit_place_report']['Args'];

/** The reason and note, ready to send. The place and device are added by submitReport. */
export type ReportFields = Pick<SubmitReportArgs, 'p_reason' | 'p_note'>;

export type ReportValidation = { ok: true; fields: ReportFields } | { ok: false; errors: ReportErrors };

/** Whether the note is required for this reason. Only Other needs one. */
export function isNoteRequired(reason: ReportReason | null): boolean {
  return reason === 'other';
}

/** The note field's label, which says whether a note is needed. */
export function reportNoteLabel(reason: ReportReason | null): string {
  return isNoteRequired(reason) ? copy.report.noteLabelRequired : copy.report.noteLabel;
}

/**
 * Checks the form. A reason is required; the note is trimmed, at most REPORT_NOTE_MAX
 * characters, and required for Other. A blank note is left out.
 */
export function validateReport({ reason, note }: ReportInput): ReportValidation {
  const errors: ReportErrors = {};
  const trimmed = note.trim();

  if (reason === null || !REPORT_REASONS.includes(reason)) errors.reason = REPORT_MESSAGES.reasonRequired;
  if (trimmed.length > REPORT_NOTE_MAX) errors.note = REPORT_MESSAGES.noteTooLong;
  else if (trimmed.length === 0 && isNoteRequired(reason)) errors.note = REPORT_MESSAGES.noteRequired;

  if (reason === null || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, fields: trimmed ? { p_reason: reason, p_note: trimmed } : { p_reason: reason } };
}

/** The parts of a PostgrestError that the mapping needs. */
export type ReportErrorLike = { code?: string | null; message?: string } | null | undefined;

/**
 * Turns a database error into plain words. It never repeats the database's own message.
 * PostgREST sends SQLSTATE PT429 as HTTP 429 with code 'PT429'; both are checked. PT429 is
 * both the device limit and the per-place cap; the same message fits both.
 */
export function reportErrorMessage(error: ReportErrorLike, status?: number): string {
  if (error?.code === 'PT429' || status === 429) return REPORT_MESSAGES.tooMany;
  switch (error?.code) {
    case 'PT409':
      return REPORT_MESSAGES.alreadyReported;
    case 'P0002':
      return REPORT_MESSAGES.gone;
    case '22023':
    case '23514':
      return REPORT_MESSAGES.invalid;
    default:
      return REPORT_MESSAGES.generic;
  }
}

/**
 * `alreadyReported`: this device already has an open report on the place. Not a failure for
 * the person: the screen shows it like a success.
 */
export type ReportResult =
  | { ok: true }
  | { ok: false; message: string; alreadyReported?: boolean; errors?: ReportErrors };

/** What the profile shows after a send: thanks, "already reported", or the form again. */
export type ReportOutcome = 'sent' | 'alreadyReported' | 'failed';

export function reportOutcome(result: ReportResult): ReportOutcome {
  if (result.ok) return 'sent';
  return result.alreadyReported ? 'alreadyReported' : 'failed';
}

/** Checks the form, then sends the report. Never throws. */
export async function submitReport(
  client: ReportClient,
  placeId: string,
  deviceId: string,
  input: ReportInput,
): Promise<ReportResult> {
  const validation = validateReport(input);
  if (!validation.ok) return { ok: false, message: REPORT_MESSAGES.invalid, errors: validation.errors };

  const args: SubmitReportArgs = { p_place_id: placeId, p_device_id: deviceId, ...validation.fields };
  try {
    const { error, status } = await client.rpc('submit_place_report', args);
    if (!error) return { ok: true };
    if (error.code === 'PT409') return { ok: false, message: REPORT_MESSAGES.alreadyReported, alreadyReported: true };
    return { ok: false, message: reportErrorMessage(error, status) };
  } catch {
    return { ok: false, message: REPORT_MESSAGES.generic };
  }
}
