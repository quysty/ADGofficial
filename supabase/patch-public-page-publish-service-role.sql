-- ANU Explore public Pages publish service-role grants
-- Run once after patch-public-page-publish-requests.sql.
-- These grants are only for the Edge Function that writes the allowlisted
-- published JSON files to GitHub Pages.

grant usage on schema public to service_role;

grant select on public.admin_users to service_role;
grant select on public.building_label_overrides to service_role;
grant select on public.building_height_overrides to service_role;

grant select, update on public.public_page_publish_requests to service_role;
grant insert on public.admin_operation_logs to service_role;
