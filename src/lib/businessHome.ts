import { authHref } from './authRouting';
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
      // Both come back to /business once signed in.
      { href: authHref('/sign-up', '/business'), label: copy.business.signUpLink },
      { href: authHref('/sign-in', '/business'), label: copy.business.signInLink },
    ];
  }
  return [
    { href: '/business/new', label: copy.business.newLink },
    { href: '/business/claim', label: copy.business.claimLink },
  ];
}
