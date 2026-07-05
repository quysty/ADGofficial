-- ANU Explore dorm detail editor patch
-- Run once after the earlier building_label_overrides schema.

alter table public.building_label_overrides
add column if not exists dorm_rent_text text;

alter table public.building_label_overrides
add column if not exists dorm_best_for text;

alter table public.building_label_overrides
add column if not exists dorm_location_feel text;

alter table public.building_label_overrides
add column if not exists dorm_trade_off text;

update public.building_label_overrides
set
  dorm_rent_text = case
    when display_mode = 'dorm' then coalesce(dorm_rent_text, 'Not listed')
    else null
  end,
  dorm_best_for = case
    when display_mode = 'dorm' then dorm_best_for
    else null
  end,
  dorm_location_feel = case
    when display_mode = 'dorm' then dorm_location_feel
    else null
  end,
  dorm_trade_off = case
    when display_mode = 'dorm' then dorm_trade_off
    else null
  end;

alter table public.building_label_overrides
drop constraint if exists building_label_overrides_dorm_fields_guard_check;

alter table public.building_label_overrides
add constraint building_label_overrides_dorm_fields_guard_check
check (
  display_mode = 'dorm' or
  (
    dorm_tag is null and
    dorm_type is null and
    dorm_location is null and
    dorm_summary is null and
    dorm_description is null and
    dorm_rent_text is null and
    dorm_best_for is null and
    dorm_location_feel is null and
    dorm_trade_off is null
  )
);

create table if not exists public.building_label_override_history (
  id uuid primary key default gen_random_uuid(),
  building_number text not null,
  action text not null default 'save',
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.building_label_override_history enable row level security;

grant select, insert, update, delete on public.building_label_override_history to authenticated;

drop policy if exists "Admins can manage building label override history" on public.building_label_override_history;
create policy "Admins can manage building label override history"
on public.building_label_override_history
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
