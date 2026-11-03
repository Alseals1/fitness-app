import { copy } from './copy';
import {
  ONBOARDING_STEPS,
  hasAnswer,
  isLastStep,
  primaryActionLabel,
  progressLabel,
  selectedValues,
  shouldOpenOnboarding,
  toggleAnswer,
} from './onboarding';
import { AREA_OPTIONS, PRICE_OPTIONS } from './placeOptions';
import { GOAL_OPTIONS, LEVEL_OPTIONS, TIME_OPTIONS } from './preferenceOptions';
import { emptyPreferences, type Preferences } from './preferences';

describe('ONBOARDING_STEPS', () => {
  it('asks the five questions in order, with the right kind of answer', () => {
    expect(ONBOARDING_STEPS.map((s) => [s.key, s.multiple])).toEqual([
      ['goals', true],
      ['level', false],
      ['budget', false],
      ['times', true],
      ['areas', true],
    ]);
  });

  it('uses the shared option lists and titles', () => {
    expect(ONBOARDING_STEPS.map((s) => s.options)).toEqual([
      GOAL_OPTIONS,
      LEVEL_OPTIONS,
      PRICE_OPTIONS,
      TIME_OPTIONS,
      AREA_OPTIONS,
    ]);
    for (const s of ONBOARDING_STEPS) expect(s.title).toBe(copy.onboarding[s.key]);
  });
});

describe('toggleAnswer', () => {
  it('adds and removes list values, keeping option order', () => {
    const a = toggleAnswer(emptyPreferences, 'goals', 'running');
    const b = toggleAnswer(a, 'goals', 'strength');
    expect(b.goals).toEqual(['strength', 'running']);
    expect(toggleAnswer(b, 'goals', 'running').goals).toEqual(['strength']);
  });

  it('selects a single value, replaces it, and clears it when tapped again', () => {
    const a = toggleAnswer(emptyPreferences, 'level', 'beginner');
    expect(a.level).toBe('beginner');
    const b = toggleAnswer(a, 'level', 'experienced');
    expect(b.level).toBe('experienced');
    expect(toggleAnswer(b, 'level', 'experienced').level).toBeNull();
    expect(toggleAnswer(emptyPreferences, 'budget', 'free').budget).toBe('free');
  });

  it('ignores values that are not options for that question', () => {
    const p: Preferences = { ...emptyPreferences, level: 'beginner', areas: ['hoover'] };
    expect(toggleAnswer(p, 'level', 'pro')).toBe(p);
    expect(toggleAnswer(p, 'areas', 'paris')).toBe(p);
    expect(toggleAnswer(p, 'goals', 'outdoor')).toBe(p);
  });

  it('never changes its input', () => {
    const p: Preferences = { ...emptyPreferences, goals: ['yoga'], level: 'beginner' };
    const snapshot = JSON.parse(JSON.stringify(p));
    toggleAnswer(p, 'goals', 'cardio');
    toggleAnswer(p, 'goals', 'yoga');
    toggleAnswer(p, 'level', 'beginner');
    expect(p).toEqual(snapshot);
  });

  it('leaves other answers alone', () => {
    const p: Preferences = { ...emptyPreferences, times: ['evenings'], budget: 'premium' };
    expect(toggleAnswer(p, 'areas', 'downtown')).toEqual({ ...p, areas: ['downtown'] });
  });
});

describe('selectedValues and hasAnswer', () => {
  const p: Preferences = { ...emptyPreferences, goals: ['cardio', 'yoga'], budget: 'budget' };

  it('returns the list, the single value, or nothing', () => {
    expect(selectedValues(p, 'goals')).toEqual(['cardio', 'yoga']);
    expect(selectedValues(p, 'budget')).toEqual(['budget']);
    expect(selectedValues(p, 'level')).toEqual([]);
    expect(selectedValues(p, 'areas')).toEqual([]);
  });

  it('says whether a question has an answer', () => {
    expect(hasAnswer(p, 'goals')).toBe(true);
    expect(hasAnswer(p, 'budget')).toBe(true);
    expect(hasAnswer(p, 'level')).toBe(false);
    expect(hasAnswer(p, 'times')).toBe(false);
  });
});

describe('primaryActionLabel', () => {
  it('says Skip when unanswered, Next when answered, and Done on the last step', () => {
    expect(primaryActionLabel(emptyPreferences, 0)).toBe(copy.onboarding.skip);
    expect(primaryActionLabel({ ...emptyPreferences, goals: ['yoga'] }, 0)).toBe(copy.onboarding.next);
    expect(primaryActionLabel({ ...emptyPreferences, goals: ['yoga'] }, 1)).toBe(copy.onboarding.skip);
    expect(primaryActionLabel({ ...emptyPreferences, level: 'beginner' }, 1)).toBe(copy.onboarding.next);
    const last = ONBOARDING_STEPS.length - 1;
    expect(primaryActionLabel(emptyPreferences, last)).toBe(copy.onboarding.done);
    expect(primaryActionLabel({ ...emptyPreferences, areas: ['hoover'] }, last)).toBe(copy.onboarding.done);
  });
});

describe('progress', () => {
  it('counts from 1 of 5', () => {
    expect(progressLabel(0)).toBe('1 of 5');
    expect(progressLabel(4)).toBe('5 of 5');
  });

  it('knows the last step', () => {
    expect(isLastStep(3)).toBe(false);
    expect(isLastStep(4)).toBe(true);
  });
});

describe('shouldOpenOnboarding', () => {
  it.each([
    [{ loading: true, stored: null, alreadyPrompted: false }, false],
    [{ loading: false, stored: null, alreadyPrompted: false }, true],
    [{ loading: false, stored: null, alreadyPrompted: true }, false],
    [{ loading: false, stored: emptyPreferences, alreadyPrompted: false }, false],
    [{ loading: true, stored: emptyPreferences, alreadyPrompted: true }, false],
  ])('%p -> %p', (state, expected) => {
    expect(shouldOpenOnboarding(state)).toBe(expected);
  });
});
