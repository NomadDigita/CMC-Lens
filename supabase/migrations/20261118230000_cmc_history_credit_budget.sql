create table if not exists public.cmc_history_credit_events (
  event_id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  credit_units smallint not null check (credit_units between 1 and 30),
  requested_at timestamptz not null default now()
);

create index if not exists cmc_history_credit_events_scope_time_idx
  on public.cmc_history_credit_events (scope_key, requested_at);

alter table public.cmc_history_credit_events enable row level security;
revoke all on table public.cmc_history_credit_events from public, anon, authenticated;
grant select, insert, delete on table public.cmc_history_credit_events to service_role;

create or replace function public.reserve_cmc_history_budget(p_user_id uuid, p_credits integer)
returns table (allowed boolean, retry_after_seconds integer, remaining_credits integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_scope text;
  v_limit integer;
  v_spent integer;
  v_oldest timestamptz;
  v_user_spent integer := 0;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'user id is required';
  end if;
  if p_credits is null or p_credits < 1 or p_credits > 30 then
    raise exception using errcode = '22023', message = 'credit estimate is outside the allowed range';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cmc-history:global', 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cmc-history:user:' || p_user_id::text, 0));

  delete from public.cmc_history_credit_events
  where requested_at <= v_now - interval '1 hour';

  for v_scope, v_limit in
    select 'global'::text, 120
    union all
    select 'user:' || p_user_id::text, 60
  loop
    select coalesce(sum(credit_units), 0)::integer, min(requested_at)
      into v_spent, v_oldest
      from public.cmc_history_credit_events
      where scope_key = v_scope and requested_at > v_now - interval '1 hour';

    if v_spent + p_credits > v_limit then
      return query
        select false,
          greatest(1, ceil(extract(epoch from (v_oldest + interval '1 hour' - v_now)))::integer),
          greatest(0, v_limit - v_spent);
      return;
    end if;

    if v_scope = 'user:' || p_user_id::text then
      v_user_spent := v_spent;
    end if;
  end loop;

  insert into public.cmc_history_credit_events (scope_key, credit_units)
  values ('global', p_credits), ('user:' || p_user_id::text, p_credits);

  return query select true, 0, greatest(0, 60 - v_user_spent - p_credits);
end;
$$;

revoke all on function public.reserve_cmc_history_budget(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_cmc_history_budget(uuid, integer) to service_role;