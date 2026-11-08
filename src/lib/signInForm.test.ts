import { AUTH_MESSAGES, EMAIL_MAX, PASSWORD_MAX, validateCredentials } from './auth';
import { firstInvalidField, validateSignInFields, withoutFieldError } from './signInForm';

describe('validateSignInFields', () => {
  it('trims and lowercases the email and keeps the password as typed', () => {
    expect(validateSignInFields('  Admin@Example.COM ', ' secret ')).toEqual({
      ok: true,
      email: 'admin@example.com',
      password: ' secret ',
    });
  });

  it('reports both errors at once when both fields are empty', () => {
    expect(validateSignInFields('', '')).toEqual({
      ok: false,
      errors: { email: AUTH_MESSAGES.emailInvalid, password: AUTH_MESSAGES.passwordMissing },
    });
  });

  it('reports only the email error when the password is fine', () => {
    expect(validateSignInFields('admin@', 'secret')).toEqual({
      ok: false,
      errors: { email: AUTH_MESSAGES.emailInvalid },
    });
  });

  it('reports only the password error when the email is fine', () => {
    expect(validateSignInFields('admin@example.com', '')).toEqual({
      ok: false,
      errors: { password: AUTH_MESSAGES.passwordMissing },
    });
  });

  // Every case in auth.test.ts's validateCredentials block, plus edge cases.
  const emails = [
    '',
    '   ',
    'admin',
    'admin@',
    'admin@example',
    '@example.com',
    'a b@example.com',
    'admin@example.com',
    '  Admin@Example.COM ',
    `${'a'.repeat(EMAIL_MAX)}@example.com`,
  ];
  const passwords = ['', ' ', '   ', 'secret', ' secret ', 'x'.repeat(PASSWORD_MAX), 'x'.repeat(PASSWORD_MAX * 2)];
  const pairs = emails.flatMap((email) => passwords.map((password) => [email, password] as const));

  it.each(pairs)('accepts exactly what validateCredentials accepts: %p, %p', (email, password) => {
    const fields = validateSignInFields(email, password);
    const reference = validateCredentials(email, password);
    expect(fields.ok).toBe(reference.ok);
    if (fields.ok && reference.ok) {
      expect(fields.email).toBe(reference.email);
      expect(fields.password).toBe(reference.password);
    }
    if (!fields.ok && !reference.ok) {
      // The first error on screen is the one validateCredentials would have shown.
      const first = firstInvalidField(fields.errors);
      expect(first && fields.errors[first]).toBe(reference.error);
    }
  });
});

describe('firstInvalidField', () => {
  it('puts the email first', () => {
    expect(firstInvalidField({ email: 'e', password: 'p' })).toBe('email');
  });

  it('returns the password when only it is invalid', () => {
    expect(firstInvalidField({ password: 'p' })).toBe('password');
  });

  it('returns null when nothing is invalid', () => {
    expect(firstInvalidField({})).toBeNull();
  });
});

describe('withoutFieldError', () => {
  it('removes only the named field', () => {
    expect(withoutFieldError({ email: 'e', password: 'p' }, 'email')).toEqual({ password: 'p' });
  });

  it('returns the same object when the field has no error', () => {
    const errors = { password: 'p' };
    expect(withoutFieldError(errors, 'email')).toBe(errors);
  });
});
