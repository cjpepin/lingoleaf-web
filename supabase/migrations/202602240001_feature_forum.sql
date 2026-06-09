-- Feature Forum schema + RLS
-- Run this in Supabase SQL editor (or via migrations)

create extension if not exists pgcrypto;

create table if not exists public.forum_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 140),
  body text not null check (char_length(trim(body)) >= 10),
  tags text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'planned', 'in_progress', 'done', 'declined')),
  pinned boolean not null default false,
  locked boolean not null default false,
  vote_count integer not null default 0 check (vote_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  constraint feature_request_tag_count check (coalesce(array_length(tags, 1), 0) <= 10)
);

create table if not exists public.feature_votes (
  feature_id uuid not null references public.feature_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, user_id)
);

create table if not exists public.feature_comments (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references public.feature_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 2)
);

create index if not exists feature_requests_created_at_idx on public.feature_requests (created_at desc);
create index if not exists feature_requests_status_idx on public.feature_requests (status);
create index if not exists feature_requests_vote_count_idx on public.feature_requests (vote_count desc);
create index if not exists feature_requests_pinned_idx on public.feature_requests (pinned desc);
create index if not exists feature_requests_created_by_idx on public.feature_requests (created_by);
create index if not exists feature_requests_tags_gin_idx on public.feature_requests using gin (tags);

create index if not exists feature_votes_user_id_idx on public.feature_votes (user_id);
create index if not exists feature_votes_feature_id_idx on public.feature_votes (feature_id);

create index if not exists feature_comments_feature_id_created_at_idx on public.feature_comments (feature_id, created_at asc);
create index if not exists feature_comments_created_by_idx on public.feature_comments (created_by);

create or replace function public.is_forum_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.forum_admins fa
    where fa.user_id = auth.uid()
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_feature_request_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if not public.is_forum_admin() and exists (
    select 1
    from public.feature_requests fr
    where fr.created_by = new.created_by
      and fr.created_at > now() - interval '1 minute'
  ) then
    raise exception 'You can only create one feature request per minute.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_feature_request_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if not public.is_forum_admin()
    and (
      new.status <> old.status
      or new.pinned <> old.pinned
      or new.locked <> old.locked
    ) then
    raise exception 'Only forum admins can change status, pin, or lock.';
  end if;

  return new;
end;
$$;

create or replace function public.apply_vote_count_delta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.feature_requests
    set vote_count = vote_count + 1
    where id = new.feature_id;

    return new;
  end if;

  update public.feature_requests
  set vote_count = greatest(vote_count - 1, 0)
  where id = old.feature_id;

  return old;
end;
$$;

