import { Constants } from './database.types';
import {
  AREA_LABELS,
  AREA_OPTIONS,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  PRICE_LABELS,
  PRICE_OPTIONS,
  TAG_LABELS,
  TAG_OPTIONS,
} from './placeOptions';

const cases = [
  ['place_category', CATEGORY_LABELS, CATEGORY_OPTIONS],
  ['place_area', AREA_LABELS, AREA_OPTIONS],
  ['price_range', PRICE_LABELS, PRICE_OPTIONS],
  ['place_tag', TAG_LABELS, TAG_OPTIONS],
] as const;

describe.each(cases)('%s', (enumName, labels, options) => {
  const values: readonly string[] = Constants.public.Enums[enumName];
  const labelMap: Record<string, string> = labels;

  it('has a non-empty label for every database value, and no extra ones', () => {
    expect(Object.keys(labelMap).sort()).toEqual([...values].sort());
    for (const value of values) {
      expect(labelMap[value]?.trim()).toBeTruthy();
    }
  });

  it('has no duplicate labels', () => {
    const all = Object.values(labelMap);
    expect(new Set(all).size).toBe(all.length);
  });

  it('lists the options in the database order', () => {
    expect(options.map((option) => option.value)).toEqual([...values]);
    expect(options.map((option) => option.label)).toEqual(values.map((value) => labelMap[value]));
  });
});

it('labels the two-word values in plain words', () => {
  expect(CATEGORY_LABELS.run_club).toBe('Run club');
  expect(AREA_LABELS.mountain_brook).toBe('Mountain Brook');
});
