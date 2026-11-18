-- CMC Lens research records. Apply only to the dedicated CMC Lens Supabase project.
-- User-owned records are protected by RLS. Snapshots/evidence/reviews are append-only.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.theses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  question text not null default '' check (char_length(question) <= 1200),
  thesis_text text not null default '' check (char_length(thesis_text) <= 4000),
  status text not null default 'open' check (status in ('open', 'due', 'reviewed', 'archived')),
  horizon_start timestamptz not null default now(),
  review_at timestamptz,
  primary_asset_id text,
  primary_asset_symbol text check (char_length(primary_asset_symbol) <= 24),
  benchmark_id text,
  privacy text not null default 'private' check (privacy in ('private', 'unlisted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thesis_id uuid not null references public.theses(id) on delete cascade,
  snapshot_kind text not null check (snapshot_kind in ('baseline', 'scheduled', 'manual_review')),
  source_provider text not null default 'coinmarketcap' check (char_length(source_provider) <= 40),
  source_endpoint text check (char_length(source_endpoint) <= 180),
  source_observed_at timestamptz,
  captured_at timestamptz not null default now(),
  period_start timestamptz,
  period_end timestamptz,
  currency text not null default 'USD' check (char_length(currency) <= 12),
  method_version text not null default '1',
  source_payload jsonb not null default '{}'::jsonb check (pg_column_size(source_payload) <= 65536),
  derived_metrics jsonb not null default '{}'::jsonb check (pg_column_size(derived_metrics) <= 32768),
  coverage text not null default 'complete' check (coverage in ('complete', 'partial', 'stale', 'unavailable')),
  limitations text not null default '' check (char_length(limitations) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.theses
  add column if not exists baseline_snapshot_id uuid references public.thesis_snapshots(id) on delete set null;

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thesis_id uuid not null references public.theses(id) on delete cascade,
  snapshot_id uuid references public.thesis_snapshots(id) on delete set null,
  kind text not null check (kind in ('metric', 'observation', 'supporting', 'conflicting', 'note')),
  label text not null check (char_length(label) between 1 and 180),
  detail text not null default '' check (char_length(detail) <= 2000),
  source_url text check (char_length(source_url) <= 2000),
  source_timestamp timestamptz,
  value_text text check (char_length(value_text) <= 180),
  unit text check (char_length(unit) <= 40),
  direction text check (direction in ('supports', 'conflicts', 'neutral')),
  created_at timestamptz not null default now()
);

create table if not exists public.thesis_conditions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thesis_id uuid not null references public.theses(id) on delete cascade,
  condition_type text not null default 'threshold' check (condition_type in ('threshold', 'qualitative')),
  metric_key text not null check (char_length(metric_key) between 1 and 120),
  operator text check (operator in ('gt', 'gte', 'lt', 'lte', 'eq', 'change_gt', 'change_lt')),
  threshold numeric,
  unit text check (char_length(unit) <= 40),
  effect text not null check (effect in ('strengthen', 'weaken', 'invalidate')),
  description text not null default '' check (char_length(description) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thesis_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thesis_id uuid not null references public.theses(id) on delete cascade,
  snapshot_id uuid references public.thesis_snapshots(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  result_label text not null check (result_label in ('Still supported', 'Mixed evidence', 'Weakened', 'No longer relevant')),
  summary text not null default '' check (char_length(summary) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists theses_owner_created_idx on public.theses(owner_id, created_at desc);
create index if not exists theses_owner_status_review_idx on public.theses(owner_id, status, review_at);
create index if not exists snapshots_owner_thesis_created_idx on public.thesis_snapshots(owner_id, thesis_id, captured_at desc);
create index if not exists evidence_owner_thesis_created_idx on public.evidence_items(owner_id, thesis_id, created_at);
create index if not exists conditions_owner_thesis_active_idx on public.thesis_conditions(owner_id, thesis_id, active);
create index if not exists reviews_owner_thesis_date_idx on public.thesis_reviews(owner_id, thesis_id, reviewed_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists theses_set_updated_at on public.theses;
create trigger theses_set_updated_at before update on public.theses
for each row execute function public.set_updated_at();
drop trigger if exists conditions_set_updated_at on public.thesis_conditions;
create trigger conditions_set_updated_at before update on public.thesis_conditions
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'name', ''), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_cmc_lens on auth.users;
create trigger on_auth_user_created_cmc_lens after insert on auth.users
for each row execute function public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.theses enable row level security;
alter table public.thesis_snapshots enable row level security;
alter table public.evidence_items enable row level security;
alter table public.thesis_conditions enable row level security;
alter table public.thesis_reviews enable row level security;

drop policy if exists "profile owner access" on public.profiles;
create policy "profile owner access" on public.profiles
for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "thesis owner access" on public.theses;
create policy "thesis owner access" on public.theses
for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "snapshot owner read" on public.thesis_snapshots;
create policy "snapshot owner read" on public.thesis_snapshots
for select to authenticated using (
  auth.uid() = thesis_snapshots.owner_id and exists (
    select 1 from public.theses t where t.id = thesis_snapshots.thesis_id and t.owner_id = thesis_snapshots.owner_id
  )
);
drop policy if exists "snapshot owner insert" on public.thesis_snapshots;
create policy "snapshot owner insert" on public.thesis_snapshots
for insert to authenticated with check (
  auth.uid() = thesis_snapshots.owner_id and exists (
    select 1 from public.theses t where t.id = thesis_snapshots.thesis_id and t.owner_id = thesis_snapshots.owner_id
  )
);

drop policy if exists "evidence owner read" on public.evidence_items;
create policy "evidence owner read" on public.evidence_items
for select to authenticated using (
  auth.uid() = evidence_items.owner_id and exists (
    select 1 from public.theses t where t.id = evidence_items.thesis_id and t.owner_id = evidence_items.owner_id
  )
);
drop policy if exists "evidence owner insert" on public.evidence_items;
create policy "evidence owner insert" on public.evidence_items
for insert to authenticated with check (
  auth.uid() = evidence_items.owner_id
  and exists (select 1 from public.theses t where t.id = evidence_items.thesis_id and t.owner_id = evidence_items.owner_id)
  and (evidence_items.snapshot_id is null or exists (
    select 1 from public.thesis_snapshots s where s.id = evidence_items.snapshot_id and s.owner_id = evidence_items.owner_id and s.thesis_id = evidence_items.thesis_id
  ))
);

drop policy if exists "condition owner access" on public.thesis_conditions;
create policy "condition owner access" on public.thesis_conditions
for all to authenticated
using (auth.uid() = thesis_conditions.owner_id and exists (
  select 1 from public.theses t where t.id = thesis_conditions.thesis_id and t.owner_id = thesis_conditions.owner_id
))
with check (auth.uid() = thesis_conditions.owner_id and exists (
  select 1 from public.theses t where t.id = thesis_conditions.thesis_id and t.owner_id = thesis_conditions.owner_id
));

drop policy if exists "review owner read" on public.thesis_reviews;
create policy "review owner read" on public.thesis_reviews
for select to authenticated using (
  auth.uid() = thesis_reviews.owner_id and exists (
    select 1 from public.theses t where t.id = thesis_reviews.thesis_id and t.owner_id = thesis_reviews.owner_id
  )
);
drop policy if exists "review owner insert" on public.thesis_reviews;
create policy "review owner insert" on public.thesis_reviews
for insert to authenticated with check (
  auth.uid() = thesis_reviews.owner_id
  and exists (select 1 from public.theses t where t.id = thesis_reviews.thesis_id and t.owner_id = thesis_reviews.owner_id)
  and (thesis_reviews.snapshot_id is null or exists (
    select 1 from public.thesis_snapshots s where s.id = thesis_reviews.snapshot_id and s.owner_id = thesis_reviews.owner_id and s.thesis_id = thesis_reviews.thesis_id
  ))
);

revoke all on public.profiles, public.theses, public.thesis_snapshots,
  public.evidence_items, public.thesis_conditions, public.thesis_reviews from anon;
grant select, insert, update, delete on public.profiles, public.theses, public.thesis_conditions to authenticated;
grant select, insert on public.thesis_snapshots, public.evidence_items, public.thesis_reviews to authenticated;
