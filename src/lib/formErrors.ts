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

/** Ref callbacks for one field. React 19 calls the returned function when the node goes away. */
export type FieldRegistration<V, I> = {
  /** The field's outer view: what the form scrolls to. */
  container: (node: V | null) => (() => void) | undefined;
  /** A text field's input: takes keyboard focus. */
  input: (node: I | null) => (() => void) | undefined;
  /** A chip group's first chip: takes focus when the group has no input. */
  chip: (node: V | null) => (() => void) | undefined;
};

export type FieldTarget<V, I> = { container?: V; input?: I; chip?: V };

/** Keeps a node under a key while it is mounted. Removing checks the node, so a newer one is kept. */
function attach<T>(nodes: Map<string, T>, key: string) {
  return (node: T | null) => {
    if (node === null) return undefined;
    nodes.set(key, node);
    return () => {
      if (nodes.get(key) === node) nodes.delete(key);
    };
  };
}

/**
 * Where a form's fields are, by key. `register(key)` returns the same callbacks every time for a
 * key, so React does not detach and re-attach them on each render.
 */
export function createFieldRegistry<V, I>() {
  const containers = new Map<string, V>();
  const inputs = new Map<string, I>();
  const chips = new Map<string, V>();
  const registrations = new Map<string, FieldRegistration<V, I>>();

  function register(key: string): FieldRegistration<V, I> {
    let registration = registrations.get(key);
    if (!registration) {
      registration = { container: attach(containers, key), input: attach(inputs, key), chip: attach(chips, key) };
      registrations.set(key, registration);
    }
    return registration;
  }

  function target(key: string): FieldTarget<V, I> {
    return { container: containers.get(key), input: inputs.get(key), chip: chips.get(key) };
  }

  return { register, target };
}
