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
  v_required integer;
  v_retry_at timestamptz;
  v_retry_after integer := 0;
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
    select coalesce(sum(credit_units), 0)::integer
      into v_spent
      from public.cmc_history_credit_events
      where scope_key = v_scope and requested_at > v_now - interval '1 hour';

    if v_spent + p_credits > v_limit then
      v_required := v_spent + p_credits - v_limit;
      select event.requested_at + interval '1 hour'
        into v_retry_at
        from (
          select event_id, requested_at,
            sum(credit_units) over (order by requested_at, event_id) as released_credits
          from public.cmc_history_credit_events
          where scope_key = v_scope and requested_at > v_now - interval '1 hour'
        ) as event
        where event.released_credits >= v_required
        order by event.requested_at, event.event_id
        limit 1;
      v_retry_after := greatest(v_retry_after,
        greatest(1, ceil(extract(epoch from (v_retry_at - v_now)))::integer));
    end if;

    if v_scope = 'user:' || p_user_id::text then
      v_user_spent := v_spent;
    end if;
  end loop;

  if v_retry_after > 0 then
    return query select false, v_retry_after, greatest(0, 60 - v_user_spent);
    return;
  end if;

  insert into public.cmc_history_credit_events (scope_key, credit_units)
  values ('global', p_credits), ('user:' || p_user_id::text, p_credits);

  return query select true, 0, greatest(0, 60 - v_user_spent - p_credits);
end;
$$;

revoke all on function public.reserve_cmc_history_budget(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_cmc_history_budget(uuid, integer) to service_role;