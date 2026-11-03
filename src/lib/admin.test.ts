import {
  ADMIN_MESSAGES,
  ADMIN_QUEUE_LIMIT,
  adminErrorMessage,
  applyQueueAction,
  approvePlace,
  createPlace,
  fetchPendingPlaces,
  hidePlace,
  isQueueAtLimit,
  rejectPlace,
  setPlaceVerified,
  validateRejectionReason,
  type AdminClient,
} from './admin';
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
