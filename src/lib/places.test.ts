import { copy } from './copy';
import {
  fetchApprovedPlace,
  fetchApprovedPlaces,
  fetchApprovedPlacesByIds,
  isPlaceId,
  PUBLIC_PLACE_COLUMNS,
  PUBLIC_PLACE_SELECT,
  PUBLIC_PLACES_LIMIT,
  type PlacesClient,
} from './places';

const PRIVATE_COLUMNS = ['submitted_by', 'claimed_by'];

describe('PUBLIC_PLACE_COLUMNS', () => {
  it('leaves out the columns that hold user ids', () => {
    for (const column of PRIVATE_COLUMNS) {
      expect(PUBLIC_PLACE_COLUMNS).not.toContain(column);
    }
  });

  it('includes the certified mark, which everyone may read', () => {
    expect(PUBLIC_PLACE_COLUMNS).toEqual(expect.arrayContaining(['is_certified', 'certification_name']));
  });

  it('has no duplicates', () => {
    expect(new Set(PUBLIC_PLACE_COLUMNS).size).toBe(PUBLIC_PLACE_COLUMNS.length);
  });
});

describe('PUBLIC_PLACE_SELECT', () => {
  it('is the comma-joined column list', () => {
    expect(PUBLIC_PLACE_SELECT).toBe(PUBLIC_PLACE_COLUMNS.join(','));
    expect(PUBLIC_PLACE_SELECT).not.toContain('*');
  });
});

type Call = { method: string; args: unknown[] };
type Response = { data: unknown; error: { code?: string; message?: string } | null };

/** A fake Supabase client that records the call chain and resolves with `response`. No network. */
function fakeClient(response: Response | (() => Promise<Response>)) {
  const calls: Call[] = [];
  const resolve = () => (typeof response === 'function' ? response() : Promise.resolve(response));
  const builder = {
    select: (...args: unknown[]) => (calls.push({ method: 'select', args }), builder),
    eq: (...args: unknown[]) => (calls.push({ method: 'eq', args }), builder),
    in: (...args: unknown[]) => (calls.push({ method: 'in', args }), builder),
    order: (...args: unknown[]) => (calls.push({ method: 'order', args }), builder),
    limit: (...args: unknown[]) => (calls.push({ method: 'limit', args }), builder),
    maybeSingle: (...args: unknown[]) => (calls.push({ method: 'maybeSingle', args }), builder),
    overrideTypes: (...args: unknown[]) => (calls.push({ method: 'overrideTypes', args }), builder),
    then: (onFulfilled: (value: Response) => unknown, onRejected?: (reason: unknown) => unknown) =>
      resolve().then(onFulfilled, onRejected),
  };
  const client = { from: (...args: unknown[]) => (calls.push({ method: 'from', args }), builder) };
  // The fake implements only what places.ts calls, so it is cast to the client type.
  return { client: client as unknown as PlacesClient, calls };
}

describe('fetchApprovedPlaces', () => {
  it('reads the public columns of approved places only, by name, up to the limit', async () => {
    const rows = [{ id: '5eed0000-0000-4000-8000-000000000001', name: 'Sample (sample)' }];
    const { client, calls } = fakeClient({ data: rows, error: null });

    await expect(fetchApprovedPlaces(client)).resolves.toEqual({ ok: true, data: rows });
    expect(calls).toEqual([
      { method: 'from', args: ['places'] },
      { method: 'select', args: [PUBLIC_PLACE_SELECT] },
      { method: 'eq', args: ['status', 'approved'] },
      { method: 'order', args: ['name'] },
      { method: 'limit', args: [PUBLIC_PLACES_LIMIT] },
      { method: 'overrideTypes', args: [] },
    ]);
    expect(PUBLIC_PLACES_LIMIT).toBe(200);
  });

  it('returns an empty list when there is no data', async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(fetchApprovedPlaces(client)).resolves.toEqual({ ok: true, data: [] });
  });

  it('returns a plain message, not the database message, on an error', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'XX000', message: 'raw database text' } });
    await expect(fetchApprovedPlaces(client)).resolves.toEqual({ ok: false, message: copy.results.loadFailed });
  });

  it('never throws when the request itself rejects', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('Network request failed')));
    await expect(fetchApprovedPlaces(client)).resolves.toEqual({ ok: false, message: copy.results.loadFailed });
  });
});

const PLACE_ID = '5eed0000-0000-4000-8000-000000000001';

describe('isPlaceId', () => {
  it.each([PLACE_ID, PLACE_ID.toUpperCase(), '5EED0000-0000-4000-8000-00000000000a'])('accepts %p', (id) => {
    expect(isPlaceId(id)).toBe(true);
  });

  it.each([
    'abc',
    '',
    undefined,
    null,
    42,
    [PLACE_ID],
    '5eed0000-0000-4000-8000-00000000001',
    '5eed0000-0000-4000-8000-0000000000012',
    ` ${PLACE_ID}`,
    `${PLACE_ID}\n`,
    '5eed0000-0000-4000-8000-00000000000g',
  ])('rejects %p', (id) => {
    expect(isPlaceId(id)).toBe(false);
  });
});

