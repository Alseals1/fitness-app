import {
  ADMIN_MESSAGES,
  ADMIN_QUEUE_LIMIT,
  adminErrorMessage,
  applyClaimAction,
  applyClaimCertified,
  applyQueueAction,
  approveClaim,
  approvePlace,
  CERTIFICATION_NAME_MAX,
  createPlace,
  fetchPendingPlaces,
  fetchPendingSubmissions,
  hidePlace,
  isQueueAtLimit,
  queueSections,
  rejectClaim,
  rejectPlace,
  setPlaceCertified,
  setPlaceVerified,
  splitSubmissions,
  toSubmissionDetails,
  validateCertificationName,
  validateRejectionReason,
  type AdminClient,
  type Submission,
} from './admin';
import { copy } from './copy';
import type { CreatePlaceArgs } from './placeForm';
import { PUBLIC_PLACE_SELECT, type PublicPlace } from './places';

type Call = { method: string; args: unknown[] };
type Response = { data: unknown; error: { code?: string; message?: string } | null };

/**
 * A fake Supabase client: it records every call in the chain and resolves with `response`.
 * No network. Only the methods admin.ts uses exist.
 */
function fakeClient(response: Response | (() => Promise<Response>)) {
  const calls: Call[] = [];
  const resolve = () => (typeof response === 'function' ? response() : Promise.resolve(response));
  const builder = {
    select: (...args: unknown[]) => (calls.push({ method: 'select', args }), builder),
    eq: (...args: unknown[]) => (calls.push({ method: 'eq', args }), builder),
    order: (...args: unknown[]) => (calls.push({ method: 'order', args }), builder),
    limit: (...args: unknown[]) => (calls.push({ method: 'limit', args }), builder),
    overrideTypes: (...args: unknown[]) => (calls.push({ method: 'overrideTypes', args }), builder),
    then: (onFulfilled: (value: Response) => unknown, onRejected?: (reason: unknown) => unknown) =>
      resolve().then(onFulfilled, onRejected),
  };
  const client = {
    from: (...args: unknown[]) => (calls.push({ method: 'from', args }), builder),
    rpc: (...args: unknown[]) => (calls.push({ method: 'rpc', args }), builder),
  };
  // The fake implements only what admin.ts calls, so it is cast to the client type.
  return { client: client as unknown as AdminClient, calls };
}

const PLACE_ID = '5eed0000-0000-4000-8000-000000000009';

describe('fetchPendingPlaces', () => {
  it('reads the public columns of pending places, newest first, up to the limit', async () => {
    const rows = [{ id: PLACE_ID, name: 'Sample (sample)' }];
    const { client, calls } = fakeClient({ data: rows, error: null });

    await expect(fetchPendingPlaces(client)).resolves.toEqual({ ok: true, data: rows });
    expect(calls).toEqual([
      { method: 'from', args: ['places'] },
      { method: 'select', args: [PUBLIC_PLACE_SELECT] },
      { method: 'eq', args: ['status', 'pending'] },
      { method: 'order', args: ['created_at', { ascending: false }] },
      { method: 'limit', args: [ADMIN_QUEUE_LIMIT] },
      { method: 'overrideTypes', args: [] },
    ]);
    expect(ADMIN_QUEUE_LIMIT).toBe(100);
  });

  it('never selects *, since the API may not read submitted_by or claimed_by', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await fetchPendingPlaces(client);
    const select = calls.find((call) => call.method === 'select');
    expect(select?.args[0]).not.toContain('*');
    expect(select?.args[0]).not.toContain('submitted_by');
  });

  it('returns an empty list when there is no data', async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(fetchPendingPlaces(client)).resolves.toEqual({ ok: true, data: [] });
  });

  it('returns a plain message on a database error', async () => {
    const { client } = fakeClient({ data: null, error: { code: '42501', message: 'permission denied' } });
    await expect(fetchPendingPlaces(client)).resolves.toEqual({
      ok: false,
      message: ADMIN_MESSAGES.noAccess,
    });
  });
});

