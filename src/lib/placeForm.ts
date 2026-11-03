import type { Database, Enums } from './database.types';

/**
 * The place fields shared by the admin's "Add a place" form and the business form: their
 * values, and a check that mirrors the check constraints on public.places, so most mistakes
 * are caught before the database sees them. The database still has the final say.
 */

export type CreatePlaceArgs = Database['public']['Functions']['admin_create_place']['Args'];

/** The cleaned place fields, as `p_*` arguments. Both admin_create_place and submit_new_place take these. */
export type PlaceFields = Omit<CreatePlaceArgs, 'p_status' | 'p_is_verified'>;

/** The place fields a person types or picks. */
export type PlaceFieldValues = {
  name: string;
  category: Enums<'place_category'> | null;
  area: Enums<'place_area'> | null;
  price_range: Enums<'price_range'> | null;
  description: string;
  schedule: string;
  website_url: string;
  contact_phone: string;
  contact_email: string;
  instagram_handle: string;
  tags: Enums<'place_tag'>[];
};

/** The admin's form: the place fields, plus two switches only an admin has. */
export type PlaceFormValues = PlaceFieldValues & {
  /** On: the place is public at once. Off (the default): it waits in the queue. */
  approveNow: boolean;
  /** Only with proof (PRD: never show a verified mark without it). */
  verified: boolean;
};

export type PlaceFormField = Exclude<keyof PlaceFieldValues, 'tags'> | 'contact';

export type PlaceFormErrors = Partial<Record<PlaceFormField, string>>;

export type PlaceFieldsResult = { ok: true; fields: PlaceFields } | { ok: false; errors: PlaceFormErrors };

export type PlaceFormResult = { ok: true; args: CreatePlaceArgs } | { ok: false; errors: PlaceFormErrors };

export const emptyPlaceFields: PlaceFieldValues = {
  name: '',
  category: null,
  area: null,
  price_range: null,
  description: '',
  schedule: '',
  website_url: '',
  contact_phone: '',
  contact_email: '',
  instagram_handle: '',
  tags: [],
};

export const emptyPlaceForm: PlaceFormValues = {
  ...emptyPlaceFields,
  approveNow: false,
  verified: false,
};

/** Limits and patterns from supabase/migrations/*_create_places.sql. */
export const PLACE_LIMITS = {
  nameMax: 120,
  descriptionMax: 2000,
  scheduleMax: 500,
  phoneMin: 7,
  phoneMax: 32,
  /** Not limited by a table constraint; checked by submit_new_place. */
  websiteMax: 2048,
  emailMax: 254,
  instagramMax: 30,
} as const;

export const WEBSITE_PATTERN = /^https?:\/\//i;
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const INSTAGRAM_PATTERN = /^[A-Za-z0-9._]{1,30}$/;

export const PLACE_FORM_MESSAGES = {
  nameRequired: 'Enter a name.',
  nameTooLong: `Keep the name to ${PLACE_LIMITS.nameMax} characters or less.`,
  categoryRequired: 'Choose a category.',
  areaRequired: 'Choose a part of town.',
  priceRequired: 'Choose a price range.',
  descriptionTooLong: `Keep the description to ${PLACE_LIMITS.descriptionMax} characters or less.`,
  scheduleTooLong: `Keep the schedule to ${PLACE_LIMITS.scheduleMax} characters or less.`,
  websiteInvalid: 'Start the website with http:// or https://.',
  websiteTooLong: `Keep the website to ${PLACE_LIMITS.websiteMax} characters or less.`,
  phoneInvalid: `Enter a phone number of ${PLACE_LIMITS.phoneMin} to ${PLACE_LIMITS.phoneMax} characters.`,
  emailInvalid: 'Enter a valid email address.',
  instagramInvalid: 'Use up to 30 letters, numbers, dots or underscores.',
  contactRequired: 'Add at least one way to get in touch: website, phone, email or Instagram.',
} as const;

/** Trims a text input; an empty one becomes undefined, so the database stores null. */
function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Checks and cleans the place fields. */
export function validatePlaceFields(values: PlaceFieldValues): PlaceFieldsResult {
  const errors: PlaceFormErrors = {};

  const name = values.name.trim();
  if (name.length === 0) errors.name = PLACE_FORM_MESSAGES.nameRequired;
  else if (name.length > PLACE_LIMITS.nameMax) errors.name = PLACE_FORM_MESSAGES.nameTooLong;

  if (!values.category) errors.category = PLACE_FORM_MESSAGES.categoryRequired;
  if (!values.area) errors.area = PLACE_FORM_MESSAGES.areaRequired;
  if (!values.price_range) errors.price_range = PLACE_FORM_MESSAGES.priceRequired;

  const description = optional(values.description);
  if (description && description.length > PLACE_LIMITS.descriptionMax) {
    errors.description = PLACE_FORM_MESSAGES.descriptionTooLong;
  }

  const schedule = optional(values.schedule);
  if (schedule && schedule.length > PLACE_LIMITS.scheduleMax) {
    errors.schedule = PLACE_FORM_MESSAGES.scheduleTooLong;
  }

  const website = optional(values.website_url);
  if (website && !WEBSITE_PATTERN.test(website)) errors.website_url = PLACE_FORM_MESSAGES.websiteInvalid;
  else if (website && website.length > PLACE_LIMITS.websiteMax) errors.website_url = PLACE_FORM_MESSAGES.websiteTooLong;

  const phone = optional(values.contact_phone);
  if (phone && (phone.length < PLACE_LIMITS.phoneMin || phone.length > PLACE_LIMITS.phoneMax)) {
    errors.contact_phone = PLACE_FORM_MESSAGES.phoneInvalid;
  }

  const email = optional(values.contact_email);
  if (email && (email.length > PLACE_LIMITS.emailMax || !EMAIL_PATTERN.test(email))) {
    errors.contact_email = PLACE_FORM_MESSAGES.emailInvalid;
  }

  // Stored without the leading '@'.
  const instagram = optional(values.instagram_handle.trim().replace(/^@/, ''));
  if (instagram && !INSTAGRAM_PATTERN.test(instagram)) {
    errors.instagram_handle = PLACE_FORM_MESSAGES.instagramInvalid;
  }

  if (!website && !phone && !email && !instagram) errors.contact = PLACE_FORM_MESSAGES.contactRequired;

  if (Object.keys(errors).length > 0 || !values.category || !values.area || !values.price_range) {
    return { ok: false, errors };
  }

  const fields: PlaceFields = {
    p_name: name,
    p_category: values.category,
    p_area: values.area,
    p_price_range: values.price_range,
    p_description: description,
    p_schedule: schedule,
    p_website_url: website,
    p_contact_phone: phone,
    p_contact_email: email,
    p_instagram_handle: instagram,
    p_tags: [...new Set(values.tags)],
  };
  return { ok: true, fields };
}

/** The admin's form: the place fields, plus the status and verified switches. */
export function validatePlaceForm(values: PlaceFormValues): PlaceFormResult {
  const checked = validatePlaceFields(values);
  if (!checked.ok) return checked;
  const args: CreatePlaceArgs = {
    ...checked.fields,
    p_status: values.approveNow ? 'approved' : 'pending',
    p_is_verified: values.verified,
  };
  return { ok: true, args };
}
