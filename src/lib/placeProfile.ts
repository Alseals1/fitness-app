import { copy } from './copy';
import { EMAIL_PATTERN, INSTAGRAM_PATTERN, PLACE_LIMITS, WEBSITE_PATTERN } from './placeForm';
import { AREA_LABELS, CATEGORY_LABELS, PRICE_LABELS, TAG_LABELS } from './placeOptions';
import type { PublicPlace } from './places';

/**
 * The place profile's view model. Pure module: the screen owns the state and opens links,
 * this decides what to show and which links are safe to open.
 */

export type PlaceLoad =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; place: PublicPlace | null };

export type ContactKind = 'phone' | 'email' | 'website' | 'instagram';

/** One contact row. `url` is null when the value can't be made into a safe link: it is then shown as plain text. */
export type ContactLink = { kind: ContactKind; text: string; url: string | null; accessibilityLabel: string };

export type PlaceProfile = {
  id: string;
  name: string;
  category: string;
  area: string;
  price: string;
  description?: string;
  schedule?: string;
  tags: string[];
  contacts: ContactLink[];
  safetyNote?: string;
};

export type PlaceProfileView =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'notFound' }
  | { kind: 'profile'; profile: PlaceProfile };

/**
 * Stricter than EMAIL_PATTERN: no `?`, `&`, `#` or `,`, which would add headers or extra
 * recipients to a mailto link.
 */
const MAILTO_SAFE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** An http(s) URL with a plain host name and no spaces. */
const SAFE_WEBSITE = /^https?:\/\/[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(:\d{1,5})?([/?#]\S*)?$/i;
const CONTROL_CHARACTER = /\p{Cc}/u;

/** Trims a value; an empty or missing one becomes undefined, so it is left out. */
export function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function contact(kind: ContactKind, shown: string, url: string | null): ContactLink {
  return { kind, text: shown, url, accessibilityLabel: copy.place.contactLabels[kind](shown) };
}

/** `tel:` with one optional leading `+` and the digits only. */
export function phoneLink(raw: string | null | undefined): ContactLink | undefined {
  const value = text(raw);
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  const plus = value.startsWith('+') ? '+' : '';
  const url = digits.length >= PLACE_LIMITS.phoneMin ? `tel:${plus}${digits}` : null;
  return contact('phone', value, url);
}

export function emailLink(raw: string | null | undefined): ContactLink | undefined {
  const value = text(raw);
  if (!value) return undefined;
  const safe = EMAIL_PATTERN.test(value) && MAILTO_SAFE_EMAIL.test(value);
  return contact('email', value, safe ? `mailto:${value}` : null);
}

export function websiteLink(raw: string | null | undefined): ContactLink | undefined {
  const value = text(raw);
  if (!value) return undefined;
  const safe = WEBSITE_PATTERN.test(value) && SAFE_WEBSITE.test(value) && !CONTROL_CHARACTER.test(value);
  const shown = safe ? value.replace(/^https?:\/\//i, '').replace(/\/$/, '') : value;
  return contact('website', shown, safe ? value : null);
}

/** The database stores the handle without `@`; one is stripped anyway, in case. */
export function instagramLink(raw: string | null | undefined): ContactLink | undefined {
  const value = text(raw);
  if (!value) return undefined;
  const handle = value.replace(/^@/, '');
  if (!INSTAGRAM_PATTERN.test(handle)) return contact('instagram', value, null);
  return contact('instagram', `@${handle}`, `https://www.instagram.com/${handle}/`);
}

export function toPlaceProfile(place: PublicPlace): PlaceProfile {
  const contacts = [
    phoneLink(place.contact_phone),
    emailLink(place.contact_email),
    websiteLink(place.website_url),
    instagramLink(place.instagram_handle),
  ].filter((link): link is ContactLink => link !== undefined);

  const profile: PlaceProfile = {
    id: place.id,
    name: place.name,
    category: CATEGORY_LABELS[place.category],
    area: AREA_LABELS[place.area],
    price: PRICE_LABELS[place.price_range],
    tags: [...new Set(place.tags)].map((tag) => TAG_LABELS[tag]),
    contacts,
  };
  // Optional keys are only set when they have a value, so nothing empty reaches the screen.
  const description = text(place.description);
  if (description) profile.description = description;
  const schedule = text(place.schedule);
  if (schedule) profile.schedule = schedule;
  if (place.category === 'trainer') profile.safetyNote = copy.place.trainerSafety;
  return profile;
}

/**
 * What the profile screen shows. A missing place and a place that is not approved give the
 * same not-found view. The status check repeats the query's filter as a second guard.
 */
export function placeProfileView(load: PlaceLoad): PlaceProfileView {
  if (load.status === 'loading') return { kind: 'loading' };
  if (load.status === 'error') return { kind: 'error', message: load.message };
  if (load.place === null || load.place.status !== 'approved') return { kind: 'notFound' };
  return { kind: 'profile', profile: toPlaceProfile(load.place) };
}