describe('status and verified calls', () => {
  it('approves through admin_set_place_status', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(approvePlace(client, PLACE_ID)).resolves.toEqual({ ok: true, data: null });
    expect(calls).toEqual([
      { method: 'rpc', args: ['admin_set_place_status', { p_place_id: PLACE_ID, p_status: 'approved' }] },
    ]);
  });

  it('hides through admin_set_place_status', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(hidePlace(client, PLACE_ID)).resolves.toEqual({ ok: true, data: null });
    expect(calls).toEqual([
      { method: 'rpc', args: ['admin_set_place_status', { p_place_id: PLACE_ID, p_status: 'hidden' }] },
    ]);
  });

  it.each([true, false])('sets verified to %p through admin_set_place_verified', async (verified) => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(setPlaceVerified(client, PLACE_ID, verified)).resolves.toEqual({ ok: true, data: null });
    expect(calls).toEqual([
      { method: 'rpc', args: ['admin_set_place_verified', { p_place_id: PLACE_ID, p_verified: verified }] },
    ]);
  });
});

describe('rejectPlace', () => {
  it('sends the trimmed reason to admin_reject_place', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(rejectPlace(client, PLACE_ID, '  Duplicate listing ')).resolves.toEqual({
      ok: true,
      data: null,
    });
    expect(calls).toEqual([
      { method: 'rpc', args: ['admin_reject_place', { p_place_id: PLACE_ID, p_reason: 'Duplicate listing' }] },
    ]);
  });

  it('does not call the database when the reason is invalid', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(rejectPlace(client, PLACE_ID, '   ')).resolves.toEqual({
      ok: false,
      message: ADMIN_MESSAGES.reasonRequired,
    });
    expect(calls).toEqual([]);
  });

  it('maps an unknown place', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'P0002', message: 'place x not found' } });
    await expect(rejectPlace(client, PLACE_ID, 'Spam')).resolves.toEqual({
      ok: false,
      message: ADMIN_MESSAGES.notFound,
    });
  });
});

describe('validateRejectionReason', () => {
  it.each(['', '   ', '\n\t'])('refuses a blank reason %p', (reason) => {
    expect(validateRejectionReason(reason)).toEqual({ ok: false, message: ADMIN_MESSAGES.reasonRequired });
  });

  it('accepts 500 characters and refuses 501', () => {
    expect(validateRejectionReason('x'.repeat(500))).toEqual({ ok: true, reason: 'x'.repeat(500) });
    expect(validateRejectionReason('x'.repeat(501))).toEqual({ ok: false, message: ADMIN_MESSAGES.reasonTooLong });
  });

  it('measures the length after trimming', () => {
    expect(validateRejectionReason(`  ${'x'.repeat(500)}  `)).toEqual({ ok: true, reason: 'x'.repeat(500) });
  });
});

describe('adminErrorMessage', () => {
  it.each([
    ['42501', ADMIN_MESSAGES.noAccess],
    ['P0002', ADMIN_MESSAGES.notFound],
    ['22023', ADMIN_MESSAGES.invalid],
    ['23514', ADMIN_MESSAGES.invalid],
    ['23502', ADMIN_MESSAGES.missing],
    ['XX000', ADMIN_MESSAGES.generic],
  ])('maps %s', (code, message) => {
    expect(adminErrorMessage({ code, message: 'raw database text' })).toBe(message);
  });

  it('falls back to a generic message without a code', () => {
    expect(adminErrorMessage(null)).toBe(ADMIN_MESSAGES.generic);
    expect(adminErrorMessage({ message: 'TypeError: Network request failed' })).toBe(ADMIN_MESSAGES.generic);
  });
});

