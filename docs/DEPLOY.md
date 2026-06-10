# Production deployment checklist

Complete these steps when deploying to **`/lingoleaf`** on your domain with the **`lingoleaf` Supabase schema**.

## 1. Rotate secrets

Follow [SECRET_AUDIT.md](SECRET_AUDIT.md):

- [ ] Rotate `RESEND_API_KEY` in Resend; update Cloudflare Pages (Production + Preview)
- [ ] Rotate `TURNSTILE_SECRET_KEY` in Cloudflare Turnstile dashboard
- [ ] Add or rotate `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare Pages (encrypted, server-only)

## 2. Apply Supabase migration (greenfield)

On a fresh shared Supabase project (or empty `lingoleaf` schema):

1. Apply [`supabase/migrations/202604090001_lingoleaf_schema.sql`](../supabase/migrations/202604090001_lingoleaf_schema.sql)
2. Expose `lingoleaf` in **Settings → API → Exposed schemas**
3. Seed admin: `insert into lingoleaf.forum_admins (user_id) values ('...');`

Verify in SQL editor:

```sql
-- Should fail for authenticated users:
select lingoleaf.mark_forum_human_verified_for_user(auth.uid());
```

## 3. Supabase Auth redirect URLs

Add to **Auth → URL configuration** (replace `yourdomain.com`):

- `https://yourdomain.com/lingoleaf/email-confirmed`
- Site URL / redirect allow list for `/lingoleaf/**`

## 4. Deploy to Cloudflare Pages

Build env vars (**Production** and **Preview**):

| Variable | Encrypted |
|----------|-----------|
| `VITE_SUPABASE_URL` | No (build-time) |
| `VITE_SUPABASE_ANON_KEY` | No (build-time) |
| `VITE_SUPABASE_DB_SCHEMA=lingoleaf` | No (build-time) |
| `VITE_TURNSTILE_SITE_KEY` | No (build-time) |
| `SUPABASE_URL` | Yes |
| `SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `TURNSTILE_SECRET_KEY` | Yes |
| `RESEND_API_KEY` | Yes |

Functions live at **`/lingoleaf/api/*`** (`functions/lingoleaf/api/`). SPA fallback: `public/_redirects`.

## 5. Smoke tests

After deploy, verify at `https://yourdomain.com/lingoleaf/`:

- [ ] Landing page loads (assets under `/lingoleaf/assets/...`)
- [ ] Sign in (email or OAuth) works
- [ ] Feature Forum: Turnstile + posting works
- [ ] Contact form at `/lingoleaf/contact` sends email
- [ ] Admin analytics at `/lingoleaf/admin/analytics` loads for forum admins
- [ ] Direct RPC bypass blocked for `mark_forum_human_verified_for_user`

## 6. Local verification (pre-deploy)

```sh
npm ci
npm run lint
npm test
npm run build
```

Open [http://localhost:8080/lingoleaf/](http://localhost:8080/lingoleaf/) after `npm run dev`.
