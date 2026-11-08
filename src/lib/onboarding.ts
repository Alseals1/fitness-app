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

/** For example "Question 2 of 5". `stepIndex` counts from 0. */
export function progressLabel(stepIndex: number): string {
  return copy.onboarding.progress(stepIndex + 1, ONBOARDING_STEPS.length);
}

/** The progress bar: one entry per question, true up to and including `stepIndex` (clamped to the range). */
export function progressSegments(stepIndex: number): boolean[] {
  const last = Math.min(Math.max(stepIndex, 0), ONBOARDING_STEPS.length - 1);
  return ONBOARDING_STEPS.map((_, i) => i <= last);
}

/** What screen readers hear after a step change, for example "Question 2 of 5. How much experience do you have?". */
export function stepAnnouncement(stepIndex: number): string {
  const i = Math.min(Math.max(stepIndex, 0), ONBOARDING_STEPS.length - 1);
  return copy.onboarding.stepAnnouncement(progressLabel(i), ONBOARDING_STEPS[i].title);
}

/** Which button saved the answers: "Done" on the last question, or "Skip the rest". */
export type SaveTrigger = 'done' | 'skipRest';

/**
 * What happens after a successful save. Finishing every question earns the short "You're all set"
 * moment; "Skip the rest" is the fast exit, so it leaves at once.
 */
export function afterSave(trigger: SaveTrigger): 'celebrate' | 'leave' {
  return trigger === 'done' ? 'celebrate' : 'leave';
}

/** What home does about the first-run quiz: open it, mark the launch as prompted without opening it, or nothing yet. */
export type FirstRunOnboarding = 'open' | 'skip' | 'none';

/**
 * Whether home should open onboarding by itself. The quiz is the first-run prompt for
 * signed-out people only:
 * - already prompted this launch: never again, so backing out never loops;
 * - home not the screen in view: decide later. A deep link or a refresh mounts home under the
 *   opened screen (the root anchor), and the quiz must not cover a shared place;
 * - preferences or auth still loading: decide later, once both are known;
 * - signed in (a business or an admin): `skip`, which marks the launch as prompted, so the
 *   consumer quiz never opens for them, nor after they sign out in the same launch;
 * - preferences already saved: nothing to ask;
 * - otherwise: open it.
 */
export function firstRunOnboarding(state: {
  preferencesLoading: boolean;
  stored: Preferences | null;
  alreadyPrompted: boolean;
  authLoading: boolean;
  signedIn: boolean;
  focused: boolean;
}): FirstRunOnboarding {
  if (state.alreadyPrompted) return 'none';
  if (!state.focused) return 'none';
  if (state.preferencesLoading || state.authLoading) return 'none';
  if (state.signedIn) return 'skip';
  if (state.stored !== null) return 'none';
  return 'open';
}
