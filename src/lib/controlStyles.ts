/**
 * The colours a control shows in each state, as pure functions. Components call these instead of
 * picking colours inline, so `controlStyles.test.ts` can prove every pair they render is readable.
 */
import type { ViewStyle } from 'react-native';

import { colors, focusRingStyle } from './theme';

export type ControlState = { pressed: boolean; focused: boolean; disabled: boolean };
export type SelectableState = ControlState & { selected: boolean };
export type ControlColors = { background: string; border: string; text: string };
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const disabledColors: ControlColors = {
  background: colors.disabledBackground,
  border: colors.disabledBackground,
  text: colors.disabledText,
};

/** Filled teal: the primary button, a selected chip, a saved place. */
function filled(pressed: boolean): ControlColors {
  const fill = pressed ? colors.primaryPressed : colors.primary;
  return { background: fill, border: fill, text: colors.primaryText };
}

/** Outlined on a white surface, with a muted fill while pressed. */
function outlined(pressed: boolean, edge: string, text: string): ControlColors {
  return { background: pressed ? colors.surfaceMuted : colors.surface, border: edge, text };
}

/** `Button` colours. Disabled wins over pressed. Focus is drawn by `focusRing`, not here. */
export function buttonColors(variant: ButtonVariant, { pressed, disabled }: ControlState): ControlColors {
  if (disabled) return disabledColors;
  switch (variant) {
    case 'primary':
      return filled(pressed);
    case 'secondary':
      return outlined(pressed, colors.borderStrong, colors.text);
    case 'danger':
      return outlined(pressed, colors.danger, colors.danger);
  }
}

/** `OptionChips` colours. A disabled selected chip keeps a strong edge, so the choice stays visible. */
export function chipColors({ pressed, disabled, selected }: SelectableState): ControlColors {
  if (disabled) return selected ? { ...disabledColors, border: colors.borderStrong } : disabledColors;
  return selected ? filled(pressed) : outlined(pressed, colors.borderStrong, colors.text);
}

/** `SaveButton` colours: filled when saved, outlined when not. It is never disabled. */
export function saveButtonColors({ pressed, selected }: Omit<SelectableState, 'disabled'>): ControlColors {
  return selected ? filled(pressed) : outlined(pressed, colors.borderStrong, colors.text);
}

/**
 * An input's edge. Invalid wins over focused, so an error stays visible while the user fixes it.
 * Each colour is at least 3:1 on `background` and `surface`.
 */
export function inputBorderColor({ focused, invalid }: { focused: boolean; invalid: boolean }): string {
  if (invalid) return colors.danger;
  return focused ? colors.primary : colors.borderStrong;
}

/** The fill and edge of a control. Its text colour goes on the `Text`. */
export function colorStyle(c: ControlColors): ViewStyle {
  return { backgroundColor: c.background, borderColor: c.border };
}

/** The focus ring while a control has keyboard or switch focus, otherwise nothing. */
export function focusRing(focused: boolean): ViewStyle | null {
  return focused ? focusRingStyle : null;
}
