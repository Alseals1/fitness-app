/**
 * Sign-in and sign-up logic with no React and no Supabase client, so jest can test it directly.
 */

/** The same shape the database checks for contact_email. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The shortest password a business account may have. */
export const PASSWORD_MIN = 8;

/** Input limits: the longest email address, and the most a password hash uses (bcrypt). */
export const EMAIL_MAX = 254;
export const PASSWORD_MAX = 72;

export const AUTH_MESSAGES = {
  emailInvalid: 'Enter a valid email address.',
  passwordMissing: 'Enter your password.',
  passwordTooShort: `Use at least ${PASSWORD_MIN} characters for your password.`,
  weakPassword: `Choose a harder-to-guess password of at least ${PASSWORD_MIN} characters.`,
  emailTaken: 'An account with this email already exists. Sign in instead.',
  wrongCredentials: 'Wrong email or password.',
  emailNotConfirmed: 'This account is not confirmed yet.',
  tooManyAttempts: 'Too many attempts. Wait a minute and try again.',
  network: "Can't reach the server. Check your connection.",
  generic: 'Something went wrong. Please try again.',
} as const;

export type CredentialsResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

/** Checks the sign-in form. The email is trimmed and lowercased; the password is kept as typed. */
export function validateCredentials(email: string, password: string): CredentialsResult {
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    return { ok: false, error: AUTH_MESSAGES.emailInvalid };
  }
  if (password.length === 0) {
    return { ok: false, error: AUTH_MESSAGES.passwordMissing };
  }
  return { ok: true, email: cleanEmail, password };
}

/** The parts of a Supabase AuthError that the mapping needs. */
export type AuthErrorLike = {
  name?: string;
  code?: string;
  status?: number;
  message?: string;
};

/**
 * Turns a Supabase auth error into plain words. It never repeats the error's own message,
 * so nothing the user typed can be echoed back.
 */
export function authErrorMessage(error: AuthErrorLike | null | undefined): string {
  if (!error) return AUTH_MESSAGES.generic;
  if (error.code === 'invalid_credentials') return AUTH_MESSAGES.wrongCredentials;
  if (error.code === 'email_not_confirmed') return AUTH_MESSAGES.emailNotConfirmed;
  if (error.code === 'over_request_rate_limit' || error.status === 429) {
    return AUTH_MESSAGES.tooManyAttempts;
  }
  // supabase-js reports a failed fetch as AuthRetryableFetchError, with status 0 when the
  // request never reached the server.
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return AUTH_MESSAGES.network;
  }
  // Older servers send 400 without a code for a wrong email or password.
  if (error.status === 400) return AUTH_MESSAGES.wrongCredentials;
  return AUTH_MESSAGES.generic;
}

/** Checks the sign-up form, before any request. Same email rules as sign-in, plus a minimum password length. */
export function validateSignUp(email: string, password: string): CredentialsResult {
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    return { ok: false, error: AUTH_MESSAGES.emailInvalid };
  }
  if (password.length < PASSWORD_MIN) {
    return { ok: false, error: AUTH_MESSAGES.passwordTooShort };
  }
  return { ok: true, email: cleanEmail, password };
}

/**
 * Turns a Supabase sign-up error into plain words. Like authErrorMessage, it never repeats
 * the error's own message.
 */
export function signUpErrorMessage(error: AuthErrorLike | null | undefined): string {
  if (!error) return AUTH_MESSAGES.generic;
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return AUTH_MESSAGES.emailTaken;
  }
  if (error.code === 'weak_password') return AUTH_MESSAGES.weakPassword;
  if (error.code === 'email_address_invalid') return AUTH_MESSAGES.emailInvalid;
  if (
    error.code === 'over_email_send_rate_limit' ||
    error.code === 'over_request_rate_limit' ||
    error.status === 429
  ) {
    return AUTH_MESSAGES.tooManyAttempts;
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return AUTH_MESSAGES.network;
  }
  return AUTH_MESSAGES.generic;
}

/** What the sign-up screen shows after the request. */
export type SignUpOutcome =
  | { kind: 'error'; message: string }
  /** Email confirmation is on: no session yet. */
  | { kind: 'confirmEmail' }
  /** Signed in at once; the sign-up guard turns false and the router returns home. */
  | { kind: 'signedIn' };

export function signUpOutcome(result: { error: AuthErrorLike | null; needsConfirmation: boolean }): SignUpOutcome {
  if (result.error) return { kind: 'error', message: signUpErrorMessage(result.error) };
  return result.needsConfirmation ? { kind: 'confirmEmail' } : { kind: 'signedIn' };
}
