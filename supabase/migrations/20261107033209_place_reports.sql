-- Place reports: anyone, signed in or not, reports a problem with an approved listing
-- (closed, wrong details, spam or other, with a short note). An admin reads the open reports
-- per place and either hides the place or dismisses the reports.
--
-- Who can do what:
--   * Anyone (anon or authenticated) calls submit_place_report. It is the only way to write a
--     report: the first write path open to signed-out users.
--       - It accepts only approved places. Any other place, or an unknown id, raises P0002, so
--         a pending or hidden place cannot be found by guessing its id.
--       - The note is trimmed, at most 500 characters, and required for 'other'.
--       - The caller sends an anonymous random device id (a UUID made and kept on the device).
--         The function allows at most 5 reports per device id in any rolling 24 hours (PT429),
--         and one open report per device per place (PT409).
--       - It refuses a new report once a place has 50 open reports (PT429).
--       - It stores nothing about the reporter beyond the device id: no auth.uid(), no IP.
--   * Nobody reads or writes public.place_reports through the API, not even an admin. It has
--     RLS on, no policies and no privileges, so a public query can never return a report.
--   * Only an admin (a row in public.admins) lists open reports (admin_list_reports, which never
--     returns the device id) and resolves them (admin_resolve_reports): dismiss, or hide the
--     place in the same transaction.
--
-- What the device limit does not stop: the device id comes from the client, so reinstalling
-- the app, clearing its storage or calling the function with made-up ids gives a fresh
-- "device". The cap of 50 open reports per place bounds the damage: at most 50 rows per
-- approved place until an admin resolves them. A determined person can still fill those slots
-- and crowd out honest reports on that place until the admin dismisses them. Acceptable at
-- one-city scale; a person always decides, nothing is hidden automatically.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

-- Keep in step with REPORT_REASONS in src/lib/reports.ts (generated from this enum).
create type public.report_reason as enum ('closed', 'wrong_details', 'spam', 'other');

create type public.report_resolution as enum ('dismissed', 'hidden');

-- ---------------------------------------------------------------------------
-- place_reports
-- ---------------------------------------------------------------------------

create table public.place_reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  -- Anonymous random id from the device. Only used for counting, never returned by the API.
  device_id uuid not null,
  reason public.report_reason not null,
  -- Keep the 500 in step with REPORT_NOTE_MAX in src/lib/reports.ts.
  note text check (note is null or char_length(btrim(note)) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution public.report_resolution,
  constraint place_reports_other_has_note check (reason <> 'other' or note is not null),
  constraint place_reports_resolved check ((resolved_at is null) = (resolution is null))
);

comment on table public.place_reports is
  'Private: problem reports on approved places. No API access; written through '
  'submit_place_report, read and resolved by the admin through admin_list_reports and '
  'admin_resolve_reports.';

comment on column public.place_reports.device_id is
  'Anonymous random UUID kept on the reporting device. Used only for the rate limits.';

-- The device limit counts a device's recent reports.
create index place_reports_device_id_created_at_idx
  on public.place_reports (device_id, created_at);

-- The per-place cap and the admin list read open reports by place.
create index place_reports_open_place_id_idx
  on public.place_reports (place_id)
  where resolved_at is null;

-- One open report per device per place (backs PT409).
create unique index place_reports_open_place_device_idx
  on public.place_reports (place_id, device_id)
  where resolved_at is null;

-- RLS on and no policies, and no API privileges. Supabase's default privileges grant new
-- tables to the API roles, so take them away.
alter table public.place_reports enable row level security;

revoke all on table public.place_reports from anon, authenticated;

-- ---------------------------------------------------------------------------
-- submit_place_report
-- ---------------------------------------------------------------------------

create function public.submit_place_report(
  p_place_id uuid,
  p_device_id uuid,
  p_reason public.report_reason,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(p_note), '');
  v_report_id uuid;
