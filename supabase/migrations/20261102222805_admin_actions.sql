-- Admin actions for the admin screen: reject a place with a reason, and add a place by hand.
--
-- Who can do what:
--   * Only an admin (a row in public.admins) calls admin_reject_place and admin_create_place.
--     Both check public.is_admin() first. anon may not execute them at all.
--   * Every rejection has a reason. admin_set_place_status no longer accepts 'rejected':
--     use admin_reject_place, which stores the reason in public.place_rejections.
--   * Nobody reads or writes public.place_rejections through the API, not even an admin.
--     It has RLS on, no policies and no privileges, so a public query can never return a
--     reason. A person reads it with SQL.
--   * A place added by hand has submitted_by = null (as in seed.sql) and starts as pending,
--     or as approved when the admin approves it at once.
--
-- The column grants and policies on public.places do not change: status and is_verified
-- still change only through the admin_* functions.

-- ---------------------------------------------------------------------------
-- Rejection reasons
-- ---------------------------------------------------------------------------

create table public.place_rejections (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  rejected_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.place_rejections is
  'Why an admin rejected a place, one row per rejection. Internal: no API access, read with SQL only.';

create index place_rejections_place_id_idx on public.place_rejections (place_id);

-- RLS on and no policies, and no API privileges. Supabase's default privileges grant new
-- tables to the API roles, so take them away.
alter table public.place_rejections enable row level security;

revoke all on table public.place_rejections from anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_reject_place
-- ---------------------------------------------------------------------------

create function public.admin_reject_place(
  p_place_id uuid,
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

  update public.places
  set status = 'rejected'
  where id = p_place_id;

  if not found then
    raise exception 'place % not found', p_place_id using errcode = 'P0002';
  end if;

  insert into public.place_rejections (place_id, reason, rejected_by)
  values (p_place_id, btrim(p_reason), auth.uid());
end;
$$;

comment on function public.admin_reject_place(uuid, text) is
  'Admin only. Rejects a place and records the reason (1-500 characters) in place_rejections.';

revoke execute on function public.admin_reject_place(uuid, text) from public, anon;

grant execute on function public.admin_reject_place(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_place_status: now refuses 'rejected', so every rejection has a reason.
-- `create or replace` keeps the existing grants.
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_place_status(
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

  if p_status = 'rejected' then
    raise exception 'use admin_reject_place to reject with a reason' using errcode = '22023';
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
  'Admin only. Sets a place''s status to pending, approved or hidden; approving also sets '
  'last_confirmed_at. To reject, use admin_reject_place.';

-- ---------------------------------------------------------------------------
-- admin_create_place
-- ---------------------------------------------------------------------------

create function public.admin_create_place(
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
  p_status public.place_status default 'pending',
  p_is_verified boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('pending', 'approved') then
    raise exception 'a new place is pending or approved' using errcode = '22023';
  end if;

  -- The table's check constraints still apply (name length, contact method, URL, ...).
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
    submitted_by,
    last_confirmed_at
  ) values (
    p_name,
    p_category,
    p_description,
    p_area,
    p_price_range,
    p_schedule,
    p_website_url,
    p_contact_phone,
    p_contact_email,
    p_instagram_handle,
    coalesce(p_tags, '{}'),
    p_status,
    coalesce(p_is_verified, false),
    -- null marks a listing entered by hand.
    null,
    case when p_status = 'approved' then now() end
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.admin_create_place(
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
  public.place_status,
  boolean
) is
  'Admin only. Adds a place by hand (submitted_by = null) as pending or approved, and returns its id.';

revoke execute on function public.admin_create_place(
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
  public.place_status,
  boolean
) from public, anon;

grant execute on function public.admin_create_place(
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
  public.place_status,
  boolean
) to authenticated;
