/**
 * Pure helpers for bringing a form's first error into view after a failed send. No React, so
 * jest can test them directly. `useScrollToFirstError` uses them.
 */
import type { Platform } from 'react-native';

import { spacing } from './theme';

/** The first key in `order` whose error is a non-empty string, or null when there is none. */
export function firstErrorField<K extends string>(
  errors: Partial<Record<K, string | undefined>>,
  order: readonly K[],
): K | null {
  return order.find((key) => typeof errors[key] === 'string' && errors[key] !== '') ?? null;
}

/**
 * Form-wide errors that have no field of their own, and the field to scroll to for each: the
 * first field that fixes it. Its message is shown just under that group of fields.
 */
const FIELD_ALIASES: Readonly<Record<string, string>> = {
  /** "Add at least one way to get in touch": website is the first contact field. */
  contact: 'website_url',
  /** "Add a business email or an official social account": business email comes first. */
  verification: 'verification_email',
};

/** The field to scroll to and focus for an error key. */
export function scrollTargetField(key: string): string {
  return FIELD_ALIASES[key] ?? key;
}

/** The scroll offset that puts a field at `y` (in the scroll content) a little below the top. */
export function scrollOffsetFor(y: number): number {
  return Math.max(0, y - spacing.lg);
}

export type FocusMethod = 'input' | 'web-focus' | 'a11y-focus' | 'none';

/**
 * How to move focus to a field. A text input takes keyboard focus everywhere. A chip group
 * focuses its first chip: keyboard focus on web, screen-reader focus on iOS and Android
 * (chips do not take keyboard focus there).
 */
export function focusMethod(target: { input: boolean; chip: boolean }, os: typeof Platform.OS): FocusMethod {
  if (target.input) return 'input';
  if (target.chip) return os === 'web' ? 'web-focus' : 'a11y-focus';
  return 'none';
}
