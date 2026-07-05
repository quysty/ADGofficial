-- ANU Explore building label/category override schema
-- Run after supabase/schema-pilot.sql.

create table if not exists public.building_label_overrides (
  building_number text primary key,
  building_id text,
  display_mode text not null default 'functional',
  type_key text not null default 'academic',
  display_name text,
  short_name text,
  interactive boolean not null default false,
  label_enabled boolean not null default true,
  dorm_tag text,
  dorm_rent_text text,
  dorm_type text,
  dorm_location text,
  dorm_summary text,
  dorm_description text,
  dorm_best_for text,
  dorm_location_feel text,
  dorm_trade_off text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.building_label_override_history (
  id uuid primary key default gen_random_uuid(),
  building_number text not null,
  action text not null default 'save',
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists building_label_overrides_set_updated_at on public.building_label_overrides;
create trigger building_label_overrides_set_updated_at
before update on public.building_label_overrides
for each row
execute function public.set_updated_at();

alter table public.building_label_overrides enable row level security;
alter table public.building_label_override_history enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.building_label_overrides to anon, authenticated;
grant insert, update, delete on public.building_label_overrides to authenticated;
grant select, insert, update, delete on public.building_label_override_history to authenticated;

drop policy if exists "Building label overrides are readable" on public.building_label_overrides;
create policy "Building label overrides are readable"
on public.building_label_overrides
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage building label overrides" on public.building_label_overrides;
create policy "Admins can manage building label overrides"
on public.building_label_overrides
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage building label override history" on public.building_label_override_history;
create policy "Admins can manage building label override history"
on public.building_label_override_history
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.building_label_overrides (
  building_number,
  building_id,
  display_mode,
  type_key,
  display_name,
  short_name,
  interactive,
  label_enabled,
  dorm_tag,
  dorm_type,
  dorm_location,
  dorm_summary,
  dorm_description
)
values
  ('777', 'dorm_lena', 'dorm', 'dorm', 'Lena Karmel Lodge', 'Lena', true, true, 'QUIET / PRIVATE', 'Apartment-style residence', 'City-side / campus edge', 'A strong option when the user prioritises privacy, personal space, and structured independent living.', 'A residence option currently represented as a quiet and private choice in the prototype recommendation logic.'),
  ('838', 'dorm_kinloch', 'dorm', 'dorm', 'Kinloch Lodge', 'Kinloch', true, true, null, 'Apartment-style residence', 'Childers Street / city edge', 'A practical option when the user wants self-contained living close to both campus routines and the city edge.', null),
  ('821', 'dorm_warrumbul', 'dorm', 'dorm', 'Warrumbul Lodge', 'Warrumbul', true, true, 'CITY / ACCESS', 'Self-catered residence', 'Campus / city access', 'Useful when the user wants practical location advantages and everyday movement convenience.', 'A residence option currently represented as a practical access-focused choice in the prototype recommendation logic.'),
  ('930', 'dorm_davey', 'dorm', 'dorm', 'Davey Lodge', 'Davey', true, true, null, 'Self-catered apartment residence', null, null, null),
  ('666', 'dorm_wright', 'dorm', 'dorm', 'Wright Hall', 'Wright', true, true, 'RESIDENTIAL / EXPERIENCE', 'Residential hall', 'Residential campus setting', 'Relevant when the user is comparing social atmosphere, view quality, shared spaces, and the meaning of residential life.', 'A residence option currently represented as a more residential and experience-oriented choice in the prototype recommendation logic.'),
  ('735', 'dorm_toad', 'dorm', 'dorm', 'Toad Hall', 'Toad', true, true, null, 'Residential hall', null, 'Placeholder profile for future dorm comparison, map navigation, and residence detail content.', 'Toad Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.'),
  ('863', 'dorm_fenner', 'dorm', 'dorm', 'Fenner Hall', 'Fenner', true, true, null, 'Residential hall', null, 'Placeholder profile for future dorm comparison, map navigation, and residence detail content.', 'Fenner Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.'),
  ('602', 'dorm_bruce', 'dorm', 'dorm', 'Bruce Hall', 'Bruce', true, true, null, 'Residential hall', null, 'Placeholder profile for future dorm comparison, map navigation, and residence detail content.', 'Bruce Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.'),
  ('953', 'dorm_ursula_laurus', 'dorm', 'dorm', 'Ursula Hall Laurus Wing', 'Ursula', true, true, null, 'Residential hall', null, 'Placeholder profile for future dorm comparison, map navigation, and residence detail content.', 'Ursula Hall Laurus Wing is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.'),
  ('812', 'dorm_burton_garran', 'dorm', 'dorm', 'Burton & Garran Hall', 'B&G', true, true, null, 'Residential hall', null, 'Placeholder profile for future dorm comparison, map navigation, and residence detail content.', 'Burton & Garran Hall is now linked to the Explore map as a usable dorm label. Detailed residence content is pending.'),
  ('928', 'academic_928', 'functional', 'academic', 'Academic Building 928', '928', true, true, null, null, null, null, null),
  ('907', 'academic_907', 'functional', 'academic', 'Academic Building 907', '907', false, true, null, null, null, null, null),
  ('935', 'academic_935', 'functional', 'academic', 'Academic Building 935', '935', true, true, null, null, null, null, null),
  ('957', 'academic_957', 'functional', 'academic', 'Academic Building 957', '957', true, true, null, null, null, null, null),
  ('876', 'social_876', 'social', 'social', 'Social Building 876', '876', false, true, null, null, null, null, null),
  ('965', 'reference_965', 'reference', 'reference', 'Mall Building 965', '965', false, true, null, null, null, null, null),
  ('992', 'social_992', 'social', 'social', 'Social Building 992', '992', false, true, null, null, null, null, null),
  ('1004', 'store_1004', 'store', 'store', 'Store Building 1004', '1004', false, true, null, null, null, null, null),
  ('1076', 'reference_1076', 'reference', 'reference', 'Mall Building 1076', '1076', false, true, null, null, null, null, null),
  ('1786', 'store_1786', 'store', 'store', 'Store Building 1786', '1786', false, true, null, null, null, null, null)
on conflict (building_number) do nothing;
