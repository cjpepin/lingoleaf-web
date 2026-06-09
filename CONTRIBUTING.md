# Contributing

Thanks for your interest in LingoLeaf web. This is primarily a **portfolio and reference showcase** for a production companion website — not an actively maintained open-source product.

## What we welcome

- Bug reports with clear reproduction steps
- Documentation improvements
- Small, focused fixes with tests where applicable

## What we generally won't merge

- Large refactors or rewrites without prior discussion
- Changes to production secrets, env files, or deployment credentials
- Features that expand scope beyond the existing marketing/community site

## Development setup

See [README.md](README.md) for local setup. In short:

```sh
npm install
cp .env.example .env
npm run dev
```

Run tests before opening a PR:

```sh
npm test
npm run lint
npm run build
```

## Pull requests

1. Fork the repository and create a feature branch from `main`.
2. Keep changes focused and explain the motivation in the PR description.
3. Ensure CI passes (lint, test, build, secret scan).
4. Do not include secrets, `.env` files, or generated artifacts (e.g. `.test-dist/`).

## Code of conduct

Be respectful and constructive. We reserve the right to close issues or PRs that are spam, abusive, or unrelated to this project.