describe('fetchApprovedPlace', () => {
  it('reads the public columns of one approved place by id', async () => {
    const row = { id: PLACE_ID, name: 'Sample (sample)', status: 'approved' };
    const { client, calls } = fakeClient({ data: row, error: null });

    await expect(fetchApprovedPlace(client, PLACE_ID)).resolves.toEqual({ ok: true, place: row });
    expect(calls).toEqual([
      { method: 'from', args: ['places'] },
      { method: 'select', args: [PUBLIC_PLACE_SELECT] },
      { method: 'eq', args: ['id', PLACE_ID] },
      { method: 'eq', args: ['status', 'approved'] },
      { method: 'maybeSingle', args: [] },
      { method: 'overrideTypes', args: [] },
    ]);
  });

  it('is not found when there is no approved row', async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(fetchApprovedPlace(client, PLACE_ID)).resolves.toEqual({ ok: true, place: null });
  });

  it.each(['abc', '', undefined, ['a', 'b'], '5eed0000-0000-4000-8000-00000000001'])(
    'is not found for the malformed id %p, without a request',
    async (id) => {
      const { client, calls } = fakeClient({ data: null, error: null });
      await expect(fetchApprovedPlace(client, id)).resolves.toEqual({ ok: true, place: null });
      expect(calls).toEqual([]);
    },
  );

  it('is not found when the database says the id is not a uuid (22P02)', async () => {
    const { client } = fakeClient({ data: null, error: { code: '22P02', message: 'invalid input syntax for type uuid' } });
    await expect(fetchApprovedPlace(client, PLACE_ID)).resolves.toEqual({ ok: true, place: null });
  });

  it('returns a plain message, not the database message, on any other error', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'XX000', message: 'raw database text' } });
    await expect(fetchApprovedPlace(client, PLACE_ID)).resolves.toEqual({ ok: false, message: copy.place.loadFailed });
  });

  it('never throws when the request itself rejects', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('Network request failed')));
    await expect(fetchApprovedPlace(client, PLACE_ID)).resolves.toEqual({ ok: false, message: copy.place.loadFailed });
  });
});

const OTHER_ID = '5eed0000-0000-4000-8000-000000000002';

describe('fetchApprovedPlacesByIds', () => {
  it('reads the public columns of the approved places with those ids', async () => {
    const rows = [{ id: PLACE_ID, name: 'Sample (sample)', status: 'approved' }];
    const { client, calls } = fakeClient({ data: rows, error: null });

    await expect(fetchApprovedPlacesByIds(client, [PLACE_ID, OTHER_ID])).resolves.toEqual({ ok: true, data: rows });
    expect(calls).toEqual([
      { method: 'from', args: ['places'] },
      { method: 'select', args: [PUBLIC_PLACE_SELECT] },
      { method: 'in', args: ['id', [PLACE_ID, OTHER_ID]] },
      { method: 'eq', args: ['status', 'approved'] },
      { method: 'limit', args: [2] },
      { method: 'overrideTypes', args: [] },
    ]);
  });

  it.each([[[]], [['abc', '', '5eed0000-0000-4000-8000-00000000001']]])(
    'makes no request and returns nothing for %p',
    async (ids) => {
      const { client, calls } = fakeClient({ data: null, error: null });
      await expect(fetchApprovedPlacesByIds(client, ids)).resolves.toEqual({ ok: true, data: [] });
      expect(calls).toEqual([]);
    },
  );

  it('leaves malformed and duplicate ids out of the request', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await fetchApprovedPlacesByIds(client, ['abc', PLACE_ID, `${PLACE_ID} `, PLACE_ID, OTHER_ID]);
    expect(calls).toContainEqual({ method: 'in', args: ['id', [PLACE_ID, OTHER_ID]] });
    expect(calls).toContainEqual({ method: 'limit', args: [2] });
  });

  it('returns an empty list when there is no data', async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(fetchApprovedPlacesByIds(client, [PLACE_ID])).resolves.toEqual({ ok: true, data: [] });
  });

  it('returns a plain message, not the database message, on an error', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'XX000', message: 'raw database text' } });
    await expect(fetchApprovedPlacesByIds(client, [PLACE_ID])).resolves.toEqual({
      ok: false,
      message: copy.shortlist.loadFailed,
    });
  });

  it('never throws when the request itself rejects', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('Network request failed')));
    await expect(fetchApprovedPlacesByIds(client, [PLACE_ID])).resolves.toEqual({
      ok: false,
      message: copy.shortlist.loadFailed,
    });
  });
});
