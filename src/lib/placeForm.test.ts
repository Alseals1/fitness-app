import { firstErrorField } from './formErrors';
import {
  emptyPlaceFields,
  emptyPlaceForm,
  PLACE_FIELD_ORDER,
  PLACE_FORM_MESSAGES,
  PLACE_LIMITS,
  validatePlaceFields,
  validatePlaceForm,
  type PlaceFormValues,
} from './placeForm';

const valid: PlaceFormValues = {
  ...emptyPlaceForm,
  name: 'Sample Studio (sample)',
  category: 'studio',
  area: 'homewood',
  price_range: 'moderate',
  contact_phone: '205-555-0100',
};

function errorsFor(values: Partial<PlaceFormValues>) {
  const result = validatePlaceForm({ ...valid, ...values });
  return result.ok ? {} : result.errors;
}

describe('validatePlaceForm', () => {
  it('builds the admin_create_place arguments, pending by default', () => {
    expect(validatePlaceForm(valid)).toEqual({
      ok: true,
      args: {
        p_name: 'Sample Studio (sample)',
        p_category: 'studio',
        p_area: 'homewood',
        p_price_range: 'moderate',
        p_description: undefined,
        p_schedule: undefined,
        p_website_url: undefined,
        p_contact_phone: '205-555-0100',
        p_contact_email: undefined,
        p_instagram_handle: undefined,
        p_tags: [],
        p_status: 'pending',
        p_is_verified: false,
      },
    });
  });

  it('approves at once and marks verified when the switches are on', () => {
    const result = validatePlaceForm({ ...valid, approveNow: true, verified: true });
    expect(result.ok && [result.args.p_status, result.args.p_is_verified]).toEqual(['approved', true]);
  });

  it('trims text, turns empty optional fields into undefined and removes duplicate tags', () => {
    const result = validatePlaceForm({
      ...valid,
      name: '  Sample Studio (sample)  ',
      description: '   ',
      schedule: ' Mon 6am ',
      contact_email: '  hello@example.com ',
      tags: ['yoga', 'drop_in', 'yoga'],
    });
    expect(result.ok && result.args).toMatchObject({
      p_name: 'Sample Studio (sample)',
      p_description: undefined,
      p_schedule: 'Mon 6am',
      p_contact_email: 'hello@example.com',
      p_tags: ['yoga', 'drop_in'],
    });
  });

  it('requires a name of 1 to 120 characters', () => {
    expect(errorsFor({ name: '   ' }).name).toBe(PLACE_FORM_MESSAGES.nameRequired);
    expect(errorsFor({ name: 'x'.repeat(120) }).name).toBeUndefined();
    expect(errorsFor({ name: 'x'.repeat(121) }).name).toBe(PLACE_FORM_MESSAGES.nameTooLong);
  });

  it('requires category, area and price range', () => {
    expect(errorsFor({ category: null, area: null, price_range: null })).toEqual({
      category: PLACE_FORM_MESSAGES.categoryRequired,
      area: PLACE_FORM_MESSAGES.areaRequired,
      price_range: PLACE_FORM_MESSAGES.priceRequired,
    });
  });

  it('limits the description to 2000 and the schedule to 500 characters', () => {
    expect(errorsFor({ description: 'x'.repeat(2000), schedule: 'x'.repeat(500) })).toEqual({});
    expect(errorsFor({ description: 'x'.repeat(2001) }).description).toBe(PLACE_FORM_MESSAGES.descriptionTooLong);
    expect(errorsFor({ schedule: 'x'.repeat(501) }).schedule).toBe(PLACE_FORM_MESSAGES.scheduleTooLong);
  });

  it('needs the website to start with http:// or https://, in any case', () => {
    expect(errorsFor({ website_url: 'https://example.com' }).website_url).toBeUndefined();
    expect(errorsFor({ website_url: 'HTTP://example.com' }).website_url).toBeUndefined();
    expect(errorsFor({ website_url: 'example.com' }).website_url).toBe(PLACE_FORM_MESSAGES.websiteInvalid);
    expect(errorsFor({ website_url: 'ftp://example.com' }).website_url).toBe(PLACE_FORM_MESSAGES.websiteInvalid);
  });

  it('needs a phone of 7 to 32 characters', () => {
    expect(errorsFor({ contact_phone: '555-010' }).contact_phone).toBeUndefined();
    expect(errorsFor({ contact_phone: '555-01' }).contact_phone).toBe(PLACE_FORM_MESSAGES.phoneInvalid);
    expect(errorsFor({ contact_phone: '1'.repeat(32) }).contact_phone).toBeUndefined();
    expect(errorsFor({ contact_phone: '1'.repeat(33) }).contact_phone).toBe(PLACE_FORM_MESSAGES.phoneInvalid);
  });

  it('checks the email shape', () => {
    expect(errorsFor({ contact_email: 'hello@example.com' }).contact_email).toBeUndefined();
    for (const email of ['hello', 'hello@example', 'a b@example.com', '@example.com']) {
      expect(errorsFor({ contact_email: email }).contact_email).toBe(PLACE_FORM_MESSAGES.emailInvalid);
    }
  });

  it('drops a leading @ from the Instagram handle and checks it', () => {
    const result = validatePlaceForm({ ...valid, instagram_handle: ' @sample_studio.bham ' });
    expect(result.ok && result.args.p_instagram_handle).toBe('sample_studio.bham');
    expect(errorsFor({ instagram_handle: 'x'.repeat(30) }).instagram_handle).toBeUndefined();
    expect(errorsFor({ instagram_handle: 'x'.repeat(31) }).instagram_handle).toBe(
      PLACE_FORM_MESSAGES.instagramInvalid,
    );
    expect(errorsFor({ instagram_handle: 'has space' }).instagram_handle).toBe(PLACE_FORM_MESSAGES.instagramInvalid);
  });

  it('needs at least one contact method', () => {
    expect(errorsFor({ contact_phone: '' }).contact).toBe(PLACE_FORM_MESSAGES.contactRequired);
    expect(errorsFor({ contact_phone: '', instagram_handle: '@' }).contact).toBe(PLACE_FORM_MESSAGES.contactRequired);
    for (const contact of [
      { website_url: 'https://example.com' },
      { contact_email: 'hello@example.com' },
      { instagram_handle: 'sample' },
    ]) {
      expect(errorsFor({ contact_phone: '', ...contact }).contact).toBeUndefined();
    }
  });

  it('reports every problem at once', () => {
    expect(Object.keys(errorsFor({ ...emptyPlaceForm })).sort()).toEqual(
      ['area', 'category', 'contact', 'name', 'price_range'].sort(),
    );
  });
});

describe('validatePlaceFields', () => {
  const fields = {
    ...emptyPlaceFields,
    name: ' Sample Gym (sample) ',
    category: 'gym' as const,
    area: 'hoover' as const,
    price_range: 'budget' as const,
    instagram_handle: '@sample_gym',
  };

  it('returns the cleaned place fields, with no status or verified key', () => {
    const result = validatePlaceFields(fields);
    expect(result).toEqual({
      ok: true,
      fields: {
        p_name: 'Sample Gym (sample)',
        p_category: 'gym',
        p_area: 'hoover',
        p_price_range: 'budget',
        p_description: undefined,
        p_schedule: undefined,
        p_website_url: undefined,
        p_contact_phone: undefined,
        p_contact_email: undefined,
        p_instagram_handle: 'sample_gym',
        p_tags: [],
      },
    });
    expect(result.ok && Object.keys(result.fields)).not.toEqual(
      expect.arrayContaining(['p_status', 'p_is_verified']),
    );
  });

  it('gives the same errors as validatePlaceForm', () => {
    const result = validatePlaceFields({ ...emptyPlaceFields });
    const form = validatePlaceForm({ ...emptyPlaceForm });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual(!form.ok && form.errors);
  });

  it(`limits the website to ${PLACE_LIMITS.websiteMax} characters`, () => {
    const base = 'https://example.com/';
    const ok = validatePlaceFields({ ...fields, website_url: base + 'x'.repeat(PLACE_LIMITS.websiteMax - base.length) });
    expect(ok.ok).toBe(true);
    const long = validatePlaceFields({ ...fields, website_url: base + 'x'.repeat(PLACE_LIMITS.websiteMax) });
    expect(!long.ok && long.errors.website_url).toBe(PLACE_FORM_MESSAGES.websiteTooLong);
  });

  it(`limits the email to ${PLACE_LIMITS.emailMax} characters`, () => {
    const long = validatePlaceFields({ ...fields, contact_email: 'x'.repeat(PLACE_LIMITS.emailMax) + '@example.com' });
    expect(!long.ok && long.errors.contact_email).toBe(PLACE_FORM_MESSAGES.emailInvalid);
  });
});

describe('PLACE_FIELD_ORDER', () => {
  /** Every field the check can flag: the empty form, plus a form where every value is bad. */
  function everyErrorKey() {
    const empty = validatePlaceFields({ ...emptyPlaceFields });
    const bad = validatePlaceFields({
      ...emptyPlaceFields,
      description: 'x'.repeat(PLACE_LIMITS.descriptionMax + 1),
      schedule: 'x'.repeat(PLACE_LIMITS.scheduleMax + 1),
      website_url: 'example.com',
      contact_phone: '1',
      contact_email: 'not an email',
      instagram_handle: 'not a handle!',
    });
    return new Set([...Object.keys(!empty.ok ? empty.errors : {}), ...Object.keys(!bad.ok ? bad.errors : {})]);
  }

  it('lists every field the check can flag', () => {
    const keys = everyErrorKey();
    expect(keys.size).toBe(PLACE_FIELD_ORDER.length);
    for (const key of keys) expect(PLACE_FIELD_ORDER).toContain(key);
  });

  it('has no duplicates', () => {
    expect(new Set(PLACE_FIELD_ORDER).size).toBe(PLACE_FIELD_ORDER.length);
  });

  it('puts category first on the empty form', () => {
    const result = validatePlaceFields({ ...emptyPlaceFields });
    expect(!result.ok && firstErrorField(result.errors, PLACE_FIELD_ORDER)).toBe('category');
  });
});
