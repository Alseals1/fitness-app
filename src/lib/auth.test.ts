import {
  AUTH_MESSAGES,
  authErrorMessage,
  PASSWORD_MIN,
  signUpErrorMessage,
  signUpOutcome,
  validateCredentials,
  validateSignUp,
} from './auth';

describe('validateCredentials', () => {
  it('trims and lowercases the email and keeps the password as typed', () => {
    expect(validateCredentials('  Admin@Example.COM ', ' secret ')).toEqual({
      ok: true,
      email: 'admin@example.com',
      password: ' secret ',
    });
  });

  it.each(['', '   ', 'admin', 'admin@', 'admin@example', '@example.com', 'a b@example.com'])(
    'refuses the email %p',
    (email) => {
      expect(validateCredentials(email, 'secret')).toEqual({
        ok: false,
        error: AUTH_MESSAGES.emailInvalid,
      });
    },
  );

  it('requires a password', () => {
    expect(validateCredentials('admin@example.com', '')).toEqual({
      ok: false,
      error: AUTH_MESSAGES.passwordMissing,
    });
  });
});

describe('authErrorMessage', () => {
  it('maps wrong credentials', () => {
    expect(authErrorMessage({ name: 'AuthApiError', code: 'invalid_credentials', status: 400 })).toBe(
      AUTH_MESSAGES.wrongCredentials,
    );
    expect(authErrorMessage({ name: 'AuthApiError', status: 400 })).toBe(
      AUTH_MESSAGES.wrongCredentials,
    );
  });

  it('maps an unconfirmed email', () => {
    expect(authErrorMessage({ code: 'email_not_confirmed', status: 400 })).toBe(
      AUTH_MESSAGES.emailNotConfirmed,
    );
  });

  it('maps rate limits', () => {
    expect(authErrorMessage({ code: 'over_request_rate_limit', status: 429 })).toBe(
      AUTH_MESSAGES.tooManyAttempts,
    );
    expect(authErrorMessage({ status: 429 })).toBe(AUTH_MESSAGES.tooManyAttempts);
  });

  it('maps network failures', () => {
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      AUTH_MESSAGES.network,
    );
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 503 })).toBe(
      AUTH_MESSAGES.network,
    );
  });

  it('falls back to a generic message', () => {
    expect(authErrorMessage({ status: 500 })).toBe(AUTH_MESSAGES.generic);
    expect(authErrorMessage(null)).toBe(AUTH_MESSAGES.generic);
    expect(authErrorMessage(undefined)).toBe(AUTH_MESSAGES.generic);
  });

  it('never echoes the error message', () => {
    const typed = 'hunter2-typed-password';
    const message = authErrorMessage({ status: 500, message: `bad password ${typed}` });
    expect(message).not.toContain(typed);
  });
});

describe('validateSignUp', () => {
  it('trims and lowercases the email and keeps the password as typed', () => {
    expect(validateSignUp('  Owner@Example.COM ', ' long secret ')).toEqual({
      ok: true,
      email: 'owner@example.com',
      password: ' long secret ',
    });
  });

  it.each(['', 'owner', 'owner@example', 'a b@example.com'])('refuses the email %p', (email) => {
    expect(validateSignUp(email, 'long enough')).toEqual({ ok: false, error: AUTH_MESSAGES.emailInvalid });
  });

  it(`needs a password of at least ${PASSWORD_MIN} characters`, () => {
    expect(validateSignUp('owner@example.com', 'x'.repeat(PASSWORD_MIN - 1))).toEqual({
      ok: false,
      error: AUTH_MESSAGES.passwordTooShort,
    });
    expect(validateSignUp('owner@example.com', '')).toEqual({
      ok: false,
      error: AUTH_MESSAGES.passwordTooShort,
    });
    expect(validateSignUp('owner@example.com', 'x'.repeat(PASSWORD_MIN)).ok).toBe(true);
  });

  it('checks the email before the password', () => {
    expect(validateSignUp('nope', '')).toEqual({ ok: false, error: AUTH_MESSAGES.emailInvalid });
  });
});

describe('signUpErrorMessage', () => {
  it.each([
    [{ code: 'user_already_exists', status: 422 }, AUTH_MESSAGES.emailTaken],
    [{ code: 'email_exists', status: 422 }, AUTH_MESSAGES.emailTaken],
    [{ code: 'weak_password', status: 422 }, AUTH_MESSAGES.weakPassword],
    [{ code: 'email_address_invalid', status: 400 }, AUTH_MESSAGES.emailInvalid],
    [{ code: 'over_email_send_rate_limit', status: 429 }, AUTH_MESSAGES.tooManyAttempts],
    [{ code: 'over_request_rate_limit', status: 429 }, AUTH_MESSAGES.tooManyAttempts],
    [{ status: 429 }, AUTH_MESSAGES.tooManyAttempts],
    [{ name: 'AuthRetryableFetchError', status: 0 }, AUTH_MESSAGES.network],
    [{ status: 500 }, AUTH_MESSAGES.generic],
    [{ status: 400 }, AUTH_MESSAGES.generic],
  ])('maps %p', (error, message) => {
    expect(signUpErrorMessage(error)).toBe(message);
  });

  it('falls back to a generic message without an error', () => {
    expect(signUpErrorMessage(null)).toBe(AUTH_MESSAGES.generic);
    expect(signUpErrorMessage(undefined)).toBe(AUTH_MESSAGES.generic);
  });

  it('never echoes the error message', () => {
    const typed = 'owner-typed-secret';
    expect(signUpErrorMessage({ status: 500, message: typed })).not.toContain(typed);
    expect(signUpErrorMessage({ code: 'weak_password', message: typed })).not.toContain(typed);
  });
});

describe('signUpOutcome', () => {
  it('shows a mapped error', () => {
    expect(signUpOutcome({ error: { code: 'user_already_exists' }, needsConfirmation: false })).toEqual({
      kind: 'error',
      message: AUTH_MESSAGES.emailTaken,
    });
  });

  it('asks to confirm the email when there is no session', () => {
    expect(signUpOutcome({ error: null, needsConfirmation: true })).toEqual({ kind: 'confirmEmail' });
  });

  it('is signed in when there is a session', () => {
    expect(signUpOutcome({ error: null, needsConfirmation: false })).toEqual({ kind: 'signedIn' });
  });
});
