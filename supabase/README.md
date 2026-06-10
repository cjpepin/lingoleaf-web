# Supabase: lingoleaf schema

This app stores all tables, functions, and RLS policies in the **`lingoleaf`** schema for use in a **shared Supabase project** alongside other demo apps.

## Greenfield setup

1. Create or open your Supabase project.
2. Apply [`migrations/202604090001_lingoleaf_schema.sql`](migrations/202604090001_lingoleaf_schema.sql).
3. Expose `lingoleaf` in API settings (see [`config.toml`](config.toml)).
4. Set `VITE_SUPABASE_DB_SCHEMA=lingoleaf` in the web app env.

## What lives where

| Schema | Contents |
|--------|----------|
| `auth` | Supabase Auth users (shared) |
| `lingoleaf` | Forum, blog, analytics, admin RPCs |
| `public` | Unused by this app (may hold other demos) |

## Mobile / other clients

Any client writing to `analytics_events` must target the `lingoleaf` schema (Supabase client `db.schema: 'lingoleaf'` or REST `Content-Profile: lingoleaf`).
