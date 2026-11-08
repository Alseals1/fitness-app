import { authHref, authReturnPath, nextAuthReady } from './authRouting';

describe('authReturnPath', () => {
  it.each(['/', '/business'])('keeps the allowlisted path %p', (path) => {
    expect(authReturnPath(path)).toBe(path);
  });

  it.each([
    undefined,
    null,
    '',
    ['/business'],
    '/admin',
    '/business/new',
    '//evil.com',
    'https://evil.com',
    '/business?x=1',
    'business',
    '/Business',
  ])('falls back to home for %p', (value) => {
    expect(authReturnPath(value)).toBe('/');
  });
});

describe('authHref', () => {
  it('adds no param for home', () => {
    expect(authHref('/sign-in', '/')).toBe('/sign-in');
    expect(authHref('/sign-up', '/')).toBe('/sign-up');
  });

  it('carries another return path as an encoded param', () => {
    expect(authHref('/sign-up', '/business')).toBe('/sign-up?returnTo=%2Fbusiness');
    expect(authHref('/sign-in', '/business')).toBe('/sign-in?returnTo=%2Fbusiness');
  });

  it('round-trips through authReturnPath', () => {
    const query = authHref('/sign-in', '/business').split('?')[1];
    const value = new URLSearchParams(query).get('returnTo');
    expect(authReturnPath(value)).toBe('/business');
  });
});

describe('nextAuthReady', () => {
  it.each([
    [false, true, false],
    [false, false, true],
    [true, true, true],
    [true, false, true],
  ])('wasReady %p, loading %p -> %p', (wasReady, loading, expected) => {
    expect(nextAuthReady(wasReady, loading)).toBe(expected);
  });
});
