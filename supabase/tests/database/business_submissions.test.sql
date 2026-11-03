-- Checks business submissions: submitting a new place, claiming an approved one, the private
-- place_submissions table, the 5 per 24 hours limit, the admin's claim and certify actions.
-- Run with `supabase test db` against LOCAL Supabase. Everything happens in one transaction
-- and is rolled back.
--
-- Callers:
--   anon      not signed in
--   business  A = aaaaaaaa-..., C = cccccccc-... (signed in, not admin; C tests the rate limit)
--   admin     adadadad-...
begin;

create extension if not exists pgtap with schema extensions;

select plan(83);

-- ---------------------------------------------------------------------------
-- place_submissions: RLS on, no policies, no API privileges.
-- ---------------------------------------------------------------------------
select is_empty(
  $$select 1 from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'place_submissions'
      and grantee in ('anon', 'authenticated')$$,
  'anon and authenticated have no privileges on place_submissions'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.place_submissions'::regclass),
  'place_submissions has row level security on'
);

select is_empty(
  $$select 1 from pg_policies where schemaname = 'public' and tablename = 'place_submissions'$$,
  'place_submissions has no policies'
);

-- ---------------------------------------------------------------------------
-- Setup, as postgres
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000000', 'business-a@example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000000', 'business-b@example.com'),
  ('cccccccc-0000-4000-8000-000000000000', 'business-c@example.com'),
  ('adadadad-0000-4000-8000-000000000000', 'admin@example.com');

insert into public.admins (user_id) values ('adadadad-0000-4000-8000-000000000000');

insert into public.places (id, name, category, area, price_range, contact_phone, status, submitted_by, claimed_by) values
  ('30000000-0000-4000-8000-000000000001', 'Claim Gym (sample)', 'gym', 'hoover', 'budget', '205-555-0301', 'approved', null, null),
  ('30000000-0000-4000-8000-000000000002', 'Claim Trainer (sample)', 'trainer', 'downtown', 'premium', '205-555-0302', 'approved', null, null),
  ('30000000-0000-4000-8000-000000000003', 'Claim Studio (sample)', 'studio', 'homewood', 'moderate', '205-555-0303', 'approved', null, null),
  ('30000000-0000-4000-8000-000000000004', 'Pending Place (sample)', 'gym', 'hoover', 'budget', '205-555-0304', 'pending', 'bbbbbbbb-0000-4000-8000-000000000000', null),
  ('30000000-0000-4000-8000-000000000005', 'Rejected Place (sample)', 'gym', 'hoover', 'budget', '205-555-0305', 'rejected', 'bbbbbbbb-0000-4000-8000-000000000000', null),
  ('30000000-0000-4000-8000-000000000006', 'Hidden Place (sample)', 'gym', 'hoover', 'budget', '205-555-0306', 'hidden', 'bbbbbbbb-0000-4000-8000-000000000000', null),
  ('30000000-0000-4000-8000-000000000007', 'Owned By A (sample)', 'run_club', 'lakeview', 'free', '205-555-0307', 'approved', null, 'aaaaaaaa-0000-4000-8000-000000000000'),
  ('30000000-0000-4000-8000-000000000008', 'Certify Trainer (sample)', 'trainer', 'avondale', 'budget', '205-555-0308', 'approved', null, null);

-- ---------------------------------------------------------------------------
-- anon: may not execute any of the new functions
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Anon Submit (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0310',
      p_verification_email => 'owner@example.com')$$,
  '42501', null, 'anon cannot call submit_new_place'
);

select throws_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000001', 'owner@example.com')$$,
  '42501', null, 'anon cannot call submit_place_claim'
);

select throws_ok($$select public.enforce_submission_limit()$$, '42501', null, 'anon cannot call enforce_submission_limit');
select throws_ok($$select * from public.admin_list_submissions()$$, '42501', null, 'anon cannot call admin_list_submissions');

select throws_ok(
  $$select public.admin_approve_claim('99999999-0000-4000-8000-000000000000')$$,
  '42501', null, 'anon cannot call admin_approve_claim'
);

select throws_ok(
  $$select public.admin_reject_claim('99999999-0000-4000-8000-000000000000', 'No proof')$$,
  '42501', null, 'anon cannot call admin_reject_claim'
);

select throws_ok(
  $$select public.admin_set_place_certified('30000000-0000-4000-8000-000000000008', 'NASM-CPT')$$,
  '42501', null, 'anon cannot call admin_set_place_certified'
);

select throws_ok($$select note from public.place_submissions$$, '42501', null, 'anon cannot read place_submissions');

