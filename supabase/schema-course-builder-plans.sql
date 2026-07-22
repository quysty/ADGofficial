create table if not exists public.course_builder_plans (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slot smallint not null,
  name text not null,
  plan_state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_builder_plans_pkey primary key (owner_id, slot),
  constraint course_builder_plans_slot_check check (slot between 1 and 3),
  constraint course_builder_plans_name_check check (char_length(btrim(name)) between 1 and 40),
  constraint course_builder_plans_state_object_check check (jsonb_typeof(plan_state) = 'object'),
  constraint course_builder_plans_state_schema_check check (
    plan_state ->> 'schemaVersion' = '1'
    and jsonb_typeof(plan_state -> 'placements') = 'array'
    and jsonb_array_length(plan_state -> 'placements') <= 56
  ),
  constraint course_builder_plans_state_size_check check (pg_column_size(plan_state) <= 65536)
);

comment on table public.course_builder_plans is
  'Up to three named Course Builder plans per permanent account; legacy anonymous owners retain read access for migration.';

alter table public.course_builder_plans enable row level security;

revoke all on table public.course_builder_plans from anon;
revoke all on table public.course_builder_plans from authenticated;
grant select, insert, update, delete on table public.course_builder_plans to authenticated;

drop policy if exists "course_builder_plans_select_own" on public.course_builder_plans;
create policy "course_builder_plans_select_own"
on public.course_builder_plans
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "course_builder_plans_insert_own" on public.course_builder_plans;
create policy "course_builder_plans_insert_own"
on public.course_builder_plans
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists "course_builder_plans_update_own" on public.course_builder_plans;
create policy "course_builder_plans_update_own"
on public.course_builder_plans
for update
to authenticated
using (
  (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
)
with check (
  (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists "course_builder_plans_delete_own" on public.course_builder_plans;
create policy "course_builder_plans_delete_own"
on public.course_builder_plans
for delete
to authenticated
using (
  (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);
