-- Access checks for public.places and public.admins. Run with `supabase test db` against
-- LOCAL Supabase. Everything happens in one transaction and is rolled back.
--
-- Callers:
--   anon      not signed in
--   business  A = aaaaaaaa-..., B = bbbbbbbb-... (signed in, not admin)
--   admin     adadadad-...
begin;

create extension if not exists pgtap with schema extensions;

select plan(52);

-- ---------------------------------------------------------------------------
-- Column privileges: exactly the planned columns, nothing more.
-- Keep the select list in step with PUBLIC_PLACE_COLUMNS in src/lib/places.ts.
-- ---------------------------------------------------------------------------
select set_eq(
  $$select column_name::text from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'places' and grantee = 'anon' and privilege_type = 'SELECT'$$,
  array['id', 'name', 'category', 'description', 'area', 'price_range', 'schedule', 'website_url',
        'contact_phone', 'contact_email', 'instagram_handle', 'tags', 'status', 'is_verified',
        'last_confirmed_at', 'created_at', 'updated_at'],
  'anon may select every column except submitted_by and claimed_by'
);

select set_eq(
  $$select column_name::text from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'places' and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  array['id', 'name', 'category', 'description', 'area', 'price_range', 'schedule', 'website_url',
        'contact_phone', 'contact_email', 'instagram_handle', 'tags', 'status', 'is_verified',
        'last_confirmed_at', 'created_at', 'updated_at'],
  'authenticated may select every column except submitted_by and claimed_by'
);

select set_eq(
  $$select column_name::text from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'places' and grantee = 'authenticated' and privilege_type = 'INSERT'$$,
  array['name', 'category', 'description', 'area', 'price_range', 'schedule', 'website_url',
        'contact_phone', 'contact_email', 'instagram_handle', 'tags'],
  'authenticated may insert only the editable columns'
);

select set_eq(
  $$select column_name::text from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'places' and grantee = 'authenticated' and privilege_type = 'UPDATE'$$,
  array['name', 'category', 'description', 'area', 'price_range', 'schedule', 'website_url',
        'contact_phone', 'contact_email', 'instagram_handle', 'tags'],
  'authenticated may update only the editable columns'
);

select is_empty(
  $$select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'places' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE')$$,
  'anon may not insert or update any column'
);

select is_empty(
  $$select 1 from information_schema.table_privileges
    where table_schema = 'public' and table_name in ('places', 'admins')
      and grantee in ('anon', 'authenticated') and privilege_type in ('DELETE', 'TRUNCATE')$$,
  'nobody may delete or truncate places or admins through the API'
);

-- ---------------------------------------------------------------------------
-- Setup, as postgres
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000000', 'business-a@example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000000', 'business-b@example.com'),
  ('adadadad-0000-4000-8000-000000000000', 'admin@example.com');

insert into public.admins (user_id) values ('adadadad-0000-4000-8000-000000000000');

-- One place of each status from B, plus a pending and an approved place from A.
insert into public.places (id, name, category, area, price_range, contact_phone, status, submitted_by) values
  ('10000000-0000-4000-8000-000000000001', 'B Approved (sample)', 'gym', 'hoover', 'budget', '205-555-0101', 'approved', 'bbbbbbbb-0000-4000-8000-000000000000'),
  ('10000000-0000-4000-8000-000000000002', 'B Pending (sample)', 'studio', 'homewood', 'moderate', '205-555-0102', 'pending', 'bbbbbbbb-0000-4000-8000-000000000000'),
  ('10000000-0000-4000-8000-000000000003', 'B Rejected (sample)', 'trainer', 'downtown', 'premium', '205-555-0103', 'rejected', 'bbbbbbbb-0000-4000-8000-000000000000'),
  ('10000000-0000-4000-8000-000000000004', 'B Hidden (sample)', 'run_club', 'lakeview', 'free', '205-555-0104', 'hidden', 'bbbbbbbb-0000-4000-8000-000000000000'),
  ('10000000-0000-4000-8000-000000000005', 'A Pending (sample)', 'trainer', 'avondale', 'budget', '205-555-0105', 'pending', 'aaaaaaaa-0000-4000-8000-000000000000'),
  ('10000000-0000-4000-8000-000000000006', 'A Approved (sample)', 'gym', 'crestwood', 'budget', '205-555-0106', 'approved', 'aaaaaaaa-0000-4000-8000-000000000000');

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select id from public.places where id::text like '10000000-%' order by id$$,
  $$values ('10000000-0000-4000-8000-000000000001'::uuid), ('10000000-0000-4000-8000-000000000006'::uuid)$$,
  'anon sees only the approved places'
);