begin
  if p_device_id is null or p_reason is null then
    raise exception 'device id and reason are required' using errcode = '22023';
  end if;

  if char_length(v_note) > 500 then
    raise exception 'note is too long (at most 500 characters)' using errcode = '22023';
  end if;

  if p_reason = 'other' and v_note is null then
    raise exception 'a note is required for other' using errcode = '22023';
  end if;

  -- Only an approved place can be reported. Any other place looks missing.
  perform 1
  from public.places
  where id = p_place_id
    and status = 'approved';

  if not found then
    raise exception 'place % not found', p_place_id using errcode = 'P0002';
  end if;

  -- One caller at a time per device, so two concurrent reports cannot both slip past the
  -- limit. The lock is released when the transaction ends.
  perform pg_advisory_xact_lock(hashtextextended(p_device_id::text, 14));

  if (
    select count(*)
    from public.place_reports
    where device_id = p_device_id
      and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'too many reports' using errcode = 'PT429';
  end if;

  if exists (
    select 1
    from public.place_reports
    where place_id = p_place_id
      and device_id = p_device_id
      and resolved_at is null
  ) then
    raise exception 'already reported' using errcode = 'PT409';
  end if;

  -- One caller at a time per place for the per-place cap.
  perform pg_advisory_xact_lock(hashtextextended(p_place_id::text, 15));

  if (
    select count(*)
    from public.place_reports
    where place_id = p_place_id
      and resolved_at is null
  ) >= 50 then
    raise exception 'too many open reports on this place' using errcode = 'PT429';
  end if;

  insert into public.place_reports (place_id, device_id, reason, note)
  values (p_place_id, p_device_id, p_reason, v_note)
  returning id into v_report_id;

  return v_report_id;
end;
$$;

comment on function public.submit_place_report(uuid, uuid, public.report_reason, text) is
  'Anyone. Reports a problem with an approved place (P0002 otherwise). The note is trimmed, at most '
  '500 characters and required for other (22023). At most 5 reports per device id per 24 hours '
  'and 50 open reports per place (PT429), one open report per device per place (PT409). '
  'Returns the report id.';

revoke execute on function public.submit_place_report(uuid, uuid, public.report_reason, text)
  from public;

grant execute on function public.submit_place_report(uuid, uuid, public.report_reason, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_reports
-- ---------------------------------------------------------------------------

create function public.admin_list_reports()
returns table (
  id uuid,
  place_id uuid,
  place_name text,
  place_category public.place_category,
  place_status public.place_status,
  reason public.report_reason,
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
    r.id,
    r.place_id,
    p.name,
    p.category,
    p.status,
    r.reason,
    r.note,
    r.created_at
  from public.place_reports r
  join public.places p on p.id = r.place_id
  where r.resolved_at is null
  order by r.created_at desc
  limit 200;
end;
$$;

comment on function public.admin_list_reports() is
  'Admin only. Open reports with their place''s name, category and status, never the device id. '
  'Newest first, at most 200.';

revoke execute on function public.admin_list_reports() from public, anon;

grant execute on function public.admin_list_reports() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_resolve_reports
-- ---------------------------------------------------------------------------

create function public.admin_resolve_reports(
  p_place_id uuid,
  p_hide_place boolean default false
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

  perform 1 from public.places where id = p_place_id for update;

  if not found then
    raise exception 'place % not found', p_place_id using errcode = 'P0002';
  end if;

  if p_hide_place then
    update public.places
    set status = 'hidden'
    where id = p_place_id;
  end if;

  update public.place_reports
  set
    resolved_at = now(),
    resolution = case when p_hide_place then 'hidden' else 'dismissed' end::public.report_resolution
  where place_id = p_place_id
    and resolved_at is null;
end;
$$;

comment on function public.admin_resolve_reports(uuid, boolean) is
  'Admin only. Resolves every open report on a place: dismissed, or hidden when p_hide_place is '
  'true, which also sets the place to hidden in the same transaction.';

revoke execute on function public.admin_resolve_reports(uuid, boolean) from public, anon;

grant execute on function public.admin_resolve_reports(uuid, boolean) to authenticated;
