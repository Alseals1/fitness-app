import {
  BUSINESS_FORM_MESSAGES,
  emptyVerification,
  validateClaim,
  validateNewListing,
  validateVerification,
  VERIFICATION_LIMITS,
  type VerificationValues,
} from './businessForm';
import { emptyPlaceFields, PLACE_FORM_MESSAGES, type PlaceFieldValues } from './placeForm';

const place: PlaceFieldValues = {
  ...emptyPlaceFields,
  name: 'Sample Trainer (sample)',
  category: 'trainer',
  area: 'hoover',
  price_range: 'premium',
  instagram_handle: '@sample_trainer',
};

const verification: VerificationValues = {
  ...emptyVerification,
  verification_email: ' owner@example.com ',
};

/** Every argument submit_new_place and submit_place_claim accept. Nothing else may be sent. */
const NEW_PLACE_KEYS = [
  'p_name',
  'p_category',
  'p_area',
  'p_price_range',
  'p_description',
  'p_schedule',
  'p_website_url',
  'p_contact_phone',
  'p_contact_email',
  'p_instagram_handle',
  'p_tags',
  'p_verification_email',
  'p_verification_social',
  'p_certification_name',
  'p_note',
];
const CLAIM_KEYS = ['p_place_id', 'p_verification_email', 'p_verification_social', 'p_certification_name', 'p_note'];
const FORBIDDEN = /status|verified|certified|claimed|sponsor|submitted_by/;

function verificationErrors(values: Partial<VerificationValues>, category: PlaceFieldValues['category'] = 'trainer') {
  const result = validateVerification({ ...verification, ...values }, category);
  return result.ok ? {} : result.errors;
}

describe('validateVerification', () => {
  it('trims the details and turns empty ones into undefined', () => {
    expect(validateVerification({ ...verification, note: '  Call me after 5.  ' }, 'gym')).toEqual({
      ok: true,
      args: {
        p_verification_email: 'owner@example.com',
        p_verification_social: undefined,
        p_certification_name: undefined,
        p_note: 'Call me after 5.',
      },
    });
  });

  it('needs a business email or a social account', () => {
    expect(verificationErrors({ verification_email: '  ', verification_social: '' }).verification).toBe(
      BUSINESS_FORM_MESSAGES.verificationRequired,
    );
    expect(verificationErrors({ verification_email: '', verification_social: 'instagram.com/sample' })).toEqual({});
    expect(verificationErrors({ verification_social: 'instagram.com/sample' })).toEqual({});
  });

  it('checks the email shape and length', () => {
    for (const email of ['owner', 'owner@example', 'a b@example.com']) {
      expect(verificationErrors({ verification_email: email }).verification_email).toBe(
        BUSINESS_FORM_MESSAGES.emailInvalid,
      );
    }
    const at = '@example.com';
    expect(
      verificationErrors({ verification_email: 'x'.repeat(VERIFICATION_LIMITS.emailMax - at.length) + at }),
    ).toEqual({});
    expect(
      verificationErrors({ verification_email: 'x'.repeat(VERIFICATION_LIMITS.emailMax - at.length + 1) + at })
        .verification_email,
    ).toBe(BUSINESS_FORM_MESSAGES.emailInvalid);
  });

  it(`limits the social account to ${VERIFICATION_LIMITS.socialMax} characters on one line`, () => {
    expect(verificationErrors({ verification_social: 'x'.repeat(VERIFICATION_LIMITS.socialMax) })).toEqual({});
    expect(
      verificationErrors({ verification_social: 'x'.repeat(VERIFICATION_LIMITS.socialMax + 1) }).verification_social,
    ).toBe(BUSINESS_FORM_MESSAGES.socialTooLong);
    for (const social of ['instagram.com/a\nb', 'a\tb', 'a\u0000b', 'a\u007fb']) {
      expect(verificationErrors({ verification_social: social }).verification_social).toBe(
        BUSINESS_FORM_MESSAGES.socialInvalid,
      );
    }
  });

  it(`limits the note to ${VERIFICATION_LIMITS.noteMax} characters`, () => {
    expect(verificationErrors({ note: 'x'.repeat(VERIFICATION_LIMITS.noteMax) })).toEqual({});
    expect(verificationErrors({ note: 'x'.repeat(VERIFICATION_LIMITS.noteMax + 1) }).note).toBe(
      BUSINESS_FORM_MESSAGES.noteTooLong,
    );
  });

  it('keeps the certification name for a trainer, trimmed', () => {
    const result = validateVerification({ ...verification, certification_name: '  NASM-CPT ' }, 'trainer');
    expect(result.ok && result.args.p_certification_name).toBe('NASM-CPT');
  });

  it('drops the certification name for any other category', () => {
    for (const category of ['studio', 'gym', 'run_club', null] as const) {
      const result = validateVerification({ ...verification, certification_name: 'NASM-CPT' }, category);
      expect(result.ok && result.args.p_certification_name).toBeUndefined();
    }
  });

  it(`limits the certification name to ${VERIFICATION_LIMITS.certificationMax} characters, for trainers`, () => {
    const long = 'x'.repeat(VERIFICATION_LIMITS.certificationMax + 1);
    expect(verificationErrors({ certification_name: long }, 'trainer').certification_name).toBe(
      BUSINESS_FORM_MESSAGES.certificationTooLong,
    );
    expect(verificationErrors({ certification_name: long }, 'gym')).toEqual({});
  });
});