select is(
  (select count(*)::int from public.places where status <> 'approved'),
  0,
  'anon gets no pending, rejected or hidden place at all'
);

select throws_ok($$select submitted_by from public.places$$, '42501', null, 'anon cannot read submitted_by');
select throws_ok($$select claimed_by from public.places$$, '42501', null, 'anon cannot read claimed_by');
select throws_ok($$select * from public.places$$, '42501', null, 'anon cannot select *');

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone)
    values ('Anon Insert (sample)', 'gym', 'hoover', 'budget', '205-555-0110')$$,
  '42501',
  null,
  'anon cannot insert a place'
);

select throws_ok(
  $$update public.places set name = 'Anon Edit' where id = '10000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'anon cannot update a place'
);

select throws_ok(
  $$delete from public.places where id = '10000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'anon cannot delete a place'
);

select throws_ok(
  $$select public.admin_set_place_status('10000000-0000-4000-8000-000000000002', 'approved')$$,
  '42501',
  null,
  'anon cannot call admin_set_place_status'
);

select throws_ok(
  $$select public.admin_set_place_verified('10000000-0000-4000-8000-000000000001', true)$$,
  '42501',
  null,
  'anon cannot call admin_set_place_verified'
);

select throws_ok($$select public.is_admin()$$, '42501', null, 'anon cannot call is_admin');

select throws_ok($$select * from public.admins$$, '42501', null, 'anon cannot read admins');

-- ---------------------------------------------------------------------------
-- business A
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select is(public.is_admin(), false, 'business A is not an admin');

select results_eq(
  $$select id from public.places where id::text like '10000000-%' order by id$$,
  $$values ('10000000-0000-4000-8000-000000000001'::uuid),
           ('10000000-0000-4000-8000-000000000005'::uuid),
           ('10000000-0000-4000-8000-000000000006'::uuid)$$,
  'A sees approved places and its own pending one, not B''s pending, rejected or hidden places'
);

select lives_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone, tags)
    values ('A New Place (sample)', 'trainer', 'hoover', 'budget', '205-555-0199', '{beginner_friendly}')$$,
  'A can submit a place with the editable fields'
);

select results_eq(
  $$select status::text, is_verified from public.places where name = 'A New Place (sample)'$$,
  $$values ('pending'::text, false)$$,
  'a submitted place is pending and unverified, and A can see it'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone, status)
    values ('A Sneaky Approved (sample)', 'gym', 'hoover', 'budget', '205-555-0198', 'approved')$$,
  '42501',
  null,
  'A cannot set status on insert'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone, is_verified)
    values ('A Sneaky Verified (sample)', 'gym', 'hoover', 'budget', '205-555-0197', true)$$,
  '42501',
  null,
  'A cannot set is_verified on insert'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone, submitted_by)
    values ('A As B (sample)', 'gym', 'hoover', 'budget', '205-555-0196', 'bbbbbbbb-0000-4000-8000-000000000000')$$,
  '42501',
  null,
  'A cannot set submitted_by on insert'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone, last_confirmed_at)
    values ('A Confirmed (sample)', 'gym', 'hoover', 'budget', '205-555-0195', now())$$,
  '42501',
  null,
  'A cannot set last_confirmed_at on insert'
);

-- Updates
update public.places set name = 'A Pending Renamed (sample)' where id = '10000000-0000-4000-8000-000000000005';
update public.places set name = 'Taken Over by A' where id = '10000000-0000-4000-8000-000000000002';
update public.places set name = 'A Approved Edited' where id = '10000000-0000-4000-8000-000000000006';

select is(
  (select name from public.places where id = '10000000-0000-4000-8000-000000000005'),
  'A Pending Renamed (sample)',
  'A can edit its own pending place'
);

select is(
  (select name from public.places where id = '10000000-0000-4000-8000-000000000006'),
  'A Approved (sample)',
  'A cannot edit its own place once it is approved'
);

select throws_ok(
  $$update public.places set status = 'approved' where id = '10000000-0000-4000-8000-000000000005'$$,
  '42501',
  null,
  'A cannot update status'
);

