import { businessHomeLinks } from './businessHome';
import { copy } from './copy';

describe('businessHomeLinks', () => {
  it('offers sign-up and sign-in when signed out, both returning to /business', () => {
    expect(businessHomeLinks(false)).toEqual([
      { href: '/sign-up?returnTo=%2Fbusiness', label: copy.business.signUpLink },
      { href: '/sign-in?returnTo=%2Fbusiness', label: copy.business.signInLink },
    ]);
  });

  it('offers a new listing or a claim when signed in', () => {
    expect(businessHomeLinks(true)).toEqual([
      { href: '/business/new', label: copy.business.newLink },
      { href: '/business/claim', label: copy.business.claimLink },
    ]);
  });
});