create or replace function public.enforce_feature_comment_insert_rules()
returns trigger
language plpgsql
as $$
declare
  is_locked boolean;
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  select fr.locked
  into is_locked
  from public.feature_requests fr
  where fr.id = new.feature_id;

  if coalesce(is_locked, false) and not public.is_forum_admin() then
    raise exception 'Comments are locked for this request.';
  end if;

  if not public.is_forum_admin() and exists (
    select 1
    from public.feature_comments fc
    where fc.created_by = new.created_by
      and fc.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'You can only post one comment every 15 seconds.';
  end if;

  return new;
end;
$$;

create or replace function public.apply_comment_count_delta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.feature_requests
    set comment_count = comment_count + 1
    where id = new.feature_id;

    return new;
  end if;

  update public.feature_requests
  set comment_count = greatest(comment_count - 1, 0)
  where id = old.feature_id;

  return old;
end;
$$;

drop trigger if exists feature_requests_set_updated_at on public.feature_requests;
create trigger feature_requests_set_updated_at
before update on public.feature_requests
for each row
execute function public.set_updated_at();

drop trigger if exists feature_requests_insert_rules on public.feature_requests;
create trigger feature_requests_insert_rules
before insert on public.feature_requests
for each row
execute function public.enforce_feature_request_insert_rules();

drop trigger if exists feature_requests_update_rules on public.feature_requests;
create trigger feature_requests_update_rules
before update on public.feature_requests
for each row
execute function public.enforce_feature_request_update_rules();

drop trigger if exists feature_votes_count_trigger on public.feature_votes;
create trigger feature_votes_count_trigger
after insert or delete on public.feature_votes
for each row
execute function public.apply_vote_count_delta();

drop trigger if exists feature_comments_set_updated_at on public.feature_comments;
create trigger feature_comments_set_updated_at
before update on public.feature_comments
for each row
execute function public.set_updated_at();

drop trigger if exists feature_comments_insert_rules on public.feature_comments;
create trigger feature_comments_insert_rules
before insert on public.feature_comments
for each row
execute function public.enforce_feature_comment_insert_rules();

drop trigger if exists feature_comments_count_trigger on public.feature_comments;
create trigger feature_comments_count_trigger
after insert or delete on public.feature_comments
for each row
execute function public.apply_comment_count_delta();

alter table public.forum_admins enable row level security;
alter table public.feature_requests enable row level security;
alter table public.feature_votes enable row level security;
alter table public.feature_comments enable row level security;

drop policy if exists "forum_admins_select_self_or_admin" on public.forum_admins;
create policy "forum_admins_select_self_or_admin"
on public.forum_admins
for select
using (auth.uid() = user_id or public.is_forum_admin());

drop policy if exists "forum_admins_manage_admin_only" on public.forum_admins;
create policy "forum_admins_manage_admin_only"
on public.forum_admins
for all
using (public.is_forum_admin())
with check (public.is_forum_admin());

drop policy if exists "feature_requests_public_read" on public.feature_requests;
create policy "feature_requests_public_read"
on public.feature_requests
for select
using (true);

drop policy if exists "feature_requests_insert_authenticated" on public.feature_requests;
create policy "feature_requests_insert_authenticated"
on public.feature_requests
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "feature_requests_owner_update" on public.feature_requests;
create policy "feature_requests_owner_update"
on public.feature_requests
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "feature_requests_admin_update" on public.feature_requests;
create policy "feature_requests_admin_update"
on public.feature_requests
for update
to authenticated
using (public.is_forum_admin())
with check (public.is_forum_admin());

drop policy if exists "feature_requests_owner_delete" on public.feature_requests;
create policy "feature_requests_owner_delete"
on public.feature_requests
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists "feature_requests_admin_delete" on public.feature_requests;
create policy "feature_requests_admin_delete"
on public.feature_requests
for delete
to authenticated
using (public.is_forum_admin());

drop policy if exists "feature_votes_select_own_or_admin" on public.feature_votes;
create policy "feature_votes_select_own_or_admin"
on public.feature_votes
for select
to authenticated
using (auth.uid() = user_id or public.is_forum_admin());

drop policy if exists "feature_votes_insert_own" on public.feature_votes;
create policy "feature_votes_insert_own"
on public.feature_votes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "feature_votes_delete_own_or_admin" on public.feature_votes;
create policy "feature_votes_delete_own_or_admin"
on public.feature_votes
for delete
to authenticated
using (auth.uid() = user_id or public.is_forum_admin());

drop policy if exists "feature_comments_public_read" on public.feature_comments;
create policy "feature_comments_public_read"
on public.feature_comments
for select
using (true);

drop policy if exists "feature_comments_insert_authenticated" on public.feature_comments;
create policy "feature_comments_insert_authenticated"
on public.feature_comments
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "feature_comments_owner_update" on public.feature_comments;
create policy "feature_comments_owner_update"
on public.feature_comments
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "feature_comments_admin_update" on public.feature_comments;
create policy "feature_comments_admin_update"
on public.feature_comments
for update
to authenticated
using (public.is_forum_admin())
with check (public.is_forum_admin());

drop policy if exists "feature_comments_owner_delete" on public.feature_comments;
create policy "feature_comments_owner_delete"
on public.feature_comments
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists "feature_comments_admin_delete" on public.feature_comments;
create policy "feature_comments_admin_delete"
on public.feature_comments
for delete
to authenticated
using (public.is_forum_admin());

-- Seed your admin user (replace with your auth.users.id UUID):
-- insert into public.forum_admins (user_id) values ('00000000-0000-0000-0000-000000000000');
