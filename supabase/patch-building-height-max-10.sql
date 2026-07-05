-- ANU Explore building height max multiplier patch
-- Run once in Supabase SQL Editor if the table was created before the max changed to 10.

alter table public.building_height_overrides
  drop constraint if exists building_height_overrides_draft_multiplier_check,
  add constraint building_height_overrides_draft_multiplier_check
    check (draft_multiplier > 0 and draft_multiplier <= 10);

alter table public.building_height_overrides
  drop constraint if exists building_height_overrides_published_multiplier_check,
  add constraint building_height_overrides_published_multiplier_check
    check (published_multiplier is null or (published_multiplier > 0 and published_multiplier <= 10));
