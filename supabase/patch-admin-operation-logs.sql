-- ANU Explore admin operation log patch
-- Run once in Supabase SQL Editor before using the engineering log panel.

create table if not exists public.admin_operation_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id),
  actor_email text not null,
  permission_level text not null default 'Clevel',
  action text not null,
  entity_type text not null,
  entity_id text,
  target_table text,
  status text not null default 'success',
  summary text not null,
  details jsonb not null default '{}'::jsonb
);

alter table public.admin_operation_logs enable row level security;

grant select, insert on public.admin_operation_logs to authenticated;

drop policy if exists "Admins can read admin operation logs" on public.admin_operation_logs;
create policy "Admins can read admin operation logs"
on public.admin_operation_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert admin operation logs" on public.admin_operation_logs;
create policy "Admins can insert admin operation logs"
on public.admin_operation_logs
for insert
to authenticated
with check (public.is_admin());

create index if not exists admin_operation_logs_created_at_idx
on public.admin_operation_logs (created_at desc);

create index if not exists admin_operation_logs_actor_user_id_idx
on public.admin_operation_logs (actor_user_id);

create index if not exists admin_operation_logs_entity_idx
on public.admin_operation_logs (entity_type, entity_id);
