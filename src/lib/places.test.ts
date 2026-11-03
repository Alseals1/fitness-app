import { copy } from './copy';
import {
  fetchApprovedPlaces,
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
    order: (...args: unknown[]) => (calls.push({ method: 'order', args }), builder),
    limit: (...args: unknown[]) => (calls.push({ method: 'limit', args }), builder),
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
