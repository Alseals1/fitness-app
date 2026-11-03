import { Constants } from './database.types';
import { TAG_LABELS } from './placeOptions';
import {
  GOAL_LABELS,
  GOAL_OPTIONS,
  LEVEL_LABELS,
  LEVEL_OPTIONS,
  TIME_LABELS,
  TIME_OPTIONS,
} from './preferenceOptions';
import { GOALS, LEVELS, TIMES } from './preferences';

const cases = [
  ['goal', GOALS, GOAL_LABELS, GOAL_OPTIONS],
  ['level', LEVELS, LEVEL_LABELS, LEVEL_OPTIONS],
  ['time', TIMES, TIME_LABELS, TIME_OPTIONS],
] as const;

describe.each(cases)('%s options', (_name, values, labels, options) => {
  const labelMap: Record<string, string> = labels;

  it('has a non-empty label for every value, and no extra ones', () => {
    expect(Object.keys(labelMap).sort()).toEqual([...values].sort());
    for (const value of values) expect(labelMap[value]?.trim()).toBeTruthy();
  });

  it('has no repeated labels', () => {
    const all = Object.values(labelMap);
    expect(new Set(all).size).toBe(all.length);
  });

  it('lists the options in the order of the values', () => {
    expect(options.map((o) => o.value)).toEqual([...values]);
    expect(options.map((o) => o.label)).toEqual(values.map((v) => labelMap[v]));
  });
});

it('goal labels match the place tag labels', () => {
  for (const goal of GOALS) expect(GOAL_LABELS[goal]).toBe(TAG_LABELS[goal]);
});

it('time labels match the place tag labels', () => {
  for (const time of TIMES) expect(TIME_LABELS[time]).toBe(TAG_LABELS[time]);
});

it('every preferred time is a place tag', () => {
  const tags: readonly string[] = Constants.public.Enums.place_tag;
  for (const time of TIMES) expect(tags).toContain(time);
});
