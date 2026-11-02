-- Checks the admin actions: rejecting with a reason, adding a place by hand, and the
-- admin-only place_rejections table. Run with `supabase test db` against LOCAL Supabase.
-- Everything happens in one transaction and is rolled back.
--
-- Callers:
--   anon      not signed in
--   business  A = aaaaaaaa-... (signed in, not admin)
--   admin     adadadad-...
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

-- ---------------------------------------------------------------------------
-- place_rejections: RLS on, no policies, no API privileges.
-- ---------------------------------------------------------------------------
select is_empty(
  $$select 1 from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'place_rejections'
      and grantee in ('anon', 'authenticated')$$,
  'anon and authenticated have no privileges on place_rejections'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.place_rejections'::regclass),
  'place_rejections has row level security on'
);

select is_empty(
  $$select 1 from pg_policies where schemaname = 'public' and tablename = 'place_rejections'$$,
  'place_rejections has no policies'
);

-- ---------------------------------------------------------------------------
-- Setup, as postgres
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000000', 'business-a@example.com'),
  ('adadadad-0000-4000-8000-000000000000', 'admin@example.com');

insert into public.admins (user_id) values ('adadadad-0000-4000-8000-000000000000');

-- Pending places with fixed created_at values, so the queue order is known.
insert into public.places (id, name, category, area, price_range, contact_phone, status, submitted_by, created_at) values
  ('20000000-0000-4000-8000-000000000001', 'Queue Older (sample)', 'gym', 'hoover', 'budget', '205-555-0201', 'pending', 'aaaaaaaa-0000-4000-8000-000000000000', '2026-01-02 10:00:00+00'),
  ('20000000-0000-4000-8000-000000000002', 'Queue Newest (sample)', 'studio', 'homewood', 'moderate', '205-555-0202', 'pending', 'aaaaaaaa-0000-4000-8000-000000000000', '2026-01-03 10:00:00+00'),
  ('20000000-0000-4000-8000-000000000003', 'To Reject (sample)', 'trainer', 'downtown', 'premium', '205-555-0203', 'pending', 'aaaaaaaa-0000-4000-8000-000000000000', '2026-01-01 10:00:00+00'),
  ('20000000-0000-4000-8000-000000000004', 'Reject Then Restore (sample)', 'run_club', 'lakeview', 'free', '205-555-0204', 'pending', 'aaaaaaaa-0000-4000-8000-000000000000', '2026-01-01 09:00:00+00');

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select public.admin_reject_place('20000000-0000-4000-8000-000000000001', 'Spam')$$,
  '42501',
  null,
  'anon cannot call admin_reject_place'
);

select throws_ok(
  $$select public.admin_create_place(
      p_name => 'Anon Create (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0210')$$,
  '42501',
  null,
  'anon cannot call admin_create_place'
);

select throws_ok(
  $$select reason from public.place_rejections$$,
  '42501',
  null,
  'anon cannot read place_rejections'
);

-- ---------------------------------------------------------------------------
-- business A (not an admin)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.admin_reject_place('20000000-0000-4000-8000-000000000001', 'Spam')$$,
  '42501',
  'admin only',
  'a non-admin cannot reject a place'
);

select throws_ok(
  $$select public.admin_create_place(
      p_name => 'A Create (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0211', p_status => 'approved')$$,
  '42501',
  'admin only',
  'a non-admin cannot create a place through admin_create_place'
);

select throws_ok(
  $$select reason from public.place_rejections$$,
  '42501',
  null,
  'a non-admin cannot read place_rejections'
);

select throws_ok(
  $$insert into public.place_rejections (place_id, reason)
    values ('20000000-0000-4000-8000-000000000001', 'Spam')$$,
  '42501',
  null,
  'a non-admin cannot write place_rejections'
);

-- ---------------------------------------------------------------------------
-- admin: rejecting
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.admin_reject_place('20000000-0000-4000-8000-000000000003', '  Duplicate listing  ')$$,
  'the admin can reject a place with a reason'
);

select throws_ok(
  $$select public.admin_reject_place('20000000-0000-4000-8000-000000000001', '   ')$$,
  '22023',
  null,
  'a blank reason is refused'
);

select throws_ok(
  $$select public.admin_reject_place('20000000-0000-4000-8000-000000000001', null)$$,
  '22023',
  null,
  'a missing reason is refused'
);

select throws_ok(
  $$select public.admin_reject_place('20000000-0000-4000-8000-000000000001', repeat('x', 501))$$,
  '22023',
  null,
  'a reason over 500 characters is refused'
);

select lives_ok(
  $$select public.admin_reject_place('20000000-0000-4000-8000-000000000004', repeat('x', 500))$$,
  'a reason of exactly 500 characters is accepted'
);

select throws_ok(
  $$select public.admin_reject_place('99999999-0000-4000-8000-000000000000', 'Spam')$$,
  'P0002',
  null,
  'rejecting an unknown place raises P0002'
);

