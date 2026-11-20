alter table public.thesis_condition_events
  drop constraint if exists thesis_condition_events_condition_id_fkey;

alter table public.thesis_condition_events
  add constraint thesis_condition_events_condition_id_fkey
  foreign key (condition_id) references public.thesis_conditions(id) on delete cascade;

create table if not exists public.thesis_condition_check_cooldowns (
  condition_id uuid primary key references public.thesis_conditions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  reserved_at timestamptz not null default now()
);

alter table public.thesis_condition_check_cooldowns enable row level security;
revoke all on public.thesis_condition_check_cooldowns from public, anon, authenticated;
grant select, insert, update, delete on public.thesis_condition_check_cooldowns to service_role;

create or replace function public.reserve_thesis_condition_check(
  p_owner_id uuid,
  p_condition_id uuid,
  p_cooldown_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reserved boolean := false;
begin
  insert into public.thesis_condition_check_cooldowns (condition_id, owner_id, reserved_at)
  values (p_condition_id, p_owner_id, now())
  on conflict (condition_id) do update
    set owner_id = excluded.owner_id,
        reserved_at = now()
    where public.thesis_condition_check_cooldowns.owner_id = excluded.owner_id
      and public.thesis_condition_check_cooldowns.reserved_at <= now() - make_interval(
        secs => least(greatest(coalesce(p_cooldown_seconds, 60), 1), 3600)
      )
  returning true into v_reserved;

  return coalesce(v_reserved, false);
end;
$$;

revoke execute on function public.reserve_thesis_condition_check(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_thesis_condition_check(uuid, uuid, integer) to service_role;