describe('failures never throw', () => {
  it('returns ok: false when the request itself rejects', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('Network request failed')));
    await expect(approvePlace(client, PLACE_ID)).resolves.toEqual({ ok: false, message: ADMIN_MESSAGES.generic });
    await expect(fetchPendingPlaces(client)).resolves.toEqual({ ok: false, message: ADMIN_MESSAGES.generic });
  });
});

describe('applyQueueAction', () => {
  const place = (id: string, isVerified = false): PublicPlace => ({
    id,
    name: `Place ${id} (sample)`,
    category: 'gym',
    description: null,
    area: 'hoover',
    price_range: 'budget',
    schedule: null,
    website_url: null,
    contact_phone: '205-555-0100',
    contact_email: null,
    instagram_handle: null,
    tags: [],
    status: 'pending',
    is_verified: isVerified,
    last_confirmed_at: null,
    is_certified: false,
    certification_name: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  });
  const queue = [place('a'), place('b'), place('c')];

  it.each(['approve', 'reject', 'hide'] as const)('%s removes the place and keeps the order', (kind) => {
    expect(applyQueueAction(queue, 'b', { kind }).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('certify sets both certified columns on that place only, and null clears them', () => {
    const certified = applyQueueAction(queue, 'b', { kind: 'certify', name: 'NASM-CPT' });
    expect(certified.map((p) => [p.id, p.is_certified, p.certification_name])).toEqual([
      ['a', false, null],
      ['b', true, 'NASM-CPT'],
      ['c', false, null],
    ]);
    const cleared = applyQueueAction(certified, 'b', { kind: 'certify', name: null });
    expect(cleared[1]).toMatchObject({ is_certified: false, certification_name: null });
  });

  it('verify flips only that place and keeps it in the queue', () => {
    const next = applyQueueAction(queue, 'b', { kind: 'verify', verified: true });
    expect(next.map((p) => [p.id, p.is_verified])).toEqual([
      ['a', false],
      ['b', true],
      ['c', false],
    ]);
    expect(queue[1].is_verified).toBe(false);
  });

  it('leaves the queue alone for an unknown id', () => {
    expect(applyQueueAction(queue, 'zzz', { kind: 'approve' })).toEqual(queue);
  });
});

describe('isQueueAtLimit', () => {
  it('is true from the limit up', () => {
    expect(isQueueAtLimit(new Array(ADMIN_QUEUE_LIMIT - 1).fill(0))).toBe(false);
    expect(isQueueAtLimit(new Array(ADMIN_QUEUE_LIMIT).fill(0))).toBe(true);
  });
});

describe('createPlace', () => {
  const args: CreatePlaceArgs = {
    p_name: 'Hand Entered (sample)',
    p_category: 'gym',
    p_area: 'hoover',
    p_price_range: 'budget',
    p_contact_phone: '205-555-0100',
    p_tags: ['strength'],
    p_status: 'approved',
    p_is_verified: false,
  };

  it('calls admin_create_place with the form arguments and returns the new id', async () => {
    const { client, calls } = fakeClient({ data: PLACE_ID, error: null });
    await expect(createPlace(client, args)).resolves.toEqual({ ok: true, data: PLACE_ID });
    expect(calls).toEqual([{ method: 'rpc', args: ['admin_create_place', args] }]);
  });

  it.each([
    ['42501', ADMIN_MESSAGES.noAccess],
    ['23514', ADMIN_MESSAGES.invalid],
    ['22023', ADMIN_MESSAGES.invalid],
    ['23502', ADMIN_MESSAGES.missing],
  ])('maps a %s failure', async (code, message) => {
    const { client } = fakeClient({ data: null, error: { code, message: 'raw' } });
    await expect(createPlace(client, args)).resolves.toEqual({ ok: false, message });
  });
});

const CLAIM_ID = '5eed0000-0000-4000-8000-0000000000c1';

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: CLAIM_ID,
    kind: 'claim',
    place_id: PLACE_ID,
    place_name: 'Sample Trainer (sample)',
    place_category: 'trainer',
    place_status: 'approved',
    place_is_claimed: false,
    place_certification_name: null,
    account_email: 'owner@example.com',
    verification_email: 'owner-business@example.com',
    verification_social: null,
    certification_name: 'NASM-CPT',
    note: null,
    created_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

describe('fetchPendingSubmissions', () => {
  it('calls admin_list_submissions and returns its rows', async () => {
    const rows = [makeSubmission()];
    const { client, calls } = fakeClient({ data: rows, error: null });
    await expect(fetchPendingSubmissions(client)).resolves.toEqual({ ok: true, data: rows });
    expect(calls).toEqual([{ method: 'rpc', args: ['admin_list_submissions'] }]);
  });

  it('returns an empty list when there is no data, and maps errors', async () => {
    await expect(fetchPendingSubmissions(fakeClient({ data: null, error: null }).client)).resolves.toEqual({
      ok: true,
      data: [],
    });
    await expect(
      fetchPendingSubmissions(fakeClient({ data: null, error: { code: '42501', message: 'admin only' } }).client),
    ).resolves.toEqual({ ok: false, message: ADMIN_MESSAGES.noAccess });
  });
});

describe('approveClaim and rejectClaim', () => {
  it('approves through admin_approve_claim', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(approveClaim(client, CLAIM_ID)).resolves.toEqual({ ok: true, data: null });
    expect(calls).toEqual([{ method: 'rpc', args: ['admin_approve_claim', { p_submission_id: CLAIM_ID }] }]);
  });

  it('rejects through admin_reject_claim with the trimmed reason', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(rejectClaim(client, CLAIM_ID, '  No proof ')).resolves.toEqual({ ok: true, data: null });
    expect(calls).toEqual([
      { method: 'rpc', args: ['admin_reject_claim', { p_submission_id: CLAIM_ID, p_reason: 'No proof' }] },
    ]);
  });

  it('does not call the database without a reason', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(rejectClaim(client, CLAIM_ID, ' ')).resolves.toEqual({
      ok: false,
      message: ADMIN_MESSAGES.reasonRequired,
    });
    expect(calls).toEqual([]);
  });

  it('says a decided claim is gone', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'P0002', message: 'pending claim x not found' } });
    await expect(approveClaim(client, CLAIM_ID)).resolves.toEqual({ ok: false, message: ADMIN_MESSAGES.claimGone });
    await expect(rejectClaim(client, CLAIM_ID, 'No proof')).resolves.toEqual({
      ok: false,
      message: ADMIN_MESSAGES.claimGone,
    });
  });
});