select throws_ok(
  $$select public.admin_set_place_status('20000000-0000-4000-8000-000000000001', 'rejected')$$,
  '22023',
  null,
  'admin_set_place_status refuses rejected, so every rejection has a reason'
);

select lives_ok(
  $$select public.admin_set_place_status('20000000-0000-4000-8000-000000000004', 'pending')$$,
  'a rejected place can be put back to pending'
);

select throws_ok(
  $$select reason from public.place_rejections$$,
  '42501',
  null,
  'even the admin cannot read place_rejections through the API'
);

-- Check the effects as the database owner.
reset role;

select results_eq(
  $$select id, status::text from public.places
    where id in ('20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003',
                 '20000000-0000-4000-8000-000000000004')
    order by id$$,
  $$values ('20000000-0000-4000-8000-000000000001'::uuid, 'pending'::text),
           ('20000000-0000-4000-8000-000000000003'::uuid, 'rejected'::text),
           ('20000000-0000-4000-8000-000000000004'::uuid, 'pending'::text)$$,
  'only the successful rejections changed a status, and the restored place is pending'
);

select results_eq(
  $$select reason, rejected_by from public.place_rejections
    where place_id = '20000000-0000-4000-8000-000000000003'$$,
  $$values ('Duplicate listing'::text, 'adadadad-0000-4000-8000-000000000000'::uuid)$$,
  'the rejection stores the trimmed reason and who rejected it'
);

select is(
  (select count(*)::int from public.place_rejections where place_id = '20000000-0000-4000-8000-000000000001'),
  0,
  'a refused rejection stores no reason'
);

-- ---------------------------------------------------------------------------
-- admin: creating by hand
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select isnt(
  public.admin_create_place(
    p_name => 'Hand Approved (sample)',
    p_category => 'studio',
    p_area => 'avondale',
    p_price_range => 'moderate',
    p_description => 'Entered by hand.',
    p_schedule => 'Mon-Fri 6am',
    p_website_url => 'https://example.com/hand-approved',
    p_instagram_handle => 'sample_hand_approved',
    p_tags => '{yoga,drop_in}',
    p_status => 'approved',
    p_is_verified => true
  ),
  null,
  'the admin can create an approved, verified place and gets its id back'
);

select isnt(
  public.admin_create_place(
    p_name => 'Hand Pending (sample)',
    p_category => 'gym',
    p_area => 'hoover',
    p_price_range => 'budget',
    p_contact_email => 'hand-pending@example.com'
  ),
  null,
  'the admin can create a place with the defaults'
);

select throws_ok(
  $$select public.admin_create_place(
      p_name => 'Hand Hidden (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0220', p_status => 'hidden')$$,
  '22023',
  null,
  'a new place cannot start hidden'
);

select throws_ok(
  $$select public.admin_create_place(
      p_name => 'Hand Rejected (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0221', p_status => 'rejected')$$,
  '22023',
  null,
  'a new place cannot start rejected'
);

select throws_ok(
  $$select public.admin_create_place(
      p_name => 'Hand No Contact (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget')$$,
  '23514',
  null,
  'a new place needs at least one contact method'
);

select throws_ok(
  $$select public.admin_create_place(
      p_name => 'Hand Bad URL (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_website_url => 'example.com')$$,
  '23514',
  null,
  'a website without http(s):// is refused'
);

reset role;

select results_eq(
  $$select status::text, is_verified, submitted_by is null, last_confirmed_at is not null, tags::text[]
    from public.places where name = 'Hand Approved (sample)'$$,
  $$values ('approved'::text, true, true, true, array['yoga', 'drop_in'])$$,
  'an approved hand-entered place is verified as asked, has no submitter and is confirmed now'
);

select results_eq(
  $$select status::text, is_verified, submitted_by is null, last_confirmed_at is null, tags::text[]
    from public.places where name = 'Hand Pending (sample)'$$,
  $$values ('pending'::text, false, true, true, '{}'::text[])$$,
  'a hand-entered place defaults to pending, unverified, unconfirmed and untagged'
);

-- ---------------------------------------------------------------------------
-- anon again: only the approved place is public
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select name from public.places
    where name in ('Hand Approved (sample)', 'Hand Pending (sample)')
       or id::text like '20000000-%'$$,
  $$values ('Hand Approved (sample)'::text)$$,
  'anon sees the approved hand-entered place, and no pending or rejected one'
);

-- ---------------------------------------------------------------------------
-- The admin queue: pending places, newest first
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select results_eq(
  $$select id from public.places
    where status = 'pending' and id::text like '20000000-%'
    order by created_at desc$$,
  $$values ('20000000-0000-4000-8000-000000000002'::uuid),
           ('20000000-0000-4000-8000-000000000001'::uuid),
           ('20000000-0000-4000-8000-000000000004'::uuid)$$,
  'the admin reads the pending queue newest first, without the rejected place'
);

reset role;

select * from finish();

rollback;
