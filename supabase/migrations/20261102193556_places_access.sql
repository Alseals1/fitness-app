-- Access rules for public.places.
--
-- Who can do what:
--   * Anyone (anon or signed in) reads approved places only.
--   * A signed-in user (a business) submits a place, which is always stored as pending and
--     unverified with submitted_by = that user, and edits it while it is still pending.
--   * An admin (a row in public.admins) reads every place, edits any place, and is the only
--     one who changes status or is_verified, through the admin_* functions below.
--   * Nobody deletes a place through the API: hide it instead.
--
-- Two layers do this:
--   1. Column privileges. The API roles can never read submitted_by or claimed_by, and can
--      only insert or update the editable columns. So status, is_verified, submitted_by,
--      claimed_by and last_confirmed_at always come from their defaults or from SQL, and
--      `select *` is refused: reads must list their columns.
--   2. Row Level Security policies decide which rows each caller sees or changes.

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

-- A person adds admins with SQL. Deleting the row revokes admin at once.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Users who may approve, reject, hide and verify places. Managed with SQL only.';

-- RLS on and no policies, and no API privileges: the app never reads this table directly.
-- It checks admin status only through public.is_admin().
alter table public.admins enable row level security;

revoke all on table public.admins from anon, authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

comment on function public.is_admin() is
  'True when the calling user is in public.admins.';

-- Supabase's default privileges grant execute on new functions to anon; take it away.
revoke execute on function public.is_admin() from public, anon;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges on places
-- ---------------------------------------------------------------------------

revoke all on table public.places from anon, authenticated;

-- Public columns: every column except submitted_by and claimed_by.
-- Keep this list in step with PUBLIC_PLACE_COLUMNS in src/lib/places.ts.
grant select (
  id,
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
  last_confirmed_at,
  created_at,
  updated_at
) on table public.places to anon, authenticated;

-- Editable columns: what a business types into the sign-up form.
grant insert (
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
  tags
) on table public.places to authenticated;

grant update (
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
  tags
) on table public.places to authenticated;

-- ---------------------------------------------------------------------------
-- Policies on places
-- ---------------------------------------------------------------------------
-- The anon policy stays separate from the ones that call is_admin(): anon may not execute
-- is_admin(), so a combined policy would fail for anon.

create policy places_select_approved
on public.places
for select
to anon, authenticated
using (status = 'approved');

create policy places_select_own
on public.places
for select
to authenticated
using (submitted_by = (select auth.uid()));

create policy places_select_admin
on public.places
for select
to authenticated
using ((select public.is_admin()));

create policy places_insert_own
on public.places
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'pending'
  and is_verified = false
);

create policy places_update_own_pending
on public.places
for update
to authenticated
using (submitted_by = (select auth.uid()) and status = 'pending')
with check (submitted_by = (select auth.uid()) and status = 'pending');

create policy places_update_admin
on public.places
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- No delete policy, and no delete privilege: places are hidden, never deleted, via the API.

-- ---------------------------------------------------------------------------
-- Admin functions: the only API path that changes status or is_verified
-- ---------------------------------------------------------------------------

create function public.admin_set_place_status(
  p_place_id uuid,
  p_status public.place_status
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

  -- Approving means a person has just checked the details.
  update public.places
  set
    status = p_status,
    last_confirmed_at = case
      when p_status = 'approved' then now()
      else last_confirmed_at
    end
  where id = p_place_id;

  if not found then
    raise exception 'place % not found', p_place_id using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.admin_set_place_status(uuid, public.place_status) is
  'Admin only. Sets a place''s status; approving also sets last_confirmed_at.';

create function public.admin_set_place_verified(
  p_place_id uuid,
  p_verified boolean
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

  update public.places
  set is_verified = p_verified
  where id = p_place_id;

  if not found then
    raise exception 'place % not found', p_place_id using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.admin_set_place_verified(uuid, boolean) is
  'Admin only. Marks a place verified (with proof) or not.';

revoke execute on function public.admin_set_place_status(uuid, public.place_status) from public, anon;

grant execute on function public.admin_set_place_status(uuid, public.place_status) to authenticated;

revoke execute on function public.admin_set_place_verified(uuid, boolean) from public, anon;

grant execute on function public.admin_set_place_verified(uuid, boolean) to authenticated;
