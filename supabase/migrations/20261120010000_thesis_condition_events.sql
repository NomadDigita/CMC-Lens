create table if not exists public.thesis_condition_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thesis_id uuid not null references public.theses(id) on delete cascade,
  condition_id uuid not null references public.thesis_conditions(id) on delete restrict,
  check_id uuid not null,
  outcome text not null check (outcome in ('met', 'not_met', 'unknown')),
  rule_snapshot jsonb not null check (jsonb_typeof(rule_snapshot) = 'object'),
  observed_value numeric,
  threshold numeric,
  unit text check (unit is null or char_length(unit) <= 40),
  source_provider text not null default 'unknown' check (char_length(source_provider) <= 80),
  source_endpoint text check (source_endpoint is null or char_length(source_endpoint) <= 160),
  source_observed_at timestamptz,
  evaluated_at timestamptz not null default now(),
  coverage text not null default 'unknown' check (coverage in ('complete', 'partial', 'unavailable', 'unknown')),
  freshness text not null default 'unknown' check (freshness in ('fresh', 'stale', 'missing', 'unavailable', 'unknown')),
  source_receipt jsonb not null default '{}'::jsonb check (jsonb_typeof(source_receipt) = 'object'),
  detail text not null default '' check (char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  unique (owner_id, condition_id, check_id)
);

create index if not exists condition_events_owner_thesis_time_idx
  on public.thesis_condition_events(owner_id, thesis_id, evaluated_at desc);
create index if not exists condition_events_owner_condition_time_idx
  on public.thesis_condition_events(owner_id, condition_id, evaluated_at desc);

alter table public.thesis_condition_events enable row level security;

drop policy if exists "condition event owner read" on public.thesis_condition_events;
create policy "condition event owner read" on public.thesis_condition_events
for select to authenticated
using (
  auth.uid() = owner_id
  and exists (
    select 1 from public.theses t
    where t.id = thesis_condition_events.thesis_id
      and t.owner_id = thesis_condition_events.owner_id
  )
  and exists (
    select 1 from public.thesis_conditions c
    where c.id = thesis_condition_events.condition_id
      and c.thesis_id = thesis_condition_events.thesis_id
      and c.owner_id = thesis_condition_events.owner_id
  )
);

revoke all on public.thesis_condition_events from anon, authenticated;
grant select on public.thesis_condition_events to authenticated;
grant select, insert on public.thesis_condition_events to service_role;