-- ---------------------------------------------------------------------------
-- business A: submitting a new place
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.enforce_submission_limit()$$,
  '42501', null, 'a signed-in user cannot call enforce_submission_limit directly'
);

select isnt(
  public.submit_new_place(
    p_name => '  A Submitted Studio (sample)  ',
    p_category => 'studio',
    p_area => 'avondale',
    p_price_range => 'moderate',
    p_description => 'A small studio.',
    p_website_url => 'https://example.com/a-studio',
    p_tags => '{yoga,beginner_friendly}',
    p_verification_email => '  owner-a@example.com ',
    p_verification_social => 'instagram.com/a_studio_sample',
    p_note => 'I own it.'
  ),
  null,
  'A can submit a new place and gets its id back'
);

select results_eq(
  $$select name from public.places where name = 'A Submitted Studio (sample)'$$,
  $$values ('A Submitted Studio (sample)'::text)$$,
  'A sees its own pending submission, with the name trimmed'
);

select isnt(
  public.submit_new_place(
    p_name => 'A Submitted Trainer (sample)',
    p_category => 'trainer',
    p_area => 'hoover',
    p_price_range => 'premium',
    p_contact_phone => '205-555-0311',
    p_verification_social => 'facebook.com/a-trainer-sample',
    p_certification_name => ' ACE Personal Trainer '
  ),
  null,
  'A can submit a trainer with a certification name'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'No Verification (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312')$$,
  '23514', null, 'a submission without a verification contact is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Blank Verification (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312',
      p_verification_email => '   ', p_verification_social => '')$$,
  '23514', null, 'blank verification contacts count as missing'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Bad Verification Email (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312',
      p_verification_email => 'not-an-email')$$,
  '23514', null, 'a badly formed verification email is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Long Verification Email (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312',
      p_verification_email => repeat('x', 250) || '@example.com')$$,
  '23514', null, 'a verification email over 254 characters is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Long Social (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312',
      p_verification_social => repeat('x', 201))$$,
  '23514', null, 'a social account over 200 characters is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Control Social (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312',
      p_verification_social => 'instagram.com/a' || chr(10) || 'b')$$,
  '23514', null, 'a social account with a control character is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Long Note (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312',
      p_verification_email => 'owner@example.com', p_note => repeat('x', 501))$$,
  '23514', null, 'a note over 500 characters is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Long Certification (sample)', p_category => 'trainer', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312',
      p_verification_email => 'owner@example.com', p_certification_name => repeat('x', 121))$$,
  '23514', null, 'a certification name over 120 characters is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Certified Studio (sample)', p_category => 'studio', p_area => 'hoover',
      p_price_range => 'budget', p_contact_phone => '205-555-0312',
      p_verification_email => 'owner@example.com', p_certification_name => 'RYT-200')$$,
  '22023', null, 'only a trainer can send a certification name'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Long Website (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_website_url => 'https://example.com/' || repeat('x', 2029),
      p_verification_email => 'owner@example.com')$$,
  '22023', null, 'a website over 2048 characters is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'Long Email (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_contact_email => repeat('x', 243) || '@example.com',
      p_verification_email => 'owner@example.com')$$,
  '22023', null, 'a public email over 254 characters is refused'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'No Contact (sample)', p_category => 'gym', p_area => 'hoover',
      p_price_range => 'budget', p_verification_email => 'owner@example.com')$$,
  '23514', null, 'the place still needs a public contact method'
);

select throws_ok(
  $$insert into public.places (name, category, area, price_range, contact_phone)
    values ('A Direct Insert (sample)', 'gym', 'hoover', 'budget', '205-555-0313')$$,
  '42501', null, 'A cannot insert into places directly: the submit function is the only path'
);

select throws_ok($$select note from public.place_submissions$$, '42501', null, 'A cannot read place_submissions, not even its own');

select throws_ok(
  $$insert into public.place_submissions (kind, place_id, verification_email)
    values ('claim', '30000000-0000-4000-8000-000000000001', 'owner@example.com')$$,
  '42501', null, 'A cannot write place_submissions directly'
);

select throws_ok(
  $$update public.places set is_certified = true, certification_name = 'Fake'
    where name = 'A Submitted Trainer (sample)'$$,
  '42501', null, 'A cannot set is_certified or certification_name on its own pending place'
);

-- ---------------------------------------------------------------------------
-- anon: a submitted place is not public
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is_empty(
  $$select 1 from public.places where name in ('A Submitted Studio (sample)', 'A Submitted Trainer (sample)')$$,
  'anon does not see a submitted place'
);

