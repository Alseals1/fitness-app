-- Checks place reports: the private place_reports table, submit_place_report (reasons, note
-- rules, approved-only, the device and per-place limits) and the admin's list and resolve
-- functions. Run with `supabase test db` against LOCAL Supabase. Everything happens in one
-- transaction and is rolled back.
--
-- Callers:
--   anon      not signed in
--   user      A = aaaaaaaa-... (signed in, not admin)
--   admin     adadadad-...
--
-- Device ids are fixed sample UUIDs: de000000-...-0000000000NN.
begin;

create extension if not exists pgtap with schema extensions;

select plan(59);

-- ---------------------------------------------------------------------------
-- place_reports: RLS on, no policies, no API privileges, no reporter column.
-- ---------------------------------------------------------------------------
select is_empty(
  $$select 1 from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'place_reports'
      and grantee in ('anon', 'authenticated')$$,
  'anon and authenticated have no privileges on place_reports'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.place_reports'::regclass),
  'place_reports has row level security on'
);

select is_empty(
  $$select 1 from pg_policies where schemaname = 'public' and tablename = 'place_reports'$$,
  'place_reports has no policies'
);

select columns_are(
  'public',
  'place_reports',
  array['id', 'place_id', 'device_id', 'reason', 'note', 'created_at', 'resolved_at', 'resolution'],
  'place_reports stores nothing about the reporter beyond the device id'
);

select enum_has_labels(
  'public',
  'report_reason',
  array['closed', 'wrong_details', 'spam', 'other'],
  'the four report reasons'
);

select ok(
  not exists (
    select 1 from pg_proc
    where oid = 'public.admin_list_reports()'::regprocedure
      and 'device_id' = any (proargnames)
  ),
  'admin_list_reports does not return the device id'
);

-- ---------------------------------------------------------------------------
-- Setup, as postgres
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000000', 'user-a@example.com'),
  ('adadadad-0000-4000-8000-000000000000', 'admin@example.com');

insert into public.admins (user_id) values ('adadadad-0000-4000-8000-000000000000');

insert into public.places (id, name, category, area, price_range, contact_phone, status) values
  ('40000000-0000-4000-8000-000000000001', 'Report Gym 1 (sample)', 'gym', 'hoover', 'budget', '205-555-0401', 'approved'),
  ('40000000-0000-4000-8000-000000000002', 'Report Gym 2 (sample)', 'gym', 'hoover', 'budget', '205-555-0402', 'approved'),
  ('40000000-0000-4000-8000-000000000003', 'Report Gym 3 (sample)', 'gym', 'hoover', 'budget', '205-555-0403', 'approved'),
  ('40000000-0000-4000-8000-000000000004', 'Report Gym 4 (sample)', 'gym', 'hoover', 'budget', '205-555-0404', 'approved'),
  ('40000000-0000-4000-8000-000000000005', 'Report Gym 5 (sample)', 'gym', 'hoover', 'budget', '205-555-0405', 'approved'),
  ('40000000-0000-4000-8000-000000000006', 'Report Gym 6 (sample)', 'gym', 'hoover', 'budget', '205-555-0406', 'approved'),
  ('40000000-0000-4000-8000-000000000007', 'Report Pending (sample)', 'gym', 'hoover', 'budget', '205-555-0407', 'pending'),
  ('40000000-0000-4000-8000-000000000008', 'Report Rejected (sample)', 'gym', 'hoover', 'budget', '205-555-0408', 'rejected'),
  ('40000000-0000-4000-8000-000000000009', 'Report Hidden (sample)', 'gym', 'hoover', 'budget', '205-555-0409', 'hidden'),
  ('40000000-0000-4000-8000-000000000010', 'Report Crowded (sample)', 'gym', 'hoover', 'budget', '205-555-0410', 'approved');

-- ---------------------------------------------------------------------------
-- anon: no direct access, no admin functions
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$select note from public.place_reports$$, '42501', null, 'anon cannot read place_reports');

select throws_ok(
  $$insert into public.place_reports (place_id, device_id, reason)
    values ('40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000099', 'spam')$$,
  '42501', null, 'anon cannot insert into place_reports directly'
);

select throws_ok($$select * from public.admin_list_reports()$$, '42501', null, 'anon cannot call admin_list_reports');

select throws_ok(
  $$select public.admin_resolve_reports('40000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon cannot call admin_resolve_reports'
);

-- ---------------------------------------------------------------------------
-- anon: every reason, and the note rules
-- ---------------------------------------------------------------------------
select isnt(
  public.submit_place_report(
    '40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000001', 'closed',
    '  Shut down last month  '),
  null,
  'anon can report a place as closed and gets the report id back'
);

select lives_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000002', 'wrong_details', '   ')$$,
  'anon can report wrong details, with a blank note'
);

