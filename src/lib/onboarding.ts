import { copy } from './copy';
import { AREA_OPTIONS, PRICE_OPTIONS, type Option } from './placeOptions';
import { GOAL_OPTIONS, LEVEL_OPTIONS, TIME_OPTIONS } from './preferenceOptions';
import { parsePreferences, type Preferences } from './preferences';

/** The step model of the onboarding screen. Pure, so jest can cover it. */

type Key = keyof Preferences;
/** The value one answer can take: a list's item type, or the single value without `null`. */
type ValueOf<K extends Key> = Extract<
  Preferences[K] extends readonly (infer U)[] ? U : NonNullable<Preferences[K]>,
  string
>;

type Step<K extends Key> = {
  key: K;
  /** True when the answer is a list (several allowed), false when it is one value. */
  multiple: Preferences[K] extends readonly unknown[] ? true : false;
  title: string;
  options: readonly Option<ValueOf<K>>[];
};

export type OnboardingStep = { [K in Key]: Step<K> }[Key];

/** Ties each key to options of its own value type, so a step cannot get the wrong list. */
function step<K extends Key>(s: Step<K>): Step<K> {
  return s;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  step({ key: 'goals', multiple: true, title: copy.onboarding.goals, options: GOAL_OPTIONS }),
  step({ key: 'level', multiple: false, title: copy.onboarding.level, options: LEVEL_OPTIONS }),
  step({ key: 'budget', multiple: false, title: copy.onboarding.budget, options: PRICE_OPTIONS }),
  step({ key: 'times', multiple: true, title: copy.onboarding.times, options: TIME_OPTIONS }),
  step({ key: 'areas', multiple: true, title: copy.onboarding.areas, options: AREA_OPTIONS }),
];

export function isLastStep(stepIndex: number): boolean {
  return stepIndex >= ONBOARDING_STEPS.length - 1;
}

/** The chosen values for one question, in the shape `OptionChips` takes. */
export function selectedValues(p: Preferences, key: Key): string[] {
  const value = p[key];
  if (Array.isArray(value)) return [...value];
  return value === null ? [] : [value];
}

export function hasAnswer(p: Preferences, key: Key): boolean {
  return selectedValues(p, key).length > 0;
}

/**
 * Taps one chip. A list adds or removes the value (kept in option order). A single answer
 * selects the value, or clears it when it is already selected. Unknown values change
 * nothing. Returns a new object; `p` is never changed.
 */
export function toggleAnswer(p: Preferences, key: Key, value: string): Preferences {
  const known = ONBOARDING_STEPS.some((s) => s.key === key && s.options.some((o) => o.value === value));
  if (!known) return p;
  const current = selectedValues(p, key);
  const isSelected = current.includes(value);
  const next = Array.isArray(p[key])
    ? isSelected
      ? current.filter((v) => v !== value)
      : [...current, value]
    : isSelected
      ? null
      : value;
  // parsePreferences types the result and puts lists back in option order.
  return parsePreferences({ ...p, [key]: next });
}

/** The main button: "Done" on the last step, otherwise "Next" when answered, else "Skip". */
export function primaryActionLabel(p: Preferences, stepIndex: number): string {
  if (isLastStep(stepIndex)) return copy.onboarding.done;
  const current = ONBOARDING_STEPS[stepIndex];
  return current && hasAnswer(p, current.key) ? copy.onboarding.next : copy.onboarding.skip;
}

/** For example "2 of 5". `stepIndex` counts from 0. */
export function progressLabel(stepIndex: number): string {
  return copy.onboarding.progress(stepIndex + 1, ONBOARDING_STEPS.length);
}

/**
 * Whether home should open onboarding by itself: only once loading is done, nothing is
 * saved, and it has not already been opened this launch.
 */
export function shouldOpenOnboarding(state: {
  loading: boolean;
  stored: Preferences | null;
  alreadyPrompted: boolean;
}): boolean {
  return !state.loading && state.stored === null && !state.alreadyPrompted;
}
