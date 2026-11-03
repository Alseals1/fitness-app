import { copy } from './copy';

/** A link on the business home screen. */
export type BusinessHomeLink = { href: string; label: string };

/**
 * What the business home screen offers. Signed out: create an account or sign in, since a
 * submission needs an account (for the rate limit and so the admin can reach the sender).
 */
export function businessHomeLinks(signedIn: boolean): BusinessHomeLink[] {
  if (!signedIn) {
    return [
      { href: '/sign-up', label: copy.business.signUpLink },
      { href: '/sign-in', label: copy.business.signInLink },
    ];
  }
  return [];
}
