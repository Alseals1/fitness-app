import { Constants, type Enums } from './database.types';

/**
 * Display labels for the place enums. The Record types make typecheck fail when the
 * database gains a value that has no label here.
 */
export const CATEGORY_LABELS: Record<Enums<'place_category'>, string> = {
  studio: 'Studio',
  trainer: 'Trainer',
  run_club: 'Run club',
  gym: 'Gym',
};

export const AREA_LABELS: Record<Enums<'place_area'>, string> = {
  downtown: 'Downtown',
  southside: 'Southside',
  lakeview: 'Lakeview',
  avondale: 'Avondale',
  crestwood: 'Crestwood',
  homewood: 'Homewood',
  mountain_brook: 'Mountain Brook',
  vestavia_hills: 'Vestavia Hills',
  hoover: 'Hoover',
  trussville: 'Trussville',
};

export const PRICE_LABELS: Record<Enums<'price_range'>, string> = {
  free: 'Free',
  budget: 'Budget',
  moderate: 'Moderate',
  premium: 'Premium',
};

export const TAG_LABELS: Record<Enums<'place_tag'>, string> = {
  beginner_friendly: 'Beginner friendly',
  all_levels: 'All levels',
  strength: 'Strength',
  cardio: 'Cardio',
  yoga: 'Yoga',
  running: 'Running',
  drop_in: 'Drop-in',
  free_trial: 'Free trial',
  outdoor: 'Outdoor',
};

export type Option<T extends string> = { value: T; label: string };

function toOptions<T extends string>(values: readonly T[], labels: Record<T, string>): Option<T>[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

/** Options in the database's enum order, for pickers. */
export const CATEGORY_OPTIONS = toOptions(Constants.public.Enums.place_category, CATEGORY_LABELS);
export const AREA_OPTIONS = toOptions(Constants.public.Enums.place_area, AREA_LABELS);
export const PRICE_OPTIONS = toOptions(Constants.public.Enums.price_range, PRICE_LABELS);
export const TAG_OPTIONS = toOptions(Constants.public.Enums.place_tag, TAG_LABELS);
