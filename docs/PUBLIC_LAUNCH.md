# Public launch checklist

Steps to squash git history and publish the repository. Run only after [DEPLOY.md](DEPLOY.md) is complete and production is verified.

## Pre-flight

- [ ] `npm test && npm run build` pass locally
- [ ] Secrets rotated per [SECRET_AUDIT.md](SECRET_AUDIT.md)
- [ ] Production smoke tests pass per [DEPLOY.md](DEPLOY.md)
- [ ] No `.env`, `.test-dist/`, or credentials in the working tree

## Squash history (orphan branch)

```sh
git checkout --orphan public-release
git add -A
git commit -m "Initial public release: LingoLeaf web showcase"
git branch -M main
```

This replaces all prior commits with a single clean commit.

## Push

**Warning:** This rewrites remote history.

```sh
git push --force origin main
```

For maximum history scrub, consider creating a **new public repo** (e.g. `lingoleaf-web`), pushing there, and archiving the old private `lingualeaf-web` repo.

GitHub may retain orphaned commits for ~90 days. Open a GitHub support ticket to request cache purge if secrets were ever in history.

## GitHub repository settings

After push, in **Settings → General**:

- [ ] Change visibility to **Public**
- [ ] Add description: "Companion website for LingoLeaf — React, Supabase, Cloudflare Pages"
- [ ] Add topics: `react`, `supabase`, `cloudflare-pages`, `language-learning`, `portfolio`

In **Settings → Code security and analysis**:

- [ ] Enable **Secret scanning**
- [ ] Enable **Push protection**

In **Settings → Branches**:

- [ ] Protect `main` — require CI status check before merge

## Post-public verification

- [ ] GitHub shows exactly **1 commit** on `main`
- [ ] No `.env` or `.test-dist/` in the repo tree
- [ ] CI workflow passes on `main`
- [ ] Production site still works after key rotation
- [ ] Client bundle contains only anon key (DevTools → search for `service_role` — should not appear)
