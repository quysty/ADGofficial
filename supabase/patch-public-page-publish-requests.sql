-- ANU Explore public Pages publish request guard
-- Run once after schema-pilot.sql, schema-building-label-overrides.sql,
-- patch-building-height-overrides.sql, and patch-admin-operation-logs.sql.
-- First-version allowed scopes:
--   1. dorm_details
--   2. building_heights
--   3. site_pages
-- No entrance, road, boundary, geometry, or raw map data can be requested here.

create table if not exists public.public_page_publish_requests (
  id uuid primary key default gen_random_uuid(),
  publish_scope text not null,
  status text not null default 'queued',
  requested_by uuid not null references auth.users(id),
  requested_email text not null,
  requested_role text not null default 'Clevel',
  request_details jsonb not null default '{}'::jsonb,
  result_details jsonb not null default '{}'::jsonb,
  commit_sha text,
  commit_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint public_page_publish_requests_scope_check
    check (publish_scope in ('dorm_details', 'building_heights', 'site_pages')),
  constraint public_page_publish_requests_status_check
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled'))
);

create index if not exists public_page_publish_requests_created_at_idx
on public.public_page_publish_requests (created_at desc);

create index if not exists public_page_publish_requests_status_idx
on public.public_page_publish_requests (status, created_at desc);

alter table public.public_page_publish_requests
drop constraint if exists public_page_publish_requests_scope_check;

alter table public.public_page_publish_requests
add constraint public_page_publish_requests_scope_check
check (publish_scope in ('dorm_details', 'building_heights', 'site_pages'));

drop trigger if exists public_page_publish_requests_set_updated_at
on public.public_page_publish_requests;

create trigger public_page_publish_requests_set_updated_at
before update on public.public_page_publish_requests
for each row
execute function public.set_updated_at();

alter table public.public_page_publish_requests enable row level security;

grant select on public.public_page_publish_requests to authenticated;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can read public page publish requests"
on public.public_page_publish_requests;
create policy "Admins can read public page publish requests"
on public.public_page_publish_requests
for select
to authenticated
using (public.is_admin());

create or replace function public.guard_building_label_override_admin_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL Editor migrations run outside an authenticated user context; keep them usable.
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can update building label overrides.';
  end if;

  if new.display_mode <> 'dorm' or new.type_key <> 'dorm' then
    raise exception 'First-version admin writes are limited to dorm detail rows.';
  end if;

  if new.interactive is distinct from true then
    raise exception 'Dorm click permission is locked on in the first-version admin editor.';
  end if;
  if new.label_enabled is distinct from true then
    raise exception 'Dorm map label enablement is locked on in the first-version admin editor.';
  end if;

  if tg_op = 'UPDATE' then
    if old.building_number is distinct from new.building_number then
      raise exception 'Building number is locked in the admin editor.';
    end if;
    if old.building_id is distinct from new.building_id then
      raise exception 'Building ID is locked in the admin editor.';
    end if;
    if old.display_mode is distinct from new.display_mode then
      raise exception 'Display mode is locked in the admin editor.';
    end if;
    if old.type_key is distinct from new.type_key then
      raise exception 'Building type is locked in the admin editor.';
    end if;
    if old.interactive is distinct from new.interactive then
      raise exception 'Click permission is locked in the admin editor.';
    end if;
    if old.label_enabled is distinct from new.label_enabled then
      raise exception 'Map label enablement is locked in the admin editor.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_building_label_override_admin_write
on public.building_label_overrides;

create trigger guard_building_label_override_admin_write
before insert or update on public.building_label_overrides
for each row
execute function public.guard_building_label_override_admin_write();

drop policy if exists "Admins can manage building label overrides"
on public.building_label_overrides;
drop policy if exists "Admins can insert dorm label overrides only"
on public.building_label_overrides;
drop policy if exists "Admins can update dorm label overrides only"
on public.building_label_overrides;
drop policy if exists "Admins can delete dorm label overrides only"
on public.building_label_overrides;

create policy "Admins can insert dorm label overrides only"
on public.building_label_overrides
for insert
to authenticated
with check (
  public.is_admin() and
  display_mode = 'dorm' and
  type_key = 'dorm'
);

create policy "Admins can update dorm label overrides only"
on public.building_label_overrides
for update
to authenticated
using (
  public.is_admin() and
  display_mode = 'dorm' and
  type_key = 'dorm'
)
with check (
  public.is_admin() and
  display_mode = 'dorm' and
  type_key = 'dorm'
);

create policy "Admins can delete dorm label overrides only"
on public.building_label_overrides
for delete
to authenticated
using (
  public.is_admin() and
  display_mode = 'dorm' and
  type_key = 'dorm'
);

create or replace function public.enqueue_public_page_publish(
  publish_scope_input text,
  request_details_input jsonb default '{}'::jsonb
)
returns public.public_page_publish_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text;
  request_row public.public_page_publish_requests;
  scope_label text;
begin
  if actor_id is null then
    raise exception 'You must be signed in to request a public Pages publish.';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can request a public Pages publish.';
  end if;

  if publish_scope_input not in ('dorm_details', 'building_heights', 'site_pages') then
    raise exception 'This publish scope is not allowed in the first-version admin workflow.';
  end if;

  select email
  into actor_email
  from auth.users
  where id = actor_id;

  actor_email := coalesce(actor_email, 'unknown');
  scope_label := case publish_scope_input
    when 'dorm_details' then '宿舍详情'
    when 'building_heights' then '建筑高度'
    when 'site_pages' then '页面配置'
    else publish_scope_input
  end;

  insert into public.public_page_publish_requests (
    publish_scope,
    requested_by,
    requested_email,
    requested_role,
    request_details
  )
  values (
    publish_scope_input,
    actor_id,
    actor_email,
    'Clevel',
    coalesce(request_details_input, '{}'::jsonb)
  )
  returning *
  into request_row;

  insert into public.admin_operation_logs (
    actor_user_id,
    actor_email,
    permission_level,
    action,
    entity_type,
    entity_id,
    target_table,
    status,
    summary,
    details
  )
  values (
    actor_id,
    actor_email,
    'Clevel',
    'request_public_pages_publish',
    'public_pages_publish',
    request_row.id::text,
    'public_page_publish_requests',
    'queued',
    '创建官网发布请求：' || scope_label,
    jsonb_build_object(
      'publishScope', publish_scope_input,
      'requestId', request_row.id,
      'allowedScopes', jsonb_build_array('dorm_details', 'building_heights', 'site_pages'),
      'requestDetails', coalesce(request_details_input, '{}'::jsonb)
    )
  );

  return request_row;
end;
$$;

grant execute on function public.enqueue_public_page_publish(text, jsonb) to authenticated;

create or replace view public.public_page_publish_security_summary as
select
  'dorm_details'::text as publish_scope,
  'building_label_overrides'::text as source_table,
  'config/published/dorm-details.json'::text as allowed_output_path
union all
select
  'building_heights',
  'building_height_overrides',
  'config/published/building-heights.json'
union all
select
  'site_pages',
  'public_page_publish_requests.request_details',
  'config/published/site-pages.json';

grant select on public.public_page_publish_security_summary to authenticated;
