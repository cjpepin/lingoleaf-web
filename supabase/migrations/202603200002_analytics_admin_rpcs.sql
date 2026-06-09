-- Mobile app analytics events + admin dashboard RPCs.
-- Matches the admin analytics API consumed by functions/api/admin-analytics.ts.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (char_length(trim(event_name)) between 1 and 120),
  event_version integer not null default 1 check (event_version >= 1),
  install_id text,
  app_version text,
  platform text,
  locale text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name);

create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_insert_authenticated on public.analytics_events;
create policy analytics_events_insert_authenticated
  on public.analytics_events
  for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

create or replace function public.analytics_is_failure_event(p_event_name text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_event_name, '') ~* '(fail|error|exception|timeout|invalid|reject|denied|blocked|abandon|drop|cancel)';
$$;

create or replace function public.analytics_admin_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_forum_admin() then
    raise exception 'Not authorized for analytics dashboard.' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'Invalid date range.' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'totals', jsonb_build_object(
      'events', count(*)::bigint,
      'failures', count(*) filter (where public.analytics_is_failure_event(event_name))::bigint,
      'users', count(distinct user_id) filter (where user_id is not null)::bigint,
      'installs', count(distinct install_id) filter (where install_id is not null and install_id <> '')::bigint,
      'last_event_at', max(created_at)
    ),
    'daily_events', coalesce(
      (
        select jsonb_agg(jsonb_build_object('day', day_bucket, 'count', event_count) order by day_bucket)
        from (
          select date_trunc('day', created_at) as day_bucket, count(*) as event_count
          from public.analytics_events
          where created_at >= p_from and created_at < p_to
          group by 1
        ) daily
      ),
      '[]'::jsonb
    ),
    'daily_failures', coalesce(
      (
        select jsonb_agg(jsonb_build_object('day', day_bucket, 'count', failure_count) order by day_bucket)
        from (
          select date_trunc('day', created_at) as day_bucket, count(*) as failure_count
          from public.analytics_events
          where created_at >= p_from and created_at < p_to
            and public.analytics_is_failure_event(event_name)
          group by  1
        ) daily_failures
      ),
      '[]'::jsonb
    ),
    'top_events', coalesce(
      (
        select jsonb_agg(jsonb_build_object('event_name', event_name, 'count', event_count) order by event_count desc, event_name asc)
        from (
          select event_name, count(*) as event_count
          from public.analytics_events
          where created_at >= p_from and created_at < p_to
          group by event_name
          order by event_count desc, event_name asc
          limit 20
        ) top_rows
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.analytics_events
  where created_at >= p_from and created_at < p_to;

  return coalesce(result, jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'totals', jsonb_build_object(
      'events', 0,
      'failures', 0,
      'users', 0,
      'installs', 0,
      'last_event_at', null
    ),
    'daily_events', '[]'::jsonb,
    'daily_failures', '[]'::jsonb,
    'top_events', '[]'::jsonb
  ));
end;
$$;

create or replace function public.analytics_admin_recent_events(
  p_limit integer,
  p_from timestamptz,
  p_to timestamptz
)
returns setof public.analytics_events
language plpgsql
security definer
set search_path = public
as $$
declare
  bounded_limit integer;
begin
  if not public.is_forum_admin() then
    raise exception 'Not authorized for analytics dashboard.' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'Invalid date range.' using errcode = '22023';
  end if;

  bounded_limit := least(greatest(coalesce(p_limit, 50), 1), 200);

  return query
  select ae.*
  from public.analytics_events ae
  where ae.created_at >= p_from
    and ae.created_at < p_to
  order by ae.created_at desc
  limit bounded_limit;
end;
$$;

grant execute on function public.analytics_admin_dashboard(timestamptz, timestamptz) to authenticated;
grant execute on function public.analytics_admin_recent_events(integer, timestamptz, timestamptz) to authenticated;