-- ---------------------------------------------------------------------------
-- Effects of the submissions, as postgres
-- ---------------------------------------------------------------------------
reset role;

select results_eq(
  $$select status::text, is_verified, is_certified, certification_name, submitted_by, claimed_by
    from public.places where name = 'A Submitted Studio (sample)'$$,
  $$values ('pending'::text, false, false, null::text, 'aaaaaaaa-0000-4000-8000-000000000000'::uuid, null::uuid)$$,
  'a submitted place starts pending, unverified, uncertified, unclaimed, with A as submitter'
);

select results_eq(
  $$select status::text, is_verified, is_certified, certification_name
    from public.places where name = 'A Submitted Trainer (sample)'$$,
  $$values ('pending'::text, false, false, null::text)$$,
  'a trainer''s certification name does not make the place certified'
);

select results_eq(
  $$select s.kind::text, s.submitted_by, s.verification_email, s.verification_social,
           s.certification_name, s.note, s.claim_status::text
    from public.place_submissions s join public.places p on p.id = s.place_id
    where p.name = 'A Submitted Studio (sample)'$$,
  $$values ('new_place'::text, 'aaaaaaaa-0000-4000-8000-000000000000'::uuid, 'owner-a@example.com'::text,
            'instagram.com/a_studio_sample'::text, null::text, 'I own it.'::text, null::text)$$,
  'the submission stores the trimmed verification contact and note, privately'
);

select is(
  (select s.certification_name from public.place_submissions s join public.places p on p.id = s.place_id
   where p.name = 'A Submitted Trainer (sample)'),
  'ACE Personal Trainer',
  'the trainer''s certification name is kept, trimmed, on the submission'
);

select is(
  (select count(*)::int from public.places
   where name in ('No Verification (sample)', 'Blank Verification (sample)', 'Long Note (sample)',
                  'Certified Studio (sample)', 'No Contact (sample)')),
  0,
  'a refused submission leaves no place behind'
);

-- ---------------------------------------------------------------------------
-- business A: claiming
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000004', 'owner@example.com')$$,
  'P0002', null, 'a pending place cannot be claimed (it looks missing)'
);

select throws_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000005', 'owner@example.com')$$,
  'P0002', null, 'a rejected place cannot be claimed'
);

select throws_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000006', 'owner@example.com')$$,
  'P0002', null, 'a hidden place cannot be claimed'
);

select throws_ok(
  $$select public.submit_place_claim('99999999-0000-4000-8000-000000000000', 'owner@example.com')$$,
  'P0002', null, 'an unknown place cannot be claimed'
);

select throws_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000001')$$,
  '23514', null, 'a claim without a verification contact is refused'
);

select throws_ok(
  $$select public.submit_place_claim(
      '30000000-0000-4000-8000-000000000003', 'owner@example.com', p_certification_name => 'RYT-200')$$,
  '22023', null, 'a claim on a non-trainer cannot send a certification name'
);

select throws_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000007', 'owner@example.com')$$,
  '22023', null, 'A cannot claim a place it already manages'
);

select isnt(
  public.submit_place_claim(
    '30000000-0000-4000-8000-000000000001',
    p_verification_email => 'owner-gym@example.com',
    p_note => 'I run this gym.'
  ),
  null,
  'A can claim an approved place and gets the claim id back'
);

select throws_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000001', 'owner-gym@example.com')$$,
  '23505', null, 'A cannot have two pending claims on the same place'
);

select isnt(
  public.submit_place_claim(
    '30000000-0000-4000-8000-000000000002',
    p_verification_social => 'instagram.com/claim_trainer_sample',
    p_certification_name => 'NASM-CPT'
  ),
  null,
  'A can claim an approved trainer with a certification name'
);

-- The claimed place is still public and unchanged.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select status::text, is_certified from public.places where id = '30000000-0000-4000-8000-000000000001'$$,
  $$values ('approved'::text, false)$$,
  'a place with a pending claim stays approved and public'
);

reset role;

select results_eq(
  $$select p.status::text, p.claimed_by, s.claim_status::text, s.verification_email, s.note
    from public.place_submissions s join public.places p on p.id = s.place_id
    where s.kind = 'claim' and p.id = '30000000-0000-4000-8000-000000000001'$$,
  $$values ('approved'::text, null::uuid, 'pending'::text, 'owner-gym@example.com'::text, 'I run this gym.'::text)$$,
  'a claim is stored as pending and does not set claimed_by'
);

