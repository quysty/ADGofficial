-- ANU Explore backend pilot schema
-- Run this in Supabase SQL Editor after the project is created.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.app_settings enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.admin_users to authenticated;
grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;

drop policy if exists "Admins and current user can view admin users" on public.admin_users;
create policy "Admins and current user can view admin users"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage admin users" on public.admin_users;
create policy "Admins can manage admin users"
on public.admin_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public settings are readable" on public.app_settings;
create policy "Public settings are readable"
on public.app_settings
for select
to anon, authenticated
using (is_public = true or public.is_admin());

drop policy if exists "Admins can manage app settings" on public.app_settings;
create policy "Admins can manage app settings"
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.app_settings (key, value, is_public)
values (
  'backend_test_message',
  '{"text":"Supabase connected","scope":"backend-pilot"}'::jsonb,
  true
)
on conflict (key) do update
set value = excluded.value,
    is_public = excluded.is_public;

-- After you sign in once from admin.html, run this with your admin email.
-- Replace the email before executing.
--
-- insert into public.admin_users (user_id, email)
-- select id, email
-- from auth.users
-- where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict (user_id) do update
-- set email = excluded.email,
--     role = 'admin';