select throws_ok(
  $$update public.places set is_verified = true where id = '10000000-0000-4000-8000-000000000005'$$,
  '42501',
  null,
  'A cannot update is_verified'
);

select throws_ok(
  $$update public.places set claimed_by = 'aaaaaaaa-0000-4000-8000-000000000000' where id = '10000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'A cannot set claimed_by'
);

select throws_ok(
  $$select public.admin_set_place_status('10000000-0000-4000-8000-000000000005', 'approved')$$,
  '42501',
  'admin only',
  'A cannot approve a place through admin_set_place_status'
);

select throws_ok(
  $$select public.admin_set_place_verified('10000000-0000-4000-8000-000000000005', true)$$,
  '42501',
  'admin only',
  'A cannot verify a place through admin_set_place_verified'
);

select throws_ok(
  $$delete from public.places where id = '10000000-0000-4000-8000-000000000005'$$,
  '42501',
  null,
  'A cannot delete its own place'
);

select throws_ok($$select submitted_by from public.places$$, '42501', null, 'A cannot read submitted_by');
select throws_ok($$select * from public.admins$$, '42501', null, 'A cannot read admins');

select throws_ok(
  $$insert into public.admins (user_id) values ('aaaaaaaa-0000-4000-8000-000000000000')$$,
  '42501',
  null,
  'A cannot make itself an admin'
);

-- Check the effects as the database owner.
reset role;

select is(
  (select submitted_by from public.places where name = 'A New Place (sample)'),
  'aaaaaaaa-0000-4000-8000-000000000000'::uuid,
  'a submitted place records the submitter'
);

select is(
  (select name from public.places where id = '10000000-0000-4000-8000-000000000002'),
  'B Pending (sample)',
  'A cannot edit B''s pending place'
);

-- ---------------------------------------------------------------------------
-- admin
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select is(public.is_admin(), true, 'the admin is an admin');

select set_eq(
  $$select distinct status::text from public.places where id::text like '10000000-%'$$,
  $$values ('pending'::text), ('approved'), ('rejected'), ('hidden')$$,
  'the admin sees places of every status'
);

select lives_ok(
  $$select public.admin_set_place_status('10000000-0000-4000-8000-000000000002', 'approved')$$,
  'the admin can approve a pending place'
);

select results_eq(
  $$select status::text, last_confirmed_at is not null
    from public.places where id = '10000000-0000-4000-8000-000000000002'$$,
  $$values ('approved'::text, true)$$,
  'approving sets status and last_confirmed_at'
);

select lives_ok(
  $$select public.admin_set_place_verified('10000000-0000-4000-8000-000000000002', true)$$,
  'the admin can verify a place'
);

select is(
  (select is_verified from public.places where id = '10000000-0000-4000-8000-000000000002'),
  true,
  'the place is now verified'
);

select throws_ok(
  $$update public.places set status = 'rejected' where id = '10000000-0000-4000-8000-000000000002'$$,
  '42501',
  null,
  'even the admin changes status only through the function'
);

update public.places set name = 'B Approved Fixed by Admin (sample)' where id = '10000000-0000-4000-8000-000000000001';

select is(
  (select name from public.places where id = '10000000-0000-4000-8000-000000000001'),
  'B Approved Fixed by Admin (sample)',
  'the admin can edit another user''s place'
);

select throws_ok(
  $$select public.admin_set_place_status('99999999-0000-4000-8000-000000000000', 'approved')$$,
  'P0002',
  null,
  'admin_set_place_status on an unknown place raises P0002'
);

select throws_ok(
  $$select public.admin_set_place_verified('99999999-0000-4000-8000-000000000000', true)$$,
  'P0002',
  null,
  'admin_set_place_verified on an unknown place raises P0002'
);

-- The newly approved place is public; hiding it takes it away again.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select count(*)::int from public.places where id = '10000000-0000-4000-8000-000000000002'),
  1,
  'anon sees the place once it is approved'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.admin_set_place_status('10000000-0000-4000-8000-000000000002', 'hidden')$$,
  'the admin can hide a place'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select count(*)::int from public.places where id = '10000000-0000-4000-8000-000000000002'),
  0,
  'anon no longer sees the hidden place'
);

reset role;

select * from finish();

rollback;