select lives_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000003', 'spam')$$,
  'anon can report spam, with no note'
);

select lives_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000004', 'other', 'Not a gym, a shop')$$,
  'anon can report other, with a note'
);

select throws_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000004', 'other')$$,
  '22023', 'a note is required for other', 'other without a note is refused'
);

select throws_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000004', 'other', '  ')$$,
  '22023', 'a note is required for other', 'other with a blank note is refused'
);

select throws_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000004', 'closed', repeat('x', 501))$$,
  '22023', 'note is too long (at most 500 characters)', 'a note over 500 characters is refused'
);

select lives_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000004', 'closed',
      ' ' || repeat('x', 500) || ' ')$$,
  'a note of exactly 500 characters after trimming is accepted'
);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000002', null, 'spam')$$,
  '22023', 'device id and reason are required', 'a missing device id is refused'
);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000005', null)$$,
  '22023', 'device id and reason are required', 'a missing reason is refused'
);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000005', 'rude')$$,
  '22P02', null, 'an unknown reason is refused'
);

-- ---------------------------------------------------------------------------
-- anon: only approved places
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000007', 'de000000-0000-4000-8000-000000000005', 'spam')$$,
  'P0002', null, 'a pending place cannot be reported'
);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000008', 'de000000-0000-4000-8000-000000000005', 'spam')$$,
  'P0002', null, 'a rejected place cannot be reported'
);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000009', 'de000000-0000-4000-8000-000000000005', 'spam')$$,
  'P0002', null, 'a hidden place cannot be reported'
);

select throws_ok(
  $$select public.submit_place_report('49999999-0000-4000-8000-000000000000', 'de000000-0000-4000-8000-000000000005', 'spam')$$,
  'P0002', null, 'an unknown place cannot be reported'
);

-- ---------------------------------------------------------------------------
-- anon: one open report per device per place
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000001', 'spam')$$,
  'PT409', 'already reported', 'the same device cannot report the same place twice while it is open'
);

-- ---------------------------------------------------------------------------
-- What was stored, as postgres
-- ---------------------------------------------------------------------------
reset role;

select results_eq(
  $$select r.reason::text, r.note from public.place_reports r
    where r.place_id = '40000000-0000-4000-8000-000000000001'
    order by r.reason$$,
  $$values
    ('closed'::text, 'Shut down last month'::text),
    ('wrong_details', null),
    ('spam', null),
    ('other', 'Not a gym, a shop')$$,
  'notes are trimmed, a blank note is stored as null, every reason is stored'
);

select is(
  (select char_length(note) from public.place_reports
    where place_id = '40000000-0000-4000-8000-000000000002'
      and device_id = 'de000000-0000-4000-8000-000000000004'),
  500,
  'a 500-character note is stored trimmed'
);

select ok(
  (select bool_and(resolved_at is null and resolution is null) from public.place_reports),
  'new reports are open'
);

-- ---------------------------------------------------------------------------
-- user A (signed in, not admin): can report, cannot read or resolve
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000003', 'de000000-0000-4000-8000-000000000006', 'wrong_details', 'Wrong phone')$$,
  'a signed-in user can report too'
);

select throws_ok($$select note from public.place_reports$$, '42501', null, 'a signed-in user cannot read place_reports');
select throws_ok($$select * from public.admin_list_reports()$$, '42501', 'admin only', 'a signed-in user cannot list reports');

select throws_ok(
  $$select public.admin_resolve_reports('40000000-0000-4000-8000-000000000003')$$,
  '42501', 'admin only', 'a signed-in user cannot resolve reports'
);

-- ---------------------------------------------------------------------------
-- Device limit: 5 reports per device in any rolling 24 hours
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select lives_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000010', 'spam')$$,
  'device L report 1 of 5 is accepted'
);

select lives_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000010', 'spam')$$,
  'device L report 2 of 5 is accepted'
);

select lives_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000003', 'de000000-0000-4000-8000-000000000010', 'spam')$$,
  'device L report 3 of 5 is accepted'
);

select lives_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000004', 'de000000-0000-4000-8000-000000000010', 'spam')$$,
  'device L report 4 of 5 is accepted'
);

select lives_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000005', 'de000000-0000-4000-8000-000000000010', 'spam')$$,
  'device L report 5 of 5 is accepted'
);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000006', 'de000000-0000-4000-8000-000000000010', 'spam')$$,
  'PT429', 'too many reports', 'device L report 6 in 24 hours is refused with PT429'
);

select lives_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000006', 'de000000-0000-4000-8000-000000000011', 'spam')$$,
  'another device is not affected by device L''s limit'
);