describe('setPlaceCertified', () => {
  it('sends the trimmed name and returns it', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(setPlaceCertified(client, PLACE_ID, '  NASM-CPT ')).resolves.toEqual({ ok: true, data: 'NASM-CPT' });
    expect(calls).toEqual([
      { method: 'rpc', args: ['admin_set_place_certified', { p_place_id: PLACE_ID, p_certification_name: 'NASM-CPT' }] },
    ]);
  });

  it('sends null to remove the mark', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(setPlaceCertified(client, PLACE_ID, null)).resolves.toEqual({ ok: true, data: null });
    expect(calls).toEqual([
      { method: 'rpc', args: ['admin_set_place_certified', { p_place_id: PLACE_ID, p_certification_name: null }] },
    ]);
  });

  it('does not call the database for a blank name', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await expect(setPlaceCertified(client, PLACE_ID, '   ')).resolves.toEqual({
      ok: false,
      message: ADMIN_MESSAGES.certificationRequired,
    });
    expect(calls).toEqual([]);
  });

  it('maps a place that is not a trainer', async () => {
    const { client } = fakeClient({ data: null, error: { code: '22023', message: 'only a trainer' } });
    await expect(setPlaceCertified(client, PLACE_ID, 'RYT')).resolves.toEqual({
      ok: false,
      message: ADMIN_MESSAGES.invalid,
    });
  });
});

