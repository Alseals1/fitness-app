-- Time-of-day tags, so matching can compare a person's preferred times with a place.
-- Meaning (set by hand by the owner or admin, from the place's real schedule):
--   mornings: sessions or opening hours before noon, any day
--   evenings: sessions or opening hours from 5pm, any day
--   weekends: sessions or opening hours on Saturday or Sunday
-- The values match TIMES in src/lib/preferences.ts. No grants or policies change.
alter type public.place_tag add value if not exists 'mornings';
alter type public.place_tag add value if not exists 'evenings';
alter type public.place_tag add value if not exists 'weekends';
