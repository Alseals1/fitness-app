/**
 * Where sign-in and sign-up send a person once they are signed in. Pure, so jest can cover it.
 *
 * The return target travels as a `returnTo` search param. It is an allowlist on purpose:
 * anyone can type `/sign-in?returnTo=…`, so only these in-app paths are ever used, which
 * rules out an open redirect and never points at a screen with its own guard.
 */
export const AUTH_RETURN_PATHS = ['/', '/business'] as const;
export type AuthReturnPath = (typeof AUTH_RETURN_PATHS)[number];

/** The allowlisted path in `value`, or home (`/`) for anything else: missing, an array, another path. */
export function authReturnPath(value: unknown): AuthReturnPath {
  return AUTH_RETURN_PATHS.find((path) => path === value) ?? '/';
}

/** A link to sign-in or sign-up that returns to `returnTo` afterwards. Home needs no param. */
export function authHref(pathname: '/sign-in' | '/sign-up', returnTo: AuthReturnPath): string {
  return returnTo === '/' ? pathname : `${pathname}?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * Whether the first auth load has finished. It latches: once ready, a later admin check
 * (for example right after sign-in) never hides the app again.
 */
export function nextAuthReady(wasReady: boolean, loading: boolean): boolean {
  return wasReady || !loading;
}
