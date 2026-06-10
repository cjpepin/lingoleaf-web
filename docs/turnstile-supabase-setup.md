# Turnstile + Supabase Setup (lingoleaf schema)

LingoLeaf uses the **`lingoleaf` Postgres schema** in a shared Supabase project. Auth stays in `auth.*`; app data lives in `lingoleaf.*`.

## 1) Apply the greenfield migration

Run once on a fresh database (or empty `lingoleaf` schema):

```
supabase/migrations/202604090001_lingoleaf_schema.sql
```

Via Supabase CLI:

```sh
supabase db push
```

Or paste the migration into the Supabase SQL editor.

## 2) Expose the schema to PostgREST

In **Supabase Dashboard → Settings → API**, add `lingoleaf` to **Exposed schemas** (or use [`supabase/config.toml`](config.toml) with `schemas = ["lingoleaf", ...]`).

## 3) Cloudflare Pages environment variables

Client-exposed (frontend build):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_DB_SCHEMA=lingoleaf`
- `VITE_TURNSTILE_SITE_KEY`

Server-only (Pages Functions under `/lingoleaf/api/*`):

- `TURNSTILE_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — Turnstile verification write only

## 4) Auth redirect URLs

Add these to **Supabase Auth → URL configuration** (replace `yourdomain.com`):

- `https://yourdomain.com/lingoleaf/email-confirmed`
- `https://yourdomain.com/lingoleaf/**` (or specific routes)

## 5) Turnstile + redeploy

- Restrict Turnstile widget domains to your parent domain.
- Redeploy Cloudflare Pages after env vars and migrations are applied.

## 6) Seed a forum admin

```sql
insert into lingoleaf.forum_admins (user_id)
values ('YOUR_AUTH_USER_UUID');
```

## Shared database pattern

Other demo apps can add their own schemas (e.g. `other_app`) in the same Supabase project. Each app:

1. Creates its schema + grants
2. Is exposed via PostgREST `Accept-Profile` / client `db.schema`
3. Keeps auth in the shared `auth` schema
