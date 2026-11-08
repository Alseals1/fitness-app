import { adminCheckResult, adminStatus, homeAccountView, shouldRecheckAdmin, type AdminStatus } from './adminCheck';

describe('adminCheckResult', () => {
  it('maps a clean true or false answer', () => {
    expect(adminCheckResult(true, null)).toBe('admin');
    expect(adminCheckResult(false, null)).toBe('notAdmin');
  });

  it('treats an error as a failed check, never as "not an admin"', () => {
    expect(adminCheckResult(null, { message: 'x' })).toBe('failed');
    expect(adminCheckResult(true, { message: 'x' })).toBe('failed');
  });

  it('treats any other answer as a failed check', () => {
    expect(adminCheckResult(null, null)).toBe('failed');
    expect(adminCheckResult(undefined, undefined)).toBe('failed');
    expect(adminCheckResult('true', null)).toBe('failed');
  });
});

describe('adminStatus', () => {
  it('is signedOut without a user', () => {
    expect(adminStatus(null, null)).toBe('signedOut');
    expect(adminStatus(null, { userId: 'a', result: 'admin' })).toBe('signedOut');
  });

  it('is checking until there is an answer for this user', () => {
    expect(adminStatus('a', null)).toBe('checking');
    expect(adminStatus('a', { userId: 'b', result: 'admin' })).toBe('checking');
  });

  it.each(['admin', 'notAdmin', 'failed'] as const)('returns the answer %p for this user', (result) => {
    expect(adminStatus('a', { userId: 'a', result })).toBe(result);
  });
});

describe('shouldRecheckAdmin', () => {
  it('rechecks only when the app becomes active after a failed check', () => {
    expect(shouldRecheckAdmin('active', 'failed')).toBe(true);
  });

  it.each(['background', 'inactive'])('does not recheck on %p', (appState) => {
    expect(shouldRecheckAdmin(appState, 'failed')).toBe(false);
  });

  it.each<AdminStatus>(['admin', 'notAdmin', 'checking', 'signedOut'])('does not recheck when the status is %p', (status) => {
    expect(shouldRecheckAdmin('active', status)).toBe(false);
  });
});

describe('homeAccountView', () => {
  it('shows nothing while loading, even for a signed-in admin', () => {
    expect(homeAccountView({ loading: true, signedIn: true, status: 'admin' })).toBe('none');
  });

  it('offers sign-in when signed out', () => {
    expect(homeAccountView({ loading: false, signedIn: false, status: 'signedOut' })).toBe('signIn');
  });

  it('shows the Admin link for an admin', () => {
    expect(homeAccountView({ loading: false, signedIn: true, status: 'admin' })).toBe('admin');
  });

  it('shows the retry area when the check failed', () => {
    expect(homeAccountView({ loading: false, signedIn: true, status: 'failed' })).toBe('checkFailed');
  });

  it('shows only Sign out for a confirmed non-admin', () => {
    expect(homeAccountView({ loading: false, signedIn: true, status: 'notAdmin' })).toBe('signOut');
  });

  it('falls back to Sign out when checking but not loading', () => {
    expect(homeAccountView({ loading: false, signedIn: true, status: 'checking' })).toBe('signOut');
  });
});