describe('validateCertificationName', () => {
  it(`accepts 1 to ${CERTIFICATION_NAME_MAX} characters after trimming`, () => {
    expect(validateCertificationName('  ACE ')).toEqual({ ok: true, name: 'ACE' });
    expect(validateCertificationName('x'.repeat(CERTIFICATION_NAME_MAX)).ok).toBe(true);
    expect(validateCertificationName('x'.repeat(CERTIFICATION_NAME_MAX + 1))).toEqual({
      ok: false,
      message: ADMIN_MESSAGES.certificationTooLong,
    });
    expect(validateCertificationName('')).toEqual({ ok: false, message: ADMIN_MESSAGES.certificationRequired });
  });
});

describe('splitSubmissions', () => {
  it('keys new listings by place and keeps the claims in order', () => {
    const newPlace = makeSubmission({ id: 'n1', kind: 'new_place', place_id: 'p1', place_status: 'pending' });
    const claimA = makeSubmission({ id: 'c1', place_id: 'p2' });
    const claimB = makeSubmission({ id: 'c2', place_id: 'p3' });
    expect(splitSubmissions([claimA, newPlace, claimB])).toEqual({
      byPlaceId: { p1: newPlace },
      claims: [claimA, claimB],
    });
  });
});

describe('toSubmissionDetails', () => {
  it('lists the non-empty details with labels', () => {
    expect(toSubmissionDetails(makeSubmission({ note: '  ', verification_social: ' instagram.com/sample ' }))).toEqual([
      { label: copy.queue.details.account, value: 'owner@example.com' },
      { label: copy.queue.details.verificationEmail, value: 'owner-business@example.com' },
      { label: copy.queue.details.verificationSocial, value: 'instagram.com/sample' },
      { label: copy.queue.details.certification, value: 'NASM-CPT' },
    ]);
  });

  it('keeps untrusted values as plain strings, never links', () => {
    const details = toSubmissionDetails(
      makeSubmission({
        verification_social: 'javascript:alert(1)',
        note: '<script>alert(1)</script>',
      }),
    );
    expect(details).toContainEqual({ label: copy.queue.details.verificationSocial, value: 'javascript:alert(1)' });
    expect(details).toContainEqual({ label: copy.queue.details.note, value: '<script>alert(1)</script>' });
    for (const detail of details) {
      expect(Object.keys(detail).sort()).toEqual(['label', 'value']);
    }
  });
});

describe('claim helpers', () => {
  const claims = [
    makeSubmission({ id: 'c1', place_id: 'p1' }),
    makeSubmission({ id: 'c2', place_id: 'p2' }),
    makeSubmission({ id: 'c3', place_id: 'p1' }),
  ];

  it('applyClaimAction removes the decided claim', () => {
    expect(applyClaimAction(claims, 'c2').map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('applyClaimCertified updates every claim on that place', () => {
    const next = applyClaimCertified(claims, 'p1', 'ACE');
    expect(next.map((c) => c.place_certification_name)).toEqual(['ACE', null, 'ACE']);
    expect(applyClaimCertified(next, 'p1', null).map((c) => c.place_certification_name)).toEqual([null, null, null]);
  });
});

describe('queueSections', () => {
  const place = { id: 'p9' } as PublicPlace;
  const claim = makeSubmission();

  it('puts claims first, then pending listings', () => {
    expect(queueSections([place], [claim])).toEqual([
      { key: 'claims', title: copy.queue.claims, data: [{ kind: 'claim', claim }] },
      { key: 'places', title: copy.queue.pendingListings, data: [{ kind: 'place', place }] },
    ]);
  });

  it('leaves out empty sections', () => {
    expect(queueSections([place], []).map((s) => s.key)).toEqual(['places']);
    expect(queueSections([], [claim]).map((s) => s.key)).toEqual(['claims']);
    expect(queueSections([], [])).toEqual([]);
  });
});
