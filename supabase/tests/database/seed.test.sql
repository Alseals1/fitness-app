-- Checks the sample data from supabase/seed.sql. Run `supabase db reset` first, then
-- `supabase test db`, against LOCAL Supabase.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

select cmp_ok(
  (select count(*)::int from public.places),
  '>=',
  8,
  'the seed has at least 8 places'
);

select cmp_ok(
  (select count(*)::int from public.places),
  '<=',
  10,
  'the seed has at most 10 places'
);

select set_eq(
  $$select distinct category::text from public.places$$,
  array['studio', 'trainer', 'run_club', 'gym'],
  'the seed covers all four categories'
);

select set_eq(
  $$select distinct status::text from public.places$$,
  array['pending', 'approved', 'rejected', 'hidden'],
  'the seed has every status'
);

select cmp_ok(
  (select count(*)::int from public.places where status = 'approved' and is_verified),
  '>=',
  1,
  'at least one approved place is verified'
);

select cmp_ok(
  (select count(*)::int from public.places
    where status = 'approved' and tags && '{mornings,evenings,weekends}'::public.place_tag[]),
  '>=',
  1,
  'at least one approved place has a time tag'
);

select * from finish();

rollback;
