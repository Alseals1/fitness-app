import {
  BUSINESS_MESSAGES,
  businessErrorMessage,
  CLAIM_SEARCH_LIMIT,
  filterClaimablePlaces,
  submitClaim,
  submitNewPlace,
  type BusinessClient,
} from './business';
import type { SubmitClaimArgs, SubmitNewPlaceArgs } from './businessForm';
import type { PublicPlace } from './places';

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
  // The fake implements only what business.ts calls, so it is cast to the client type.
  return { client: client as unknown as BusinessClient, calls };
}

const NEW_ARGS: SubmitNewPlaceArgs = {
  p_name: 'Sample Gym (sample)',
  p_category: 'gym',
  p_area: 'hoover',
  p_price_range: 'budget',
  p_contact_phone: '205-555-0100',
  p_tags: [],
  p_verification_email: 'owner@example.com',
};

const CLAIM_ARGS: SubmitClaimArgs = {
  p_place_id: '5eed0000-0000-4000-8000-000000000001',
  p_verification_social: 'instagram.com/sample',
};

describe('submitNewPlace', () => {
  it('calls submit_new_place with the arguments and returns the new id', async () => {
    const { client, calls } = fakeClient({ data: 'new-id', error: null, status: 200 });
    await expect(submitNewPlace(client, NEW_ARGS)).resolves.toEqual({ ok: true, id: 'new-id' });
    expect(calls).toEqual([{ method: 'rpc', args: ['submit_new_place', NEW_ARGS] }]);
  });

  it('maps the daily limit', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'PT429', message: 'too many submissions' }, status: 429 });
    await expect(submitNewPlace(client, NEW_ARGS)).resolves.toEqual({ ok: false, message: BUSINESS_MESSAGES.tooMany });
  });

  it('returns a plain message when the call throws', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('network down')));
    await expect(submitNewPlace(client, NEW_ARGS)).resolves.toEqual({ ok: false, message: BUSINESS_MESSAGES.generic });
  });
});

describe('submitClaim', () => {
  it('calls submit_place_claim with the arguments and returns the claim id', async () => {
    const { client, calls } = fakeClient({ data: 'claim-id', error: null, status: 200 });
    await expect(submitClaim(client, CLAIM_ARGS)).resolves.toEqual({ ok: true, id: 'claim-id' });
    expect(calls).toEqual([{ method: 'rpc', args: ['submit_place_claim', CLAIM_ARGS] }]);
  });

  it('maps a second pending claim', async () => {
    const { client } = fakeClient({ data: null, error: { code: '23505', message: 'duplicate key' }, status: 409 });
    await expect(submitClaim(client, CLAIM_ARGS)).resolves.toEqual({
      ok: false,
      message: BUSINESS_MESSAGES.duplicateClaim,
    });
  });
});

describe('businessErrorMessage', () => {
  it.each([
    [{ code: 'PT429' }, undefined, BUSINESS_MESSAGES.tooMany],
    [{ code: undefined }, 429, BUSINESS_MESSAGES.tooMany],
    [{ code: '42501' }, 401, BUSINESS_MESSAGES.signIn],
    [{ code: 'P0002' }, 404, BUSINESS_MESSAGES.gone],
    [{ code: '23505' }, 409, BUSINESS_MESSAGES.duplicateClaim],
    [{ code: 'PT409' }, 409, BUSINESS_MESSAGES.alreadyYours],
    [{ code: '22023' }, 400, BUSINESS_MESSAGES.invalid],
    [{ code: '23514' }, 400, BUSINESS_MESSAGES.invalid],
    [{ code: 'XX000' }, 500, BUSINESS_MESSAGES.generic],
    [null, undefined, BUSINESS_MESSAGES.generic],
  ])('maps %p (status %p)', (error, status, message) => {
    expect(businessErrorMessage(error, status)).toBe(message);
  });

  it('never repeats the database message', () => {
    const secret = 'owner-typed <script>';
    expect(businessErrorMessage({ code: '23514', message: secret })).not.toContain(secret);
  });
});

function makePlace(id: number, name: string, status: PublicPlace['status'] = 'approved'): PublicPlace {
  return {
    id: `5eed0000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    name,
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
    status,
    is_verified: false,
    last_confirmed_at: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    is_certified: false,
    certification_name: null,
  };
}

describe('filterClaimablePlaces', () => {
  const places = [
    makePlace(1, 'Hoover Barbell (sample)'),
    makePlace(2, 'Southside Yoga (sample)'),
    makePlace(3, 'Barbell Club Pending (sample)', 'pending'),
  ];

  it('matches part of the name, ignoring case and spaces', () => {
    expect(filterClaimablePlaces(places, '  BARBELL ').map((p) => p.name)).toEqual(['Hoover Barbell (sample)']);
  });

  it('matches nothing for an empty query', () => {
    expect(filterClaimablePlaces(places, '')).toEqual([]);
    expect(filterClaimablePlaces(places, '   ')).toEqual([]);
  });

  it('never offers a place that is not approved', () => {
    expect(filterClaimablePlaces(places, 'pending')).toEqual([]);
  });

  it(`shows at most ${CLAIM_SEARCH_LIMIT} matches by default`, () => {
    const many = Array.from({ length: CLAIM_SEARCH_LIMIT + 5 }, (_, i) => makePlace(i + 10, `Gym ${i} (sample)`));
    expect(filterClaimablePlaces(many, 'gym')).toHaveLength(CLAIM_SEARCH_LIMIT);
    expect(filterClaimablePlaces(many, 'gym', 3)).toHaveLength(3);
  });
});
