/**
 * The sign-in form's field checks, with no React, so jest can test them directly. They accept
 * exactly what `validateCredentials` in `./auth` accepts (a parity test proves it), but report
 * every field's error at once, so the screen can show each one under its own field.
 */
import { AUTH_MESSAGES, EMAIL_PATTERN } from './auth';

export type SignInField = 'email' | 'password';

export type SignInFieldErrors = Partial<Record<SignInField, string>>;

export type SignInFieldsResult =
  | { ok: true; email: string; password: string }
  | { ok: false; errors: SignInFieldErrors };

/** The fields in screen order: the first invalid one gets focus after a failed submit. */
const FIELD_ORDER: readonly SignInField[] = ['email', 'password'];

/** Checks both fields. The email is trimmed and lowercased; the password is kept as typed. */
export function validateSignInFields(email: string, password: string): SignInFieldsResult {
  const cleanEmail = email.trim().toLowerCase();
  const errors: SignInFieldErrors = {};
  if (!EMAIL_PATTERN.test(cleanEmail)) errors.email = AUTH_MESSAGES.emailInvalid;
  if (password.length === 0) errors.password = AUTH_MESSAGES.passwordMissing;
  if (errors.email || errors.password) return { ok: false, errors };
  return { ok: true, email: cleanEmail, password };
}

/** The first field with an error, in screen order, or null when there is none. */
export function firstInvalidField(errors: SignInFieldErrors): SignInField | null {
  return FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}

/**
 * The errors without one field's error. Returns the same object when that field has no error,
 * so a state update with it does not re-render.
 */
export function withoutFieldError(errors: SignInFieldErrors, field: SignInField): SignInFieldErrors {
  if (!(field in errors)) return errors;
  const { [field]: _removed, ...rest } = errors;
  return rest;
}
