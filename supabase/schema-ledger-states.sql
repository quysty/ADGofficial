create table if not exists public.ledger_states (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  schema_version smallint not null default 3,
  ledger_state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ledger_states_schema_version_check check (
    schema_version = 3
    and ledger_state ? 'schemaVersion'
    and ledger_state ->> 'schemaVersion' = '3'
  ),
  constraint ledger_states_state_shape_check check (
    jsonb_typeof(ledger_state) = 'object'
    and ledger_state ?& array['rows', 'recs', 'accts', 'skip', 'rateCny']
    and jsonb_typeof(ledger_state -> 'rows') = 'array'
    and jsonb_typeof(ledger_state -> 'recs') = 'array'
    and jsonb_typeof(ledger_state -> 'accts') = 'array'
    and jsonb_typeof(ledger_state -> 'skip') = 'array'
    and jsonb_typeof(ledger_state -> 'rateCny') = 'number'
  ),
  constraint ledger_states_state_limits_check check (
    case
      when jsonb_typeof(ledger_state -> 'rows') = 'array'
        and jsonb_typeof(ledger_state -> 'recs') = 'array'
        and jsonb_typeof(ledger_state -> 'accts') = 'array'
        and jsonb_typeof(ledger_state -> 'skip') = 'array'
      then jsonb_array_length(ledger_state -> 'rows') <= 10000
        and jsonb_array_length(ledger_state -> 'recs') <= 500
        and jsonb_array_length(ledger_state -> 'accts') <= 200
        and jsonb_array_length(ledger_state -> 'skip') <= 10000
      else false
    end
    and pg_column_size(ledger_state) <= 2097152
  )
);

comment on table public.ledger_states is
  'One automatically saved living-ledger snapshot per permanent ANU Explore account.';

create or replace function public.touch_ledger_states_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.touch_ledger_states_updated_at() from public, anon, authenticated;

drop trigger if exists ledger_states_set_updated_at on public.ledger_states;
create trigger ledger_states_set_updated_at
before update on public.ledger_states
for each row
execute function public.touch_ledger_states_updated_at();

alter table public.ledger_states enable row level security;

revoke all on table public.ledger_states from anon;
revoke all on table public.ledger_states from authenticated;
grant select, insert, update on table public.ledger_states to authenticated;

drop policy if exists "ledger_states_select_own" on public.ledger_states;
create policy "ledger_states_select_own"
on public.ledger_states
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists "ledger_states_insert_own" on public.ledger_states;
create policy "ledger_states_insert_own"
on public.ledger_states
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists "ledger_states_update_own" on public.ledger_states;
create policy "ledger_states_update_own"
on public.ledger_states
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
