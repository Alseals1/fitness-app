import { copy } from './copy';
import {
  isNoteRequired,
  REPORT_MESSAGES,
  REPORT_NOTE_MAX,
  REPORT_REASON_OPTIONS,
  REPORT_REASONS,
  reportErrorMessage,
  reportNoteLabel,
  reportOutcome,
  REPORTS_PER_DAY,
  submitReport,
  validateReport,
  type ReportClient,
} from './reports';

type Call = { method: string; args: unknown[] };
type Response = { data: unknown; error: { code?: string; message?: string } | null; status?: number };

/** A fake Supabase client that records rpc calls and resolves with `response`. No network. */
function fakeClient(response: Response | (() => Promise<Response>)) {
  const calls: Call[] = [];
  const resolve = () => (typeof response === 'function' ? response() : Promise.resolve(response));
  const client = {
    rpc: (...args: unknown[]) => {
      calls.push({ method: 'rpc', args });
      return { then: (f: (v: Response) => unknown, r?: (e: unknown) => unknown) => resolve().then(f, r) };
    },
  };
  // The fake implements only what reports.ts calls, so it is cast to the client type.
  return { client: client as unknown as ReportClient, calls };
}

const PLACE_ID = '5eed0000-0000-4000-8000-000000000002';
const DEVICE_ID = 'de5eed00-0000-4000-8000-000000000009';

describe('reasons', () => {
  it('has the four reasons in the database order, each with a label', () => {
    expect(REPORT_REASONS).toEqual(['closed', 'wrong_details', 'spam', 'other']);
    expect(REPORT_REASON_OPTIONS).toEqual([
      { value: 'closed', label: 'Closed' },
      { value: 'wrong_details', label: 'Wrong details' },
      { value: 'spam', label: 'Spam' },
      { value: 'other', label: 'Other' },
    ]);
  });

  it('accepts every reason, with and without a note where allowed', () => {
    for (const reason of REPORT_REASONS) {
      expect(validateReport({ reason, note: 'Moved to a new address' })).toEqual({
        ok: true,
        fields: { p_reason: reason, p_note: 'Moved to a new address' },
      });
    }
    for (const reason of ['closed', 'wrong_details', 'spam'] as const) {
      expect(validateReport({ reason, note: '' })).toEqual({ ok: true, fields: { p_reason: reason } });
    }
  });

  it('only Other needs a note, and the note label says so', () => {
    expect(isNoteRequired('other')).toBe(true);
    expect(isNoteRequired('closed')).toBe(false);
    expect(isNoteRequired(null)).toBe(false);
    expect(reportNoteLabel('other')).toBe(copy.report.noteLabelRequired);
    expect(reportNoteLabel('spam')).toBe(copy.report.noteLabel);
    expect(reportNoteLabel(null)).toBe(copy.report.noteLabel);
  });
});

describe('validateReport', () => {
  it('needs a reason', () => {
    expect(validateReport({ reason: null, note: 'Closed for good' })).toEqual({
      ok: false,
      errors: { reason: REPORT_MESSAGES.reasonRequired },
    });
  });

  it('refuses a value that is not a reason', () => {
    // A value from outside the type, as could come from bad data.
    const reason = 'rude' as unknown as 'spam';
    expect(validateReport({ reason, note: '' })).toEqual({ ok: false, errors: { reason: REPORT_MESSAGES.reasonRequired } });
  });

  it('refuses Other with an empty or whitespace note', () => {
    expect(validateReport({ reason: 'other', note: '' })).toEqual({ ok: false, errors: { note: REPORT_MESSAGES.noteRequired } });
    expect(validateReport({ reason: 'other', note: '   \n ' })).toEqual({
      ok: false,
      errors: { note: REPORT_MESSAGES.noteRequired },
    });
  });

  it('trims the note and leaves out a blank one', () => {
    expect(validateReport({ reason: 'closed', note: '  Shut in October  ' })).toEqual({
      ok: true,
      fields: { p_reason: 'closed', p_note: 'Shut in October' },
    });
    expect(validateReport({ reason: 'spam', note: '    ' })).toEqual({ ok: true, fields: { p_reason: 'spam' } });
  });

  it(`allows a note of ${REPORT_NOTE_MAX} characters and refuses a longer one`, () => {
    expect(validateReport({ reason: 'closed', note: ` ${'x'.repeat(REPORT_NOTE_MAX)} ` }).ok).toBe(true);
    expect(validateReport({ reason: 'closed', note: 'x'.repeat(REPORT_NOTE_MAX + 1) })).toEqual({
      ok: false,
      errors: { note: REPORT_MESSAGES.noteTooLong },
    });
  });

  it('reports every field error at once', () => {
    expect(validateReport({ reason: null, note: 'x'.repeat(REPORT_NOTE_MAX + 1) })).toEqual({
      ok: false,
      errors: { reason: REPORT_MESSAGES.reasonRequired, note: REPORT_MESSAGES.noteTooLong },
    });
  });
});

