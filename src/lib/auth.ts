/**
 * Sign-in logic with no React and no Supabase client, so jest can test it directly.
 */

/** The same shape the database checks for contact_email. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const AUTH_MESSAGES = {
  emailInvalid: 'Enter a valid email address.',
  passwordMissing: 'Enter your password.',
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
