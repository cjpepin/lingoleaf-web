-- App Updates blog posts + comments

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 200),
  summary text not null default '' check (char_length(summary) <= 280),
  body text not null check (char_length(trim(body)) >= 20),
  comment_count integer not null default 0 check (comment_count >= 0)
);

create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 2000)
);

create index if not exists blog_posts_created_at_idx
  on public.blog_posts (created_at desc);

create index if not exists blog_posts_created_by_idx
  on public.blog_posts (created_by);

create index if not exists blog_comments_post_id_created_at_idx
  on public.blog_comments (post_id, created_at asc);

create index if not exists blog_comments_created_by_idx
  on public.blog_comments (created_by);

create or replace function public.enforce_blog_post_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  if not public.is_forum_admin() then
    raise exception 'Only admins can create blog posts.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_blog_post_update_rules()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  if not public.is_forum_admin() then
    raise exception 'Only admins can update blog posts.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_blog_comment_insert_rules()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is distinct from new.created_by then
    raise exception 'created_by must match auth.uid()';
  end if;

  return new;
end;
$$;

create or replace function public.apply_blog_comment_count_delta()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.blog_posts
    set comment_count = comment_count + 1
    where id = new.post_id;

    return new;
  end if;

  update public.blog_posts
  set comment_count = greatest(comment_count - 1, 0)
  where id = old.post_id;

  return old;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
before update on public.blog_posts
for each row
execute function public.set_updated_at();

drop trigger if exists blog_posts_insert_rules on public.blog_posts;
create trigger blog_posts_insert_rules
before insert on public.blog_posts
for each row
execute function public.enforce_blog_post_insert_rules();

drop trigger if exists blog_posts_update_rules on public.blog_posts;
create trigger blog_posts_update_rules
before update on public.blog_posts
for each row
execute function public.enforce_blog_post_update_rules();

drop trigger if exists blog_comments_set_updated_at on public.blog_comments;
create trigger blog_comments_set_updated_at
before update on public.blog_comments
for each row
execute function public.set_updated_at();

drop trigger if exists blog_comments_insert_rules on public.blog_comments;
create trigger blog_comments_insert_rules
before insert on public.blog_comments
for each row
execute function public.enforce_blog_comment_insert_rules();

drop trigger if exists blog_comments_count_trigger on public.blog_comments;
create trigger blog_comments_count_trigger
after insert or delete on public.blog_comments
for each row
execute function public.apply_blog_comment_count_delta();

alter table public.blog_posts enable row level security;
alter table public.blog_comments enable row level security;

drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read"
on public.blog_posts
for select
using (true);

drop policy if exists "blog_posts_admin_insert" on public.blog_posts;
create policy "blog_posts_admin_insert"
on public.blog_posts
for insert
to authenticated
with check (public.is_forum_admin() and auth.uid() = created_by);

drop policy if exists "blog_posts_admin_update" on public.blog_posts;
create policy "blog_posts_admin_update"
on public.blog_posts
for update
to authenticated
using (public.is_forum_admin())
with check (public.is_forum_admin());

drop policy if exists "blog_posts_admin_delete" on public.blog_posts;
create policy "blog_posts_admin_delete"
on public.blog_posts
for delete
to authenticated
using (public.is_forum_admin());

drop policy if exists "blog_comments_public_read" on public.blog_comments;
create policy "blog_comments_public_read"
on public.blog_comments
for select
using (true);

drop policy if exists "blog_comments_authenticated_insert" on public.blog_comments;
create policy "blog_comments_authenticated_insert"
on public.blog_comments
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "blog_comments_owner_update" on public.blog_comments;
create policy "blog_comments_owner_update"
on public.blog_comments
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "blog_comments_admin_update" on public.blog_comments;
create policy "blog_comments_admin_update"
on public.blog_comments
for update
to authenticated
using (public.is_forum_admin())
with check (public.is_forum_admin());

drop policy if exists "blog_comments_owner_delete" on public.blog_comments;
create policy "blog_comments_owner_delete"
on public.blog_comments
for delete
to authenticated
using (auth.uid() = created_by);

drop policy if exists "blog_comments_admin_delete" on public.blog_comments;
create policy "blog_comments_admin_delete"
on public.blog_comments
for delete
to authenticated
using (public.is_forum_admin());
