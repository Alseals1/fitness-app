import {
  createFieldRegistry,
  firstErrorField,
  focusBeforeScroll,
  focusMethod,
  scrollOffsetFor,
  scrollTargetField,
} from './formErrors';
import { spacing } from './theme';

type Key = 'a' | 'b' | 'c';
const ORDER: readonly Key[] = ['a', 'b', 'c'];

describe('firstErrorField', () => {
  it('follows the given order, not the order the keys were added', () => {
    const errors: Partial<Record<Key, string>> = {};
    errors.c = 'C is wrong.';
    errors.b = 'B is wrong.';
    expect(firstErrorField(errors, ORDER)).toBe('b');
  });

  it('is null when there are no errors', () => {
    expect(firstErrorField<Key>({}, ORDER)).toBeNull();
  });

  it('skips keys whose error is undefined or empty', () => {
    expect(firstErrorField<Key>({ a: undefined, b: '', c: 'C is wrong.' }, ORDER)).toBe('c');
  });

  it('ignores error keys that are not in the order', () => {
    const errors = { z: 'Not listed.' } as Partial<Record<Key, string>>;
    expect(firstErrorField(errors, ORDER)).toBeNull();
  });
});

describe('scrollTargetField', () => {
  it('sends form-wide errors to the first field that fixes them', () => {
    expect(scrollTargetField('contact')).toBe('website_url');
    expect(scrollTargetField('verification')).toBe('verification_email');
  });

  it('keeps any other key', () => {
    expect(scrollTargetField('name')).toBe('name');
    expect(scrollTargetField('category')).toBe('category');
  });
});

describe('scrollOffsetFor', () => {
  it('never goes above the top', () => {
    expect(scrollOffsetFor(0)).toBe(0);
    expect(scrollOffsetFor(spacing.lg / 2)).toBe(0);
  });

  it('leaves a margin above the field', () => {
    expect(scrollOffsetFor(1000)).toBe(1000 - spacing.lg);
  });
});

describe('focusMethod', () => {
  it('focuses a text input on every platform', () => {
    for (const os of ['web', 'ios', 'android'] as const) {
      expect(focusMethod({ input: true, chip: false }, os)).toBe('input');
    }
  });

  it('gives a chip keyboard focus on web', () => {
    expect(focusMethod({ input: false, chip: true }, 'web')).toBe('web-focus');
  });

  it('gives a chip screen-reader focus on iOS and Android', () => {
    expect(focusMethod({ input: false, chip: true }, 'ios')).toBe('a11y-focus');
    expect(focusMethod({ input: false, chip: true }, 'android')).toBe('a11y-focus');
  });

  it('does nothing without a target', () => {
    expect(focusMethod({ input: false, chip: false }, 'web')).toBe('none');
  });
});

describe('focusBeforeScroll', () => {
  it('focuses first on web, so the browser does not cut the scroll short', () => {
    expect(focusBeforeScroll('web')).toBe(true);
  });

  it('scrolls first on iOS and Android', () => {
    expect(focusBeforeScroll('ios')).toBe(false);
    expect(focusBeforeScroll('android')).toBe(false);
  });
});

describe('createFieldRegistry', () => {
  type Node = { id: string };

  it('returns the same callbacks for a key on every call', () => {
    const { register } = createFieldRegistry<Node, Node>();
    expect(register('name')).toBe(register('name'));
    expect(register('name')).not.toBe(register('area'));
  });

  it('stores each part of a field and forgets it when the node goes away', () => {
    const { register, target } = createFieldRegistry<Node, Node>();
    const container = { id: 'container' };
    const input = { id: 'input' };
    const removeContainer = register('name').container(container);
    register('name').input(input);
    expect(target('name')).toEqual({ container, input, chip: undefined });
    removeContainer?.();
    expect(target('name').container).toBeUndefined();
    expect(target('name').input).toBe(input);
  });

  it('keeps a newer node when an older one is removed late', () => {
    const { register, target } = createFieldRegistry<Node, Node>();
    const older = { id: 'older' };
    const newer = { id: 'newer' };
    const removeOlder = register('category').chip(older);
    register('category').chip(newer);
    removeOlder?.();
    expect(target('category').chip).toBe(newer);
  });

  it('ignores a null node', () => {
    const { register, target } = createFieldRegistry<Node, Node>();
    expect(register('note').input(null)).toBeUndefined();
    expect(target('note').input).toBeUndefined();
  });

  it('has nothing for a field that never registered', () => {
    const { target } = createFieldRegistry<Node, Node>();
    expect(target('place')).toEqual({ container: undefined, input: undefined, chip: undefined });
  });
});