describe('validateNewListing', () => {
  it('builds the submit_new_place arguments from the place and verification', () => {
    const result = validateNewListing(place, { ...verification, certification_name: 'ACE' });
    expect(result).toEqual({
      ok: true,
      args: {
        p_name: 'Sample Trainer (sample)',
        p_category: 'trainer',
        p_area: 'hoover',
        p_price_range: 'premium',
        p_description: undefined,
        p_schedule: undefined,
        p_website_url: undefined,
        p_contact_phone: undefined,
        p_contact_email: undefined,
        p_instagram_handle: 'sample_trainer',
        p_tags: [],
        p_verification_email: 'owner@example.com',
        p_verification_social: undefined,
        p_certification_name: 'ACE',
        p_note: undefined,
      },
    });
  });

  it('sends only the function arguments: never status, verified, certified or claimed', () => {
    const result = validateNewListing(place, verification);
    expect(result.ok).toBe(true);
    const keys = result.ok ? Object.keys(result.args) : [];
    expect(keys.sort()).toEqual([...NEW_PLACE_KEYS].sort());
    for (const key of keys) expect(key).not.toMatch(FORBIDDEN);
  });

  it('reports place and verification problems together', () => {
    const result = validateNewListing({ ...emptyPlaceFields }, emptyVerification);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toMatchObject({
      name: PLACE_FORM_MESSAGES.nameRequired,
      contact: PLACE_FORM_MESSAGES.contactRequired,
      verification: BUSINESS_FORM_MESSAGES.verificationRequired,
    });
  });

  it('drops the certification name when the category is not trainer', () => {
    const result = validateNewListing({ ...place, category: 'studio' }, { ...verification, certification_name: 'RYT' });
    expect(result.ok && result.args.p_certification_name).toBeUndefined();
  });
});

describe('validateClaim', () => {
  const target = { id: '5eed0000-0000-4000-8000-000000000001', category: 'trainer' as const };

  it('builds the submit_place_claim arguments', () => {
    expect(validateClaim(target, { ...verification, certification_name: 'NASM-CPT' })).toEqual({
      ok: true,
      args: {
        p_place_id: target.id,
        p_verification_email: 'owner@example.com',
        p_verification_social: undefined,
        p_certification_name: 'NASM-CPT',
        p_note: undefined,
      },
    });
  });

  it('sends only the function arguments', () => {
    const result = validateClaim(target, verification);
    const keys = result.ok ? Object.keys(result.args) : [];
    expect(keys.sort()).toEqual([...CLAIM_KEYS].sort());
    for (const key of keys) expect(key).not.toMatch(FORBIDDEN);
  });

  it('needs a place', () => {
    const result = validateClaim(null, emptyVerification);
    expect(!result.ok && result.errors).toEqual({
      place: BUSINESS_FORM_MESSAGES.placeRequired,
      verification: BUSINESS_FORM_MESSAGES.verificationRequired,
    });
  });

  it('drops the certification name for a place that is not a trainer', () => {
    const result = validateClaim({ ...target, category: 'gym' }, { ...verification, certification_name: 'X' });
    expect(result.ok && result.args.p_certification_name).toBeUndefined();
  });
});