-- ---------------------------------------------------------------------------
-- Rate limit: business C may make 5 submissions in 24 hours, not 6
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.submit_new_place(
      p_name => 'C Place 1 (sample)', p_category => 'gym', p_area => 'hoover', p_price_range => 'budget',
      p_contact_phone => '205-555-0321', p_verification_email => 'c@example.com')$$,
  'C submission 1 of 5 is accepted'
);

select lives_ok(
  $$select public.submit_new_place(
      p_name => 'C Place 2 (sample)', p_category => 'gym', p_area => 'hoover', p_price_range => 'budget',
      p_contact_phone => '205-555-0322', p_verification_email => 'c@example.com')$$,
  'C submission 2 of 5 is accepted'
);

select lives_ok(
  $$select public.submit_new_place(
      p_name => 'C Place 3 (sample)', p_category => 'gym', p_area => 'hoover', p_price_range => 'budget',
      p_contact_phone => '205-555-0323', p_verification_email => 'c@example.com')$$,
  'C submission 3 of 5 is accepted'
);

select lives_ok(
  $$select public.submit_new_place(
      p_name => 'C Place 4 (sample)', p_category => 'gym', p_area => 'hoover', p_price_range => 'budget',
      p_contact_phone => '205-555-0324', p_verification_email => 'c@example.com')$$,
  'C submission 4 of 5 is accepted'
);

select lives_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000003', 'c@example.com')$$,
  'C submission 5 of 5 (a claim) is accepted'
);

select throws_ok(
  $$select public.submit_new_place(
      p_name => 'C Place 6 (sample)', p_category => 'gym', p_area => 'hoover', p_price_range => 'budget',
      p_contact_phone => '205-555-0326', p_verification_email => 'c@example.com')$$,
  'PT429', 'too many submissions', 'C submission 6 in 24 hours is refused with PT429'
);

select throws_ok(
  $$select public.submit_place_claim('30000000-0000-4000-8000-000000000002', 'c@example.com')$$,
  'PT429', 'too many submissions', 'a claim counts toward the same limit'
);

-- Move C's submissions back 25 hours: the window has passed.
reset role;
update public.place_submissions
set created_at = now() - interval '25 hours'
where submitted_by = 'cccccccc-0000-4000-8000-000000000000';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.submit_new_place(
      p_name => 'C Place 7 (sample)', p_category => 'gym', p_area => 'hoover', p_price_range => 'budget',
      p_contact_phone => '205-555-0327', p_verification_email => 'c@example.com')$$,
  'after 24 hours C may submit again'
);

-- ---------------------------------------------------------------------------
-- business A: no admin actions
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select throws_ok($$select * from public.admin_list_submissions()$$, '42501', 'admin only', 'A cannot list submissions');

select throws_ok(
  $$select public.admin_approve_claim('99999999-0000-4000-8000-000000000000')$$,
  '42501', 'admin only', 'A cannot approve a claim'
);

select throws_ok(
  $$select public.admin_reject_claim('99999999-0000-4000-8000-000000000000', 'No proof')$$,
  '42501', 'admin only', 'A cannot reject a claim'
);

select throws_ok(
  $$select public.admin_set_place_certified('30000000-0000-4000-8000-000000000008', 'NASM-CPT')$$,
  '42501', 'admin only', 'A cannot mark a place certified'
);

-- ---------------------------------------------------------------------------
-- admin: the submissions queue
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select set_eq(
  $$select kind::text, place_name from public.admin_list_submissions()
    where account_email = 'business-a@example.com'$$,
  $$values ('new_place'::text, 'A Submitted Studio (sample)'::text),
           ('new_place', 'A Submitted Trainer (sample)'),
           ('claim', 'Claim Gym (sample)'),
           ('claim', 'Claim Trainer (sample)')$$,
  'the admin sees A''s pending new places and pending claims'
);

select results_eq(
  $$select place_category::text, place_status::text, place_is_claimed, verification_email,
           verification_social, certification_name, note
    from public.admin_list_submissions() where place_name = 'A Submitted Studio (sample)'$$,
  $$values ('studio'::text, 'pending'::text, false, 'owner-a@example.com'::text,
            'instagram.com/a_studio_sample'::text, null::text, 'I own it.'::text)$$,
  'the admin sees the private verification details'
);

select lives_ok(
  $$select public.admin_set_place_status(
      (select id from public.places where name = 'A Submitted Studio (sample)'), 'approved')$$,
  'the admin approves a new place with the existing action'
);

select is_empty(
  $$select 1 from public.admin_list_submissions() where place_name = 'A Submitted Studio (sample)'$$,
  'an approved new place leaves the submissions queue'
);

