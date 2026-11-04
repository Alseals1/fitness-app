import { contrastRatio } from './contrast';
import {
  buttonColors,
  chipColors,
  colorStyle,
  focusRing,
  saveButtonColors,
  type ButtonVariant,
  type ControlColors,
} from './controlStyles';
import { colors, focusRingStyle } from './theme';

const flags = [false, true] as const;
const states = flags.flatMap((pressed) =>
  flags.flatMap((focused) => flags.map((disabled) => ({ pressed, focused, disabled }))),
);
const selectableStates = states.flatMap((s) => flags.map((selected) => ({ ...s, selected })));
const variants: ButtonVariant[] = ['primary', 'secondary', 'danger'];

const name = (s: object) => JSON.stringify(s);

/** The checks every rendered control must pass. */
function expectReadable(c: ControlColors) {
  expect(contrastRatio(c.text, c.background)).toBeGreaterThanOrEqual(4.5);
  // An outlined control (its edge differs from its fill) must show that edge at 3:1 on the screen.
  if (c.border !== c.background) {
    expect(contrastRatio(c.border, colors.background)).toBeGreaterThanOrEqual(3);
  }
}

describe('buttonColors', () => {
  const cases = variants.flatMap((v) => states.map((s) => [v, name(s), s] as const));

  it.each(cases)('%s %s is readable', (variant, _label, state) => {
    expectReadable(buttonColors(variant, state));
  });

  it.each(variants)('%s: disabled wins over pressed', (variant) => {
    const disabled = buttonColors(variant, { pressed: false, focused: false, disabled: true });
    expect(buttonColors(variant, { pressed: true, focused: false, disabled: true })).toEqual(disabled);
    expect(disabled.background).toBe(colors.disabledBackground);
  });

  it.each(variants)('%s: pressed changes the fill', (variant) => {
    const rest = buttonColors(variant, { pressed: false, focused: false, disabled: false });
    const pressed = buttonColors(variant, { pressed: true, focused: false, disabled: false });
    expect(pressed.background).not.toBe(rest.background);
  });
});

describe('chipColors', () => {
  it.each(selectableStates.map((s) => [name(s), s] as const))('%s is readable', (_label, state) => {
    expectReadable(chipColors(state));
  });

  it('disabled wins over pressed', () => {
    for (const selected of flags) {
      expect(chipColors({ pressed: true, focused: false, disabled: true, selected })).toEqual(
        chipColors({ pressed: false, focused: false, disabled: true, selected }),
      );
    }
  });

  it('shows selected with a different fill', () => {
    for (const pressed of flags) {
      const base = { pressed, focused: false, disabled: false };
      expect(chipColors({ ...base, selected: true }).background).not.toBe(
        chipColors({ ...base, selected: false }).background,
      );
    }
  });

  it('keeps a disabled selected chip distinct from a disabled unselected one', () => {
    const base = { pressed: false, focused: false, disabled: true };
    expect(chipColors({ ...base, selected: true }).border).not.toBe(chipColors({ ...base, selected: false }).border);
  });
});

describe('saveButtonColors', () => {
  const cases = flags.flatMap((pressed) =>
    flags.flatMap((focused) => flags.map((selected) => ({ pressed, focused, selected }))),
  );

  it.each(cases.map((s) => [name(s), s] as const))('%s is readable', (_label, state) => {
    expectReadable(saveButtonColors(state));
  });

  it('shows saved with a different fill', () => {
    const base = { pressed: false, focused: false };
    expect(saveButtonColors({ ...base, selected: true }).background).not.toBe(
      saveButtonColors({ ...base, selected: false }).background,
    );
  });
});

describe('focusRing', () => {
  it('draws a ring of at least 2pt when focused', () => {
    const ring = focusRing(true);
    expect(ring).toBe(focusRingStyle);
    expect(ring?.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(contrastRatio(String(ring?.outlineColor), colors.background)).toBeGreaterThanOrEqual(3);
  });

  it('draws nothing when not focused', () => {
    expect(focusRing(false)).toBeNull();
  });
});

describe('colorStyle', () => {
  it('maps the fill and edge', () => {
    expect(colorStyle({ background: '#FFFFFF', border: '#000000', text: '#111111' })).toEqual({
      backgroundColor: '#FFFFFF',
      borderColor: '#000000',
    });
  });
});
