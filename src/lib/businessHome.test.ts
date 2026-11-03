import { businessHomeLinks } from './businessHome';
import { copy } from './copy';

describe('businessHomeLinks', () => {
  it('offers sign-up and sign-in when signed out', () => {
    expect(businessHomeLinks(false)).toEqual([
      { href: '/sign-up', label: copy.business.signUpLink },
      { href: '/sign-in', label: copy.business.signInLink },
    ]);
  });

  it('offers no account links when signed in', () => {
    expect(businessHomeLinks(true).map((link) => link.href)).not.toEqual(
      expect.arrayContaining(['/sign-up', '/sign-in']),
    );
  });
});
