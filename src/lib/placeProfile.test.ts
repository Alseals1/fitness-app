import { copy } from './copy';
import {
  emailLink,
  instagramLink,
  phoneLink,
  placeProfileView,
  text,
  toPlaceProfile,
  websiteLink,
} from './placeProfile';
import type { PublicPlace } from './places';

function makePlace(overrides: Partial<PublicPlace> = {}): PublicPlace {
  return {
    id: '5eed0000-0000-4000-8000-000000000000',
    name: 'Sample Yoga (sample)',
    category: 'studio',
    description: 'Calm classes for every level.',
    area: 'southside',
    price_range: 'moderate',
    schedule: 'Mon–Fri 6am and 6pm',
    website_url: 'https://example.com/southside-yoga/',
    contact_phone: '205-555-0101',
    contact_email: 'hello@example.com',
    instagram_handle: 'southside.yoga',
    tags: ['yoga', 'beginner_friendly'],
    status: 'approved',
    is_verified: false,
    last_confirmed_at: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

describe('text', () => {
  it.each([null, undefined, '', '   ', '\n\t'])('leaves out %p', (value) => {
    expect(text(value)).toBeUndefined();
  });

  it('trims a value', () => {
    expect(text('  Hi  ')).toBe('Hi');
  });
});

describe('toPlaceProfile', () => {
  it('builds the profile from the label maps', () => {
    expect(toPlaceProfile(makePlace())).toEqual({
      id: '5eed0000-0000-4000-8000-000000000000',
      name: 'Sample Yoga (sample)',
      category: 'Studio',
      area: 'Southside',
      price: 'Moderate',
      description: 'Calm classes for every level.',
      schedule: 'Mon–Fri 6am and 6pm',
      tags: ['Yoga', 'Beginner friendly'],
      contacts: [
        { kind: 'phone', text: '205-555-0101', url: 'tel:2055550101', accessibilityLabel: 'Call 205-555-0101' },
        {
          kind: 'email',
          text: 'hello@example.com',
          url: 'mailto:hello@example.com',
          accessibilityLabel: 'Email hello@example.com',
        },
        {
          kind: 'website',
          text: 'example.com/southside-yoga',
          url: 'https://example.com/southside-yoga/',
          accessibilityLabel: 'Open website example.com/southside-yoga',
        },
        {
          kind: 'instagram',
          text: '@southside.yoga',
          url: 'https://www.instagram.com/southside.yoga/',
          accessibilityLabel: 'Open Instagram @southside.yoga',
        },
      ],
    });
  });

  it.each([null, '', '   '])('leaves out empty fields (%p), never showing "null" or "undefined"', (empty) => {
    const profile = toPlaceProfile(
      makePlace({
        description: empty,
        schedule: empty,
        contact_email: empty,
        instagram_handle: empty,
        website_url: empty,
        tags: [],
      }),
    );
    expect(profile).not.toHaveProperty('description');
    expect(profile).not.toHaveProperty('schedule');
    expect(profile).not.toHaveProperty('safetyNote');
    expect(profile.tags).toEqual([]);
    expect(profile.contacts.map((contact) => contact.kind)).toEqual(['phone']);
    const json = JSON.stringify(profile);
    expect(json).not.toContain('null');
    expect(json).not.toContain('undefined');
  });

  it('has no contact rows when every contact is empty', () => {
    const profile = toPlaceProfile(
      makePlace({ contact_phone: null, contact_email: ' ', website_url: '', instagram_handle: null }),
    );
    expect(profile.contacts).toEqual([]);
  });

  it('shows each tag once, in stored order', () => {
    expect(toPlaceProfile(makePlace({ tags: ['running', 'outdoor', 'running'] })).tags).toEqual(['Running', 'Outdoor']);
  });

  it('orders contacts phone, email, website, Instagram', () => {
    expect(toPlaceProfile(makePlace()).contacts.map((contact) => contact.kind)).toEqual([
      'phone',
      'email',
      'website',
      'instagram',
    ]);
  });

  it('adds the safety note to a trainer only', () => {
    expect(toPlaceProfile(makePlace({ category: 'trainer' })).safetyNote).toBe(copy.place.trainerSafety);
    for (const category of ['studio', 'gym', 'run_club'] as const) {
      expect(toPlaceProfile(makePlace({ category }))).not.toHaveProperty('safetyNote');
    }
  });
});

describe('phoneLink', () => {
  it.each([
    ['205-555-0101', 'tel:2055550101'],
    ['+1 (205) 555 0101', 'tel:+12055550101'],
    ['(205) 555.0101 ext', 'tel:2055550101'],
  ])('turns %p into %p', (raw, url) => {
    expect(phoneLink(raw)).toMatchObject({ text: raw, url });
  });

  it('shows a value with too few digits as text only', () => {
    expect(phoneLink('call us')).toEqual({
      kind: 'phone',
      text: 'call us',
      url: null,
      accessibilityLabel: 'Call call us',
    });
    expect(phoneLink('555-01')?.url).toBeNull();
  });

  it('leaves out an empty value', () => {
    expect(phoneLink('  ')).toBeUndefined();
  });
});

describe('emailLink', () => {
  it('builds a mailto link', () => {
    expect(emailLink(' hello@example.com ')).toMatchObject({ text: 'hello@example.com', url: 'mailto:hello@example.com' });
  });

  it.each(['a@b.com?cc=x@y.com', 'a@b.com&bcc=x@y.com', 'a,b@example.com', 'a@b.com#x', 'not an email'])(
    'shows %p as text only, with no link',
    (raw) => {
      expect(emailLink(raw)).toMatchObject({ text: raw, url: null });
    },
  );
});

describe('websiteLink', () => {
  it('opens the stored URL and shows it without the scheme or trailing slash', () => {
    expect(websiteLink('https://example.com/southside-yoga/')).toMatchObject({
      text: 'example.com/southside-yoga',
      url: 'https://example.com/southside-yoga/',
    });
    expect(websiteLink('http://example.com')).toMatchObject({ text: 'example.com', url: 'http://example.com' });
  });

  it.each([
    'javascript:alert(1)',
    'example.com',
    'https://',
    'https://exa mple.com',
    'https://example.com/a b',
    'https://example.com/\u0000',
    'ftp://example.com',
  ])('shows %p as text only, with no link', (raw) => {
    expect(websiteLink(raw)).toMatchObject({ text: raw, url: null });
  });
});

describe('instagramLink', () => {
  it('builds the profile URL and shows the handle with @', () => {
    expect(instagramLink('southside.yoga')).toMatchObject({
      text: '@southside.yoga',
      url: 'https://www.instagram.com/southside.yoga/',
    });
  });

  it('strips one leading @', () => {
    expect(instagramLink('@southside')).toMatchObject({ text: '@southside', url: 'https://www.instagram.com/southside/' });
  });

  it.each(['bad handle!', 'a/../b', '@@twice', 'x'.repeat(31)])('shows %p as text only, with no link', (raw) => {
    expect(instagramLink(raw)).toMatchObject({ text: raw, url: null });
  });
});

describe('placeProfileView', () => {
  it('is loading while the place loads', () => {
    expect(placeProfileView({ status: 'loading' })).toEqual({ kind: 'loading' });
  });

  it('passes the error message through', () => {
    expect(placeProfileView({ status: 'error', message: 'Oops' })).toEqual({ kind: 'error', message: 'Oops' });
  });

  it('is not found when there is no place', () => {
    expect(placeProfileView({ status: 'loaded', place: null })).toEqual({ kind: 'notFound' });
  });

  it.each(['pending', 'rejected', 'hidden'] as const)('shows a %s place exactly like a missing one', (status) => {
    const view = placeProfileView({ status: 'loaded', place: makePlace({ status }) });
    expect(view).toEqual(placeProfileView({ status: 'loaded', place: null }));
  });

  it('shows the profile of an approved place', () => {
    const place = makePlace();
    expect(placeProfileView({ status: 'loaded', place })).toEqual({ kind: 'profile', profile: toPlaceProfile(place) });
  });
});