-- Move device L's reports back 25 hours: the window has passed.
reset role;
update public.place_reports
set created_at = now() - interval '25 hours'
where device_id = 'de000000-0000-4000-8000-000000000010';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select lives_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000006', 'de000000-0000-4000-8000-000000000010', 'closed')$$,
  'after 24 hours device L may report again'
);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000010', 'closed')$$,
  'PT409', 'already reported', 'an old report that is still open still blocks a second one on the same place'
);

-- ---------------------------------------------------------------------------
-- Per-place cap: at most 50 open reports per place
-- ---------------------------------------------------------------------------
reset role;
insert into public.place_reports (place_id, device_id, reason)
select '40000000-0000-4000-8000-000000000010', gen_random_uuid(), 'spam'
from generate_series(1, 49);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select lives_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000010', 'de000000-0000-4000-8000-000000000020', 'closed')$$,
  'report 50 on a place is accepted'
);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000010', 'de000000-0000-4000-8000-000000000021', 'closed')$$,
  'PT429', 'too many open reports on this place', 'report 51 on a place is refused with PT429, from a fresh device'
);

-- ---------------------------------------------------------------------------
-- admin: list
-- ---------------------------------------------------------------------------
reset role;

select set_config(
  'test.open_count',
  (select count(*)::text from public.place_reports where resolved_at is null),
  true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.admin_list_reports()),
  current_setting('test.open_count')::int,
  'the admin sees every open report'
);

select ok(
  (select bool_and(a.created_at >= b.created_at)
    from public.admin_list_reports() with ordinality as a (id, place_id, place_name, place_category, place_status, reason, note, created_at, n)
    join public.admin_list_reports() with ordinality as b (id, place_id, place_name, place_category, place_status, reason, note, created_at, n)
      on b.n = a.n + 1),
  'the admin list is newest first'
);

select results_eq(
  $$select place_name, place_category::text, place_status::text, reason::text, note
    from public.admin_list_reports()
    where place_id = '40000000-0000-4000-8000-000000000003' and note is not null$$,
  $$values ('Report Gym 3 (sample)'::text, 'gym'::text, 'approved'::text, 'wrong_details'::text, 'Wrong phone'::text)$$,
  'each report carries its place''s name, category and status'
);

-- ---------------------------------------------------------------------------
-- admin: dismiss
-- ---------------------------------------------------------------------------
select lives_ok(
  $$select public.admin_resolve_reports('40000000-0000-4000-8000-000000000001')$$,
  'the admin can dismiss the reports on a place'
);

select is_empty(
  $$select 1 from public.admin_list_reports() where place_id = '40000000-0000-4000-8000-000000000001'$$,
  'dismissed reports leave the list'
);

reset role;

select results_eq(
  $$select distinct p.status::text, r.resolution::text, r.resolved_at is not null
    from public.place_reports r join public.places p on p.id = r.place_id
    where p.id = '40000000-0000-4000-8000-000000000001'$$,
  $$values ('approved'::text, 'dismissed'::text, true)$$,
  'dismissing resolves every report as dismissed and leaves the place approved'
);

select is(
  (select count(*)::int from public.place_reports
    where place_id = '40000000-0000-4000-8000-000000000002' and resolved_at is null),
  2,
  'dismissing one place leaves other places'' reports open'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select lives_ok(
  $$select public.submit_place_report(
      '40000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000001', 'closed', 'Still closed')$$,
  'after a dismissal the same device may report the same place again'
);

-- ---------------------------------------------------------------------------
-- admin: hide
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.admin_resolve_reports('40000000-0000-4000-8000-000000000002', true)$$,
  'the admin can hide a reported place'
);

select is_empty(
  $$select 1 from public.admin_list_reports() where place_id = '40000000-0000-4000-8000-000000000002'$$,
  'reports on a hidden place leave the list'
);

select results_eq(
  $$select count(*)::int from public.admin_list_reports() where place_id = '40000000-0000-4000-8000-000000000001'$$,
  $$values (1)$$,
  'a new report after a dismissal is listed'
);

select throws_ok(
  $$select public.admin_resolve_reports('49999999-0000-4000-8000-000000000000')$$,
  'P0002', null, 'resolving an unknown place raises P0002'
);

reset role;

select results_eq(
  $$select distinct p.status::text, r.resolution::text
    from public.place_reports r join public.places p on p.id = r.place_id
    where p.id = '40000000-0000-4000-8000-000000000002'$$,
  $$values ('hidden'::text, 'hidden'::text)$$,
  'hiding sets the place to hidden and resolves every report as hidden'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select public.submit_place_report('40000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000030', 'spam')$$,
  'P0002', null, 'a hidden place can no longer be reported'
);

select is_empty(
  $$select 1 from public.places where id = '40000000-0000-4000-8000-000000000002'$$,
  'the public no longer sees the hidden place'
);

select * from finish();

rollback;
