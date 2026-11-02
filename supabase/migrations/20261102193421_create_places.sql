-- places: the businesses that offer fitness in Birmingham / Hoover (studios, trainers,
-- run clubs, gyms). v1 serves one city, so there is no city column.
--
-- Every new listing starts as 'pending'. A person (an admin) must approve it before it is
-- public. Nothing pending, rejected or hidden is ever returned to the public.
--
-- This migration creates the table with Row Level Security on and no grants or policies,
-- so the API can do nothing with it yet. The access rules come in the next migration
-- (places_access).

-- Value lists. Adding a value later is a one-line `alter type ... add value` migration.
create type public.place_category as enum ('studio', 'trainer', 'run_club', 'gym');

create type public.place_status as enum ('pending', 'approved', 'rejected', 'hidden');

-- Part of town. Location stays approximate (PRD: privacy).
create type public.place_area as enum (
  'downtown',
  'southside',
  'lakeview',
  'avondale',
  'crestwood',
  'homewood',
  'mountain_brook',
  'vestavia_hills',
  'hoover',
  'trussville'
);

create type public.price_range as enum ('free', 'budget', 'moderate', 'premium');

create type public.place_tag as enum (
  'beginner_friendly',
  'all_levels',
  'strength',
  'cardio',
  'yoga',
  'running',
  'drop_in',
  'free_trial',
  'outdoor'
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category public.place_category not null,
  description text check (char_length(description) <= 2000),
  area public.place_area not null,
  price_range public.price_range not null,
  -- Free text for now; structured schedule data comes with time-based matching.
  schedule text check (char_length(schedule) <= 500),
  website_url text check (website_url ~* '^https?://'),
  contact_phone text check (char_length(contact_phone) between 7 and 32),
  contact_email text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Stored without the leading '@'.
  instagram_handle text check (instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  tags public.place_tag[] not null default '{}',
  status public.place_status not null default 'pending',
  -- Never show a "verified" mark without proof: only an admin sets this.
  is_verified boolean not null default false,
  submitted_by uuid default auth.uid() references auth.users (id) on delete set null,
  claimed_by uuid references auth.users (id) on delete set null,
  -- When a person last confirmed the details are correct.
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_has_contact check (
    num_nonnulls(website_url, contact_phone, contact_email, instagram_handle) >= 1
  )
);

comment on table public.places is
  'Fitness businesses in Birmingham / Hoover. New listings start as pending; only approved ones are public.';

create index places_status_category_idx on public.places (status, category);

create index places_submitted_by_idx on public.places (submitted_by);

-- Keep updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger places_set_updated_at
before update on public.places
for each row
execute function public.set_updated_at();

-- Deny everything through the API until the access rules are added.
alter table public.places enable row level security;

revoke all on table public.places from anon, authenticated;