describe('reportErrorMessage', () => {
  it('maps the rate limit, by code or by HTTP status', () => {
    expect(reportErrorMessage({ code: 'PT429', message: 'too many reports' }, 429)).toBe(REPORT_MESSAGES.tooMany);
    expect(reportErrorMessage({ code: 'PT429' })).toBe(REPORT_MESSAGES.tooMany);
    expect(reportErrorMessage(null, 429)).toBe(REPORT_MESSAGES.tooMany);
    expect(reportErrorMessage({ code: 'PT429', message: 'too many open reports on this place' }, 429)).toBe(
      REPORT_MESSAGES.tooMany,
    );
  });

  it('maps already reported, not found and invalid input', () => {
    expect(reportErrorMessage({ code: 'PT409' }, 409)).toBe(REPORT_MESSAGES.alreadyReported);
    expect(reportErrorMessage({ code: 'P0002' }, 404)).toBe(REPORT_MESSAGES.gone);
    expect(reportErrorMessage({ code: '22023' }, 400)).toBe(REPORT_MESSAGES.invalid);
    expect(reportErrorMessage({ code: '23514' }, 400)).toBe(REPORT_MESSAGES.invalid);
  });

  it('falls back to a generic message and never repeats the database text', () => {
    const message = reportErrorMessage({ code: 'XX000', message: 'internal details' }, 500);
    expect(message).toBe(REPORT_MESSAGES.generic);
    expect(message).not.toContain('internal details');
    expect(reportErrorMessage(undefined)).toBe(REPORT_MESSAGES.generic);
  });

  it('keeps the daily limit in step with the database', () => {
    expect(REPORTS_PER_DAY).toBe(5);
  });
});

describe('submitReport', () => {
  it('sends the place, device, reason and trimmed note to submit_place_report', async () => {
    const { client, calls } = fakeClient({ data: 'report-id', error: null, status: 200 });
    await expect(submitReport(client, PLACE_ID, DEVICE_ID, { reason: 'other', note: '  Not a gym  ' })).resolves.toEqual({
      ok: true,
    });
    expect(calls).toEqual([
      {
        method: 'rpc',
        args: [
          'submit_place_report',
          { p_place_id: PLACE_ID, p_device_id: DEVICE_ID, p_reason: 'other', p_note: 'Not a gym' },
        ],
      },
    ]);
  });

  it('leaves out a blank note', async () => {
    const { client, calls } = fakeClient({ data: 'report-id', error: null, status: 200 });
    await submitReport(client, PLACE_ID, DEVICE_ID, { reason: 'spam', note: '  ' });
    expect(calls[0].args[1]).toEqual({ p_place_id: PLACE_ID, p_device_id: DEVICE_ID, p_reason: 'spam' });
  });

  it('fails validation before any call', async () => {
    const { client, calls } = fakeClient({ data: 'report-id', error: null, status: 200 });
    await expect(submitReport(client, PLACE_ID, DEVICE_ID, { reason: 'other', note: '' })).resolves.toEqual({
      ok: false,
      message: REPORT_MESSAGES.invalid,
      errors: { note: REPORT_MESSAGES.noteRequired },
    });
    expect(calls).toEqual([]);
  });

  it('maps the rate limit', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'PT429', message: 'too many reports' }, status: 429 });
    await expect(submitReport(client, PLACE_ID, DEVICE_ID, { reason: 'closed', note: '' })).resolves.toEqual({
      ok: false,
      message: REPORT_MESSAGES.tooMany,
    });
  });

  it('marks an existing open report as already reported', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'PT409', message: 'already reported' }, status: 409 });
    await expect(submitReport(client, PLACE_ID, DEVICE_ID, { reason: 'closed', note: '' })).resolves.toEqual({
      ok: false,
      message: REPORT_MESSAGES.alreadyReported,
      alreadyReported: true,
    });
  });

  it('maps a place that is gone', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'P0002' }, status: 404 });
    await expect(submitReport(client, PLACE_ID, DEVICE_ID, { reason: 'closed', note: '' })).resolves.toEqual({
      ok: false,
      message: REPORT_MESSAGES.gone,
    });
  });

  it('never throws when the call rejects', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('network down')));
    await expect(submitReport(client, PLACE_ID, DEVICE_ID, { reason: 'closed', note: '' })).resolves.toEqual({
      ok: false,
      message: REPORT_MESSAGES.generic,
    });
  });
});

describe('reportOutcome', () => {
  it('shows thanks on success, the already-reported text on PT409, and the form otherwise', () => {
    expect(reportOutcome({ ok: true })).toBe('sent');
    expect(reportOutcome({ ok: false, message: REPORT_MESSAGES.alreadyReported, alreadyReported: true })).toBe(
      'alreadyReported',
    );
    expect(reportOutcome({ ok: false, message: REPORT_MESSAGES.tooMany })).toBe('failed');
  });
});