select lives_ok(
  $$select public.admin_approve_claim(
      (select id from public.admin_list_submissions()
       where kind = 'claim' and place_id = '30000000-0000-4000-8000-000000000001'))$$,
  'the admin approves A''s claim on the gym'
);

select throws_ok(
  $$select public.admin_reject_claim(
      (select id from public.admin_list_submissions()
       where kind = 'claim' and place_id = '30000000-0000-4000-8000-000000000002'), '   ')$$,
  '22023', null, 'a claim rejection needs a reason'
);

select lives_ok(
  $$select public.admin_reject_claim(
      (select id from public.admin_list_submissions()
       where kind = 'claim' and place_id = '30000000-0000-4000-8000-000000000002'), '  No proof of ownership  ')$$,
  'the admin rejects A''s claim on the trainer with a reason'
);

select throws_ok(
  $$select public.admin_approve_claim('99999999-0000-4000-8000-000000000000')$$,
  'P0002', null, 'approving a missing claim raises P0002'
);

select is_empty(
  $$select 1 from public.admin_list_submissions()
    where kind = 'claim' and place_id in ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002')$$,
  'decided claims leave the queue'
);

reset role;

select results_eq(
  $$select id, claimed_by from public.places
    where id in ('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002')
    order by id$$,
  $$values ('30000000-0000-4000-8000-000000000001'::uuid, 'aaaaaaaa-0000-4000-8000-000000000000'::uuid),
           ('30000000-0000-4000-8000-000000000002'::uuid, null::uuid)$$,
  'an approved claim sets claimed_by; a rejected one leaves the place untouched'
);

select results_eq(
  $$select claim_status::text, claim_rejection_reason, reviewed_at is not null
    from public.place_submissions
    where kind = 'claim' and place_id = '30000000-0000-4000-8000-000000000002'
      and submitted_by = 'aaaaaaaa-0000-4000-8000-000000000000'$$,
  $$values ('rejected'::text, 'No proof of ownership'::text, true)$$,
  'a rejected claim stores the trimmed reason and when it was reviewed'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select throws_ok(
  $$select note from public.place_submissions$$,
  '42501', null, 'even the admin cannot read place_submissions directly'
);

reset role;

-- A decided claim cannot be approved again (looked up as postgres, called as admin).
select set_config(
  'test.rejected_claim',
  (select id::text from public.place_submissions
   where kind = 'claim' and place_id = '30000000-0000-4000-8000-000000000002'
     and submitted_by = 'aaaaaaaa-0000-4000-8000-000000000000'),
  true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.admin_approve_claim(current_setting('test.rejected_claim')::uuid)$$,
  'P0002', null, 'a decided claim cannot be approved again'
);

-- ---------------------------------------------------------------------------
-- admin: certified
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select public.admin_set_place_certified('30000000-0000-4000-8000-000000000003', 'RYT-200')$$,
  '22023', null, 'only a trainer can be certified'
);

select throws_ok(
  $$select public.admin_set_place_certified('30000000-0000-4000-8000-000000000008', '   ')$$,
  '22023', null, 'certifying needs a name'
);

select throws_ok(
  $$select public.admin_set_place_certified('30000000-0000-4000-8000-000000000008', repeat('x', 121))$$,
  '22023', null, 'a certification name over 120 characters is refused'
);

select throws_ok(
  $$select public.admin_set_place_certified('99999999-0000-4000-8000-000000000000', 'NASM-CPT')$$,
  'P0002', null, 'certifying an unknown place raises P0002'
);

select lives_ok(
  $$select public.admin_set_place_certified('30000000-0000-4000-8000-000000000008', '  NASM-CPT  ')$$,
  'the admin marks a trainer certified'
);

select throws_ok(
  $$update public.places set is_certified = false, certification_name = null
    where id = '30000000-0000-4000-8000-000000000008'$$,
  '42501', null, 'even the admin changes certified only through the function'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select is_certified, certification_name from public.places where id = '30000000-0000-4000-8000-000000000008'$$,
  $$values (true, 'NASM-CPT'::text)$$,
  'anon reads the certified mark and the trimmed name'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"adadadad-0000-4000-8000-000000000000","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.admin_set_place_certified('30000000-0000-4000-8000-000000000008', null)$$,
  'the admin removes the certified mark'
);

select results_eq(
  $$select is_certified, certification_name from public.places where id = '30000000-0000-4000-8000-000000000008'$$,
  $$values (false, null::text)$$,
  'removing the mark clears both columns'
);

reset role;

select * from finish();

rollback;
