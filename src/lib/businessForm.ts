import { EMAIL_MAX } from './auth';
import type { Database, Enums } from './database.types';
import {
  EMAIL_PATTERN,
  validatePlaceFields,
  type PlaceFieldValues,
  type PlaceFormErrors,
} from './placeForm';
import type { PublicPlace } from './places';

/**
 * The business form: a new listing (the place fields plus verification) or a claim on an
 * approved place (verification only). The checks mirror the database's, so most mistakes
 * are caught before a request. The database still has the final say, and it forces every
 * submission to pending whatever the app sends.
 */

export type SubmitNewPlaceArgs = Database['public']['Functions']['submit_new_place']['Args'];
export type SubmitClaimArgs = Database['public']['Functions']['submit_place_claim']['Args'];

/** Limits from supabase/migrations/*_business_submissions.sql. */
export const VERIFICATION_LIMITS = {
  emailMax: EMAIL_MAX,
  socialMax: 200,
  certificationMax: 120,
  noteMax: 500,
} as const;

export const BUSINESS_FORM_MESSAGES = {
  verificationRequired: 'Add a business email or an official social account, so we can check the place is yours.',
  emailInvalid: 'Enter a valid email address.',
  socialTooLong: `Keep the social account to ${VERIFICATION_LIMITS.socialMax} characters or less.`,
  socialInvalid: 'Use the address or name of the account, on one line.',
  certificationTooLong: `Keep the certification name to ${VERIFICATION_LIMITS.certificationMax} characters or less.`,
  noteTooLong: `Keep the note to ${VERIFICATION_LIMITS.noteMax} characters or less.`,
  placeRequired: 'Choose the place you want to claim.',
} as const;

/** Private details sent with a new listing or a claim. Only an admin sees them. */
export type VerificationValues = {
  verification_email: string;
  verification_social: string;
  /** Trainers only. Optional: an admin checks proof before anything shows. */
  certification_name: string;
  note: string;
};

export const emptyVerification: VerificationValues = {
  verification_email: '',
  verification_social: '',
  certification_name: '',
  note: '',
};

export type VerificationErrors = Partial<Record<keyof VerificationValues | 'verification', string>>;

/** The verification arguments shared by submit_new_place and submit_place_claim. */
export type VerificationArgs = Pick<
  SubmitNewPlaceArgs,
  'p_verification_email' | 'p_verification_social' | 'p_certification_name' | 'p_note'
>;

export type VerificationResult = { ok: true; args: VerificationArgs } | { ok: false; errors: VerificationErrors };

/** Trims a text input; an empty one becomes undefined, so the database stores null. */
function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** True when the text has a control character (a line break, tab, ...), as Postgres [[:cntrl:]]. */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Checks the verification details. At least one contact is needed. The certification name
 * is kept only for a trainer and dropped for any other category.
 */
export function validateVerification(
  values: VerificationValues,
  category: Enums<'place_category'> | null,
): VerificationResult {
  const errors: VerificationErrors = {};

  const email = optional(values.verification_email);
  if (email && (email.length > VERIFICATION_LIMITS.emailMax || !EMAIL_PATTERN.test(email))) {
    errors.verification_email = BUSINESS_FORM_MESSAGES.emailInvalid;
  }

  const social = optional(values.verification_social);
  if (social && social.length > VERIFICATION_LIMITS.socialMax) {
    errors.verification_social = BUSINESS_FORM_MESSAGES.socialTooLong;
  } else if (social && hasControlCharacter(social)) {
    errors.verification_social = BUSINESS_FORM_MESSAGES.socialInvalid;
  }

  if (!email && !social) errors.verification = BUSINESS_FORM_MESSAGES.verificationRequired;

  const certification = category === 'trainer' ? optional(values.certification_name) : undefined;
  if (certification && certification.length > VERIFICATION_LIMITS.certificationMax) {
    errors.certification_name = BUSINESS_FORM_MESSAGES.certificationTooLong;
  }

  const note = optional(values.note);
  if (note && note.length > VERIFICATION_LIMITS.noteMax) errors.note = BUSINESS_FORM_MESSAGES.noteTooLong;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    args: {
      p_verification_email: email,
      p_verification_social: social,
      p_certification_name: certification,
      p_note: note,
    },
  };
}

export type BusinessFormErrors = PlaceFormErrors & VerificationErrors & { place?: string };

export type NewListingResult = { ok: true; args: SubmitNewPlaceArgs } | { ok: false; errors: BusinessFormErrors };

/** A new listing: every place field plus verification. Reports every problem at once. */
export function validateNewListing(place: PlaceFieldValues, verification: VerificationValues): NewListingResult {
  const placeResult = validatePlaceFields(place);
  const verificationResult = validateVerification(verification, place.category);
  if (!placeResult.ok || !verificationResult.ok) {
    return {
      ok: false,
      errors: {
        ...(placeResult.ok ? {} : placeResult.errors),
        ...(verificationResult.ok ? {} : verificationResult.errors),
      },
    };
  }
  return { ok: true, args: { ...placeResult.fields, ...verificationResult.args } };
}

/** The place being claimed. Only an approved place can be claimed. */
export type ClaimTarget = Pick<PublicPlace, 'id' | 'category'>;

export type ClaimResult = { ok: true; args: SubmitClaimArgs } | { ok: false; errors: BusinessFormErrors };

/** A claim on an approved place: the place's id plus verification. */
export function validateClaim(place: ClaimTarget | null, verification: VerificationValues): ClaimResult {
  const verificationResult = validateVerification(verification, place?.category ?? null);
  if (!place || !verificationResult.ok) {
    return {
      ok: false,
      errors: {
        ...(place ? {} : { place: BUSINESS_FORM_MESSAGES.placeRequired }),
        ...(verificationResult.ok ? {} : verificationResult.errors),
      },
    };
  }
  return { ok: true, args: { p_place_id: place.id, ...verificationResult.args } };
}
