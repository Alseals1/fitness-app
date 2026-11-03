import { toOptions, TAG_LABELS } from './placeOptions';
import { GOALS, LEVELS, TIMES, type Goal, type Level, type PreferredTime } from './preferences';

/** Display labels for the onboarding answers. Budget and area reuse `placeOptions`. */
export const GOAL_LABELS: Record<Goal, string> = {
  strength: TAG_LABELS.strength,
  cardio: TAG_LABELS.cardio,
  yoga: TAG_LABELS.yoga,
  running: TAG_LABELS.running,
};

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Beginner',
  some_experience: 'Some experience',
  experienced: 'Experienced',
};

export const TIME_LABELS: Record<PreferredTime, string> = {
  mornings: TAG_LABELS.mornings,
  evenings: TAG_LABELS.evenings,
  weekends: TAG_LABELS.weekends,
};

export const GOAL_OPTIONS = toOptions(GOALS, GOAL_LABELS);
export const LEVEL_OPTIONS = toOptions(LEVELS, LEVEL_LABELS);
export const TIME_OPTIONS = toOptions(TIMES, TIME_LABELS);
