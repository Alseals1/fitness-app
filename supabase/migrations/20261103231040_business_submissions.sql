-- Business submissions: a signed-in business submits a new place or claims an approved one,
-- with private contact details an admin uses to verify them. Also adds an admin-only
-- "certified" mark for trainers.
--
-- Who can do what:
--   * A signed-in user (a business) calls submit_new_place or submit_place_claim. These two
--     functions are the only way to submit: direct insert on public.places is revoked.
--       - submit_new_place always stores the place as pending, unverified, uncertified, with
--         submitted_by = the caller. It has no parameter for status, verified, certified,
--         sponsored or claimed.
--       - submit_place_claim works only on an approved place, and never changes the place:
--         it stays approved and public, and claimed_by is unchanged while the claim waits.
--       - Both need at least one verification contact (business email or official social
--         account), and allow at most 5 submissions per account in any rolling 24 hours
--         (SQLSTATE PT429 after that).
--   * Nobody reads or writes public.place_submissions through the API, not even the business
--     that sent it. It has RLS on, no policies and no privileges, so a public query can never
--     return a verification contact. The admin reads it through admin_list_submissions().
--   * Only an admin (a row in public.admins) approves or rejects a claim (admin_approve_claim,
--     admin_reject_claim), which is the only way claimed_by is set, and marks a trainer
--     certified (admin_set_place_certified) after seeing proof off-app.
--   * Everyone reads is_certified and certification_name on approved places. Nobody writes
--     them through the API except admin_set_place_certified.
--   * A new listing is still approved or rejected with admin_set_place_status and
--     admin_reject_place. Its submission has no status of its own: it is the place's status.

-- ---------------------------------------------------------------------------
-- Certified mark on places
-- ---------------------------------------------------------------------------

alter table public.places
  add column is_certified boolean not null default false,
  add column certification_name text
    check (char_length(btrim(certification_name)) between 1 and 120),
  add constraint places_certified_has_name check (is_certified = (certification_name is not null));

comment on column public.places.is_certified is
  'True only after an admin has seen proof of the certification. Trainers only. Set by admin_set_place_certified.';

comment on column public.places.certification_name is
  'The certification an admin has seen proof of. Set exactly when is_certified is true.';

-- Public columns: readable by everyone, writable by nobody through the API.
-- Keep this in step with PUBLIC_PLACE_COLUMNS in src/lib/places.ts.
grant select (is_certified, certification_name) on table public.places to anon, authenticated;

-- ---------------------------------------------------------------------------
-- No direct insert: the submit functions are the only path
-- ---------------------------------------------------------------------------
-- A business still edits its own pending place (update grant and places_update_own_pending
-- stay as they are).

revoke insert on table public.places from authenticated;

drop policy places_insert_own on public.places;

-- ---------------------------------------------------------------------------
-- place_submissions: private verification details
-- ---------------------------------------------------------------------------

create type public.submission_kind as enum ('new_place', 'claim');

create type public.claim_status as enum ('pending', 'approved', 'rejected');

