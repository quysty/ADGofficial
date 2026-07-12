-- ANU Explore site page registry publish scope
-- Run once after supabase/patch-public-page-publish-requests.sql.
-- This only allows the admin workbench to publish the soft page registry:
--   config/published/site-pages.json
-- It does not grant access to raw map data, routes, entrances, boundaries, or arbitrary files.

alter table public.public_page_publish_requests
drop constraint if exists public_page_publish_requests_scope_check;

alter table public.public_page_publish_requests
add constraint public_page_publish_requests_scope_check
check (publish_scope in ('dorm_details', 'building_heights', 'site_pages'));

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
    raise exception 'This publish scope is not allowed in the admin workflow.';
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
