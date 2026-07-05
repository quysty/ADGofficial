-- ANU Explore building label guard patch
-- Run this once if building_label_overrides already exists.

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
  type_key = case display_mode
    when 'dorm' then 'dorm'
    when 'functional' then 'academic'
    when 'social' then 'social'
    when 'store' then 'store'
    when 'reference' then 'reference'
    else 'academic'
  end,
  interactive = case
    when label_enabled = true and display_mode in ('dorm', 'functional') then interactive
    else false
  end,
  dorm_tag = case when display_mode = 'dorm' then dorm_tag else null end,
  dorm_type = case when display_mode = 'dorm' then dorm_type else null end,
  dorm_location = case when display_mode = 'dorm' then dorm_location else null end,
  dorm_summary = case when display_mode = 'dorm' then dorm_summary else null end,
  dorm_description = case when display_mode = 'dorm' then dorm_description else null end,
  dorm_rent_text = case when display_mode = 'dorm' then dorm_rent_text else null end,
  dorm_best_for = case when display_mode = 'dorm' then dorm_best_for else null end,
  dorm_location_feel = case when display_mode = 'dorm' then dorm_location_feel else null end,
  dorm_trade_off = case when display_mode = 'dorm' then dorm_trade_off else null end;

alter table public.building_label_overrides
drop constraint if exists building_label_overrides_display_mode_check;
alter table public.building_label_overrides
add constraint building_label_overrides_display_mode_check
check (display_mode in ('dorm', 'functional', 'social', 'store', 'reference'));

alter table public.building_label_overrides
drop constraint if exists building_label_overrides_type_key_check;
alter table public.building_label_overrides
add constraint building_label_overrides_type_key_check
check (type_key in ('dorm', 'academic', 'social', 'store', 'reference'));

alter table public.building_label_overrides
drop constraint if exists building_label_overrides_mode_type_pair_check;
alter table public.building_label_overrides
add constraint building_label_overrides_mode_type_pair_check
check (
  (display_mode = 'dorm' and type_key = 'dorm') or
  (display_mode = 'functional' and type_key = 'academic') or
  (display_mode = 'social' and type_key = 'social') or
  (display_mode = 'store' and type_key = 'store') or
  (display_mode = 'reference' and type_key = 'reference')
);

alter table public.building_label_overrides
drop constraint if exists building_label_overrides_interactive_guard_check;
alter table public.building_label_overrides
add constraint building_label_overrides_interactive_guard_check
check (
  interactive = false or
  (label_enabled = true and display_mode in ('dorm', 'functional'))
);

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
