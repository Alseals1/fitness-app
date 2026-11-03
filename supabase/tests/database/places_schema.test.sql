-- Schema checks for public.places. Run with `supabase test db` against LOCAL Supabase.
begin;

create extension if not exists pgtap with schema extensions;

select plan(42);

-- Table and columns
select has_table('public', 'places', 'places table exists');

select columns_are(
  'public',
  'places',
  array[
    'id',
    'name',
    'category',
    'description',
    'area',
    'price_range',
    'schedule',
    'website_url',
    'contact_phone',
    'contact_email',
    'instagram_handle',
    'tags',
    'status',
    'is_verified',
    'submitted_by',
    'claimed_by',
    'last_confirmed_at',
    'created_at',
    'updated_at',
    'is_certified',
    'certification_name'
  ],
  'places has exactly the planned columns (no city column)'
);

select col_is_pk('public', 'places', 'id', 'id is the primary key');
select col_type_is('public', 'places', 'category', 'place_category', 'category uses the place_category enum');
select col_type_is('public', 'places', 'area', 'place_area', 'area uses the place_area enum');
select col_type_is('public', 'places', 'price_range', 'price_range', 'price_range uses the price_range enum');
select col_type_is('public', 'places', 'tags', 'place_tag[]', 'tags is an array of place_tag');
select col_type_is('public', 'places', 'status', 'place_status', 'status uses the place_status enum');
select col_not_null('public', 'places', 'name', 'name is required');
select col_not_null('public', 'places', 'category', 'category is required');
select col_not_null('public', 'places', 'area', 'area is required');
select col_not_null('public', 'places', 'price_range', 'price_range is required');
select col_is_null('public', 'places', 'claimed_by', 'claimed_by is optional');
select col_type_is('public', 'places', 'is_certified', 'boolean', 'is_certified is a boolean');
select col_not_null('public', 'places', 'is_certified', 'is_certified is required');
select col_type_is('public', 'places', 'certification_name', 'text', 'certification_name is text');

-- Enum values
select enum_has_labels('public', 'place_category', array['studio', 'trainer', 'run_club', 'gym'], 'category values');
select enum_has_labels('public', 'place_status', array['pending', 'approved', 'rejected', 'hidden'], 'status values');
select enum_has_labels(
  'public',
  'place_area',
  array['downtown', 'southside', 'lakeview', 'avondale', 'crestwood', 'homewood', 'mountain_brook', 'vestavia_hills', 'hoover', 'trussville'],
  'area values'
);
select enum_has_labels('public', 'price_range', array['free', 'budget', 'moderate', 'premium'], 'price range values');
select enum_has_labels(
  'public',
  'place_tag',
  array['beginner_friendly', 'all_levels', 'strength', 'cardio', 'yoga', 'running', 'drop_in', 'free_trial', 'outdoor', 'mornings', 'evenings', 'weekends'],
  'tag values'
);

-- Defaults
select col_default_is('public', 'places', 'status', 'pending'::public.place_status, 'status defaults to pending');
select col_default_is('public', 'places', 'is_verified', false, 'is_verified defaults to false');
select col_default_is('public', 'places', 'is_certified', false, 'is_certified defaults to false');
select col_default_is('public', 'places', 'tags', '{}'::public.place_tag[], 'tags defaults to empty');
select col_default_is('public', 'places', 'submitted_by', 'auth.uid()', 'submitted_by defaults to auth.uid()');

-- RLS
select is(
  (select relrowsecurity from pg_class where oid = 'public.places'::regclass),
  true,
  'RLS is enabled on places'
);

-- Indexes and trigger
select has_index('public', 'places', 'places_status_category_idx', 'index on (status, category)');
select has_index('public', 'places', 'places_submitted_by_idx', 'index on submitted_by');
select has_trigger('public', 'places', 'places_set_updated_at', 'updated_at trigger exists');

-- Constraints
select throws_ok(
  $$insert into public.places (name, category, area, price_range)
    values ('No Contact (sample)', 'gym', 'hoover', 'budget')$$,
  '23514',
  null,
  'a place with no contact method is rejected'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_email)
    values ('Bad Email (sample)', 'gym', 'hoover', 'budget', 'not-an-email')$$,
  '23514',
  null,
  'a badly formed email is rejected'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, website_url)
    values ('Bad URL (sample)', 'gym', 'hoover', 'budget', 'example.com')$$,
  '23514',
  null,
  'a website without http(s):// is rejected'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, instagram_handle)
    values ('Bad Handle (sample)', 'gym', 'hoover', 'budget', '@sample handle')$$,
  '23514',
  null,
  'an Instagram handle with @ or spaces is rejected'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone)
    values ('   ', 'gym', 'hoover', 'budget', '205-555-0100')$$,
  '23514',
  null,
  'a blank name is rejected'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone)
    values ('Short Phone (sample)', 'gym', 'hoover', 'budget', '123')$$,
  '23514',
  null,
  'a too-short phone number is rejected'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone, tags)
    values ('Bad Tag (sample)', 'gym', 'hoover', 'budget', '205-555-0100', '{not_a_tag}')$$,
  '22P02',
  null,
  'a tag outside the value list is rejected'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone, is_certified)
    values ('Certified No Name (sample)', 'trainer', 'hoover', 'budget', '205-555-0100', true)$$,
  '23514',
  null,
  'a certified place needs a certification name'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone, certification_name)
    values ('Name Not Certified (sample)', 'trainer', 'hoover', 'budget', '205-555-0100', 'NASM-CPT')$$,
  '23514',
  null,
  'a certification name is set only on a certified place'
);

-- A valid insert gets the defaults.
insert into public.places (id, name, category, area, price_range, instagram_handle, updated_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'Schema Test Studio (sample)',
  'studio',
  'homewood',
  'moderate',
  'sample_studio',
  '2000-01-01 00:00:00+00'
);

select results_eq(
  $$select status::text, is_verified, tags::text[], submitted_by
    from public.places where id = '00000000-0000-4000-8000-000000000001'$$,
  $$values ('pending'::text, false, '{}'::text[], null::uuid)$$,
  'a new place is pending, unverified, untagged, and has no submitter when inserted by the owner role'
);

select lives_ok(
  $$insert into public.places (name, category, area, price_range, website_url, contact_email, tags)
    values ('Valid Contacts (sample)', 'run_club', 'lakeview', 'free',
            'https://example.com/run', 'hello@example.com', '{running,outdoor}')$$,
  'a place with valid website, email and tags is accepted'
);

-- updated_at moves on update.
update public.places
set name = 'Schema Test Studio Renamed (sample)'
where id = '00000000-0000-4000-8000-000000000001';

select cmp_ok(
  (select updated_at from public.places where id = '00000000-0000-4000-8000-000000000001'),
  '>',
  '2000-01-01 00:00:00+00'::timestamptz,
  'updated_at changes on update'
);

select * from finish();

rollback;