create table public.place_submissions (
  id uuid primary key default gen_random_uuid(),
  kind public.submission_kind not null,
  place_id uuid not null references public.places (id) on delete cascade,
  submitted_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  verification_email text check (
    char_length(verification_email) <= 254
    and verification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  verification_social text check (
    char_length(btrim(verification_social)) between 1 and 200
    and verification_social !~ '[[:cntrl:]]'
  ),
  certification_name text check (char_length(btrim(certification_name)) between 1 and 120),
  note text check (char_length(note) <= 500),
  -- Claims only. A new listing's state is its place's status.
  claim_status public.claim_status,
  claim_rejection_reason text check (char_length(btrim(claim_rejection_reason)) between 1 and 500),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint place_submissions_has_verification check (
    num_nonnulls(verification_email, verification_social) >= 1
  ),
  constraint place_submissions_claim_status check ((kind = 'claim') = (claim_status is not null))
);

comment on table public.place_submissions is
  'Private: verification contact, note and certification name sent with a new listing or a claim. '
  'No API access; the admin reads it through admin_list_submissions().';

-- The rate limit counts a user's recent submissions.
create index place_submissions_submitted_by_created_at_idx
  on public.place_submissions (submitted_by, created_at);

-- One submission per new place.
create unique index place_submissions_new_place_idx
  on public.place_submissions (place_id)
  where kind = 'new_place';

-- One pending claim per place per user.
create unique index place_submissions_pending_claim_idx
  on public.place_submissions (place_id, submitted_by)
  where claim_status = 'pending';

-- RLS on and no policies, and no API privileges. Supabase's default privileges grant new
-- tables to the API roles, so take them away.
alter table public.place_submissions enable row level security;

revoke all on table public.place_submissions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rate limit: at most 5 submissions per account in any rolling 24 hours
-- ---------------------------------------------------------------------------

create function public.enforce_submission_limit()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- One caller at a time per user, so two concurrent submissions cannot both slip past.
  -- The lock is released when the transaction ends.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 13));

  if (
    select count(*)
    from public.place_submissions
    where submitted_by = auth.uid()
      and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'too many submissions' using errcode = 'PT429';
  end if;
end;
$$;

comment on function public.enforce_submission_limit() is
  'Internal. Raises PT429 when the caller has made 5 submissions in the last 24 hours. '
  'Called only from submit_new_place and submit_place_claim.';

revoke execute on function public.enforce_submission_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- submit_new_place
-- ---------------------------------------------------------------------------

create function public.submit_new_place(
  p_name text,
  p_category public.place_category,
  p_area public.place_area,
  p_price_range public.price_range,
  p_description text default null,
  p_schedule text default null,
  p_website_url text default null,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_instagram_handle text default null,
  p_tags public.place_tag[] default '{}',
  p_verification_email text default null,
  p_verification_social text default null,
  p_certification_name text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_place_id uuid;
  v_certification_name text := nullif(btrim(p_certification_name), '');
begin
  if auth.uid() is null then
    raise exception 'sign in to submit' using errcode = '42501';
  end if;

  if v_certification_name is not null and p_category is distinct from 'trainer' then
    raise exception 'only a trainer has a certification' using errcode = '22023';
  end if;

  -- The table limits most fields; these two have no length limit there. Public input, so cap them.
  if char_length(btrim(p_website_url)) > 2048 or char_length(btrim(p_contact_email)) > 254 then
    raise exception 'website or email too long' using errcode = '22023';
  end if;

  perform public.enforce_submission_limit();

  -- Always pending, unverified and uncertified, whatever the caller sends. The table's check
  -- constraints still apply (name length, contact method, URL, ...).
  insert into public.places (
    name,
    category,
    description,
    area,
    price_range,
    schedule,
    website_url,
    contact_phone,
    contact_email,
    instagram_handle,
    tags,
    status,
    is_verified,
    is_certified,
    certification_name,
    submitted_by
  ) values (
    btrim(p_name),
    p_category,
    nullif(btrim(p_description), ''),
    p_area,
    p_price_range,
    nullif(btrim(p_schedule), ''),
    nullif(btrim(p_website_url), ''),
    nullif(btrim(p_contact_phone), ''),
    nullif(btrim(p_contact_email), ''),
    nullif(btrim(p_instagram_handle), ''),
    coalesce(p_tags, '{}'),
    'pending',
    false,
    false,
    null,
    auth.uid()
  )
  returning id into v_place_id;

  insert into public.place_submissions (
    kind,
    place_id,
    submitted_by,
    verification_email,
    verification_social,
    certification_name,
    note
  ) values (
    'new_place',
    v_place_id,
    auth.uid(),
    nullif(btrim(p_verification_email), ''),
    nullif(btrim(p_verification_social), ''),
    v_certification_name,
    nullif(btrim(p_note), '')
  );

  return v_place_id;
end;
$$;

comment on function public.submit_new_place(
  text,
  public.place_category,
  public.place_area,
  public.price_range,
  text,
  text,
  text,
  text,
  text,
  text,
  public.place_tag[],
  text,
  text,
  text,
  text
) is
  'Signed-in users. Submits a new place, always pending and unverified, with private verification '
  'contact. Returns the place id. At most 5 submissions per account per 24 hours (PT429).';

revoke execute on function public.submit_new_place(
  text,
  public.place_category,
  public.place_area,
  public.price_range,
  text,
  text,
  text,
  text,
  text,
  text,
  public.place_tag[],
  text,
  text,
  text,
  text
) from public, anon;

grant execute on function public.submit_new_place(
  text,
  public.place_category,
  public.place_area,
  public.price_range,
  text,
  text,
  text,
  text,
  text,
  text,
  public.place_tag[],
  text,
  text,
  text,
  text
) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_place_claim
-- ---------------------------------------------------------------------------

create function public.submit_place_claim(
  p_place_id uuid,
  p_verification_email text default null,
  p_verification_social text default null,
  p_certification_name text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category public.place_category;
  v_claimed_by uuid;
  v_submission_id uuid;
  v_certification_name text := nullif(btrim(p_certification_name), '');
begin
  if auth.uid() is null then
    raise exception 'sign in to claim' using errcode = '42501';
  end if;

  -- Only an approved place can be claimed. Any other place looks missing, so a pending one
  -- cannot be found by guessing its id.
  select category, claimed_by
  into v_category, v_claimed_by
  from public.places
  where id = p_place_id
    and status = 'approved';

  if not found then
    raise exception 'place % not found', p_place_id using errcode = 'P0002';
  end if;

  if v_claimed_by is not distinct from auth.uid() then
    raise exception 'you already manage this place' using errcode = '22023';
  end if;

  if v_certification_name is not null and v_category <> 'trainer' then
    raise exception 'only a trainer has a certification' using errcode = '22023';
  end if;

  perform public.enforce_submission_limit();

  -- The place itself does not change while the claim waits.
  insert into public.place_submissions (
    kind,
    place_id,
    submitted_by,
    verification_email,
    verification_social,
    certification_name,
    note,
    claim_status
  ) values (
    'claim',
    p_place_id,
    auth.uid(),
    nullif(btrim(p_verification_email), ''),
    nullif(btrim(p_verification_social), ''),
    v_certification_name,
    nullif(btrim(p_note), ''),
    'pending'
  )
  returning id into v_submission_id;

  return v_submission_id;
end;
$$;

comment on function public.submit_place_claim(uuid, text, text, text, text) is
  'Signed-in users. Claims an approved place with private verification contact; the place is '
  'unchanged until an admin approves. Returns the claim id. Shares the 5 per 24 hours limit (PT429).';

revoke execute on function public.submit_place_claim(uuid, text, text, text, text) from public, anon;

grant execute on function public.submit_place_claim(uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_submissions
-- ---------------------------------------------------------------------------

create function public.admin_list_submissions()
returns table (
  id uuid,
  kind public.submission_kind,
  place_id uuid,
  place_name text,
  place_category public.place_category,
  place_status public.place_status,
  place_is_claimed boolean,
  account_email text,
  verification_email text,
  verification_social text,
  certification_name text,
  note text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.kind,
    s.place_id,
    p.name,
    p.category,
    p.status,
    p.claimed_by is not null,
    u.email::text,
    s.verification_email,
    s.verification_social,
    s.certification_name,
    s.note,
    s.created_at
  from public.place_submissions s
  join public.places p on p.id = s.place_id
  left join auth.users u on u.id = s.submitted_by
  where (s.kind = 'new_place' and p.status = 'pending')
     or s.claim_status = 'pending'
  order by s.created_at desc
  limit 100;
end;
$$;

comment on function public.admin_list_submissions() is
  'Admin only. Pending items: new-listing submissions whose place is still pending, and pending '
  'claims, with the private verification details. Newest first, at most 100.';

revoke execute on function public.admin_list_submissions() from public, anon;

grant execute on function public.admin_list_submissions() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_approve_claim / admin_reject_claim
-- ---------------------------------------------------------------------------

create function public.admin_approve_claim(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_place_id uuid;
  v_submitted_by uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  update public.place_submissions
  set
    claim_status = 'approved',
    reviewed_at = now()
  where id = p_submission_id
    and kind = 'claim'
    and claim_status = 'pending'
  returning place_id, submitted_by into v_place_id, v_submitted_by;

  if not found then
    raise exception 'pending claim % not found', p_submission_id using errcode = 'P0002';
  end if;

  -- Replaces any earlier owner. The admin queue warns "Already claimed" first.
  update public.places
  set claimed_by = v_submitted_by
  where id = v_place_id;
end;
$$;

comment on function public.admin_approve_claim(uuid) is
  'Admin only. Approves a pending claim and sets the place''s claimed_by to the claimant.';

revoke execute on function public.admin_approve_claim(uuid) from public, anon;

grant execute on function public.admin_approve_claim(uuid) to authenticated;

create function public.admin_reject_claim(
  p_submission_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'reason is required (1-500 characters)' using errcode = '22023';
  end if;

  update public.place_submissions
  set
    claim_status = 'rejected',
    claim_rejection_reason = btrim(p_reason),
    reviewed_at = now()
  where id = p_submission_id
    and kind = 'claim'
    and claim_status = 'pending';

  if not found then
    raise exception 'pending claim % not found', p_submission_id using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.admin_reject_claim(uuid, text) is
  'Admin only. Rejects a pending claim with a reason (1-500 characters). The place is unchanged.';

revoke execute on function public.admin_reject_claim(uuid, text) from public, anon;

grant execute on function public.admin_reject_claim(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_place_certified
-- ---------------------------------------------------------------------------

create function public.admin_set_place_certified(
  p_place_id uuid,
  p_certification_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category public.place_category;
  v_name text := btrim(p_certification_name);
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select category into v_category from public.places where id = p_place_id;

  if not found then
    raise exception 'place % not found', p_place_id using errcode = 'P0002';
  end if;

  if v_category <> 'trainer' then
    raise exception 'only a trainer can be certified' using errcode = '22023';
  end if;

  if p_certification_name is not null and char_length(v_name) not between 1 and 120 then
    raise exception 'certification name is required (1-120 characters)' using errcode = '22023';
  end if;

  -- null removes the mark; a name sets it.
  update public.places
  set
    is_certified = (v_name is not null),
    certification_name = v_name
  where id = p_place_id;
end;
$$;

comment on function public.admin_set_place_certified(uuid, text) is
  'Admin only, trainers only. With a name (1-120 characters), marks the place certified after the '
  'admin has seen proof; with null, removes the mark.';

revoke execute on function public.admin_set_place_certified(uuid, text) from public, anon;

grant execute on function public.admin_set_place_certified(uuid, text) to authenticated;
