import { AUTH_MESSAGES, authErrorMessage, validateCredentials } from './auth';

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
