-- ANU Explore building height management patch
-- Run once in Supabase SQL Editor before using the height manager.

create table if not exists public.building_height_overrides (
  building_number text primary key,
  draft_multiplier numeric(8, 4) not null default 1,
  draft_copy_from_building_number text,
  published_multiplier numeric(8, 4),
  published_copy_from_building_number text,
  status text not null default 'draft',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  constraint building_height_overrides_draft_multiplier_check
    check (draft_multiplier > 0 and draft_multiplier <= 10),
  constraint building_height_overrides_published_multiplier_check
    check (published_multiplier is null or (published_multiplier > 0 and published_multiplier <= 10)),
  constraint building_height_overrides_status_check
    check (status in ('draft', 'published'))
);

alter table public.building_height_overrides enable row level security;

grant select on public.building_height_overrides to anon;
grant select, insert, update, delete on public.building_height_overrides to authenticated;

drop policy if exists "Public can read published building heights" on public.building_height_overrides;
create policy "Public can read published building heights"
on public.building_height_overrides
for select
to anon
using (published_multiplier is not null or published_copy_from_building_number is not null);

drop policy if exists "Admins can read building height drafts" on public.building_height_overrides;
create policy "Admins can read building height drafts"
on public.building_height_overrides
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage building height overrides" on public.building_height_overrides;
create policy "Admins can manage building height overrides"
on public.building_height_overrides
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.building_height_override_history (
  id uuid primary key default gen_random_uuid(),
  building_number text not null,
  action text not null default 'save',
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.building_height_override_history enable row level security;

grant select, insert, update, delete on public.building_height_override_history to authenticated;

drop policy if exists "Admins can manage building height override history" on public.building_height_override_history;
create policy "Admins can manage building height override history"
on public.building_height_override_history
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.touch_building_height_overrides_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_building_height_overrides_updated_at
on public.building_height_overrides;

create trigger touch_building_height_overrides_updated_at
before update on public.building_height_overrides
for each row
execute function public.touch_building_height_overrides_updated_at();
