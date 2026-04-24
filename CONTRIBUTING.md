# Contributing to Origin

Thanks for contributing. This doc covers how we work so you (or future-you) doesn't have to guess.

## Setup

```bash
npm install
cp apps/customer/.env.example apps/customer/.env.local
cp apps/admin/.env.example  apps/admin/.env.local
# Edit each file with real values.
npm run customer:dev   # http://localhost:3000
npm run admin:dev      # http://localhost:3002
```

Node 22 (see `.nvmrc`).

## Branching

- `main` — always deployable. Vercel auto-deploys every push here.
- Feature work: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- Open a PR against `main` when ready. CI must pass.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org):

```
feat(customer): add fleet filter by brand
fix(admin): booking table pagination off-by-one
chore(deps): bump next to 15.5.15
docs: update CLAUDE.md for new locale
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `security`, `compliance`.
Scopes (optional): `customer`, `admin`, `infra`, `deps`.

## Code standards

- TypeScript everywhere. No `any` unless explicitly justified.
- No hardcoded user-facing strings — use `next-intl` translation keys in all three locales (`en`, `ar`, `zh-CN`).
- RTL-safe layout: use `ms-`, `me-`, `start-`, `end-`, `ps-`, `pe-` (native Tailwind), not `ml-`, `mr-`, `left-`, `right-`.
- No customer PII in git — ever. Not in code, not in tests, not in logs, not in issue screenshots.

## Testing

```bash
npm test                  # all workspaces
npm test --workspace=customer
npm run type-check        # all workspaces
```

## Compliance

Any change touching pricing, invoicing, legal text, KYC, or authentication needs a `compliance:*` label on the PR so it's flagged for review. See `docs/` for:

- `data-model.md` — Postgres schema
- `api-design.md` — REST conventions
- `integrations.md` — third-party service setup

## Secrets

- Local: `.env.local` (gitignored).
- Production: Vercel env vars per project.
- Never commit secrets. GitHub's secret scanner will flag them, but don't rely on it.

## Releases

- Milestones track release scope: `Beta launch`, `v1.0 — Public launch`.
- Tags (`v1.0.0`) trigger GitHub Releases with auto-generated notes.
- See the "Origin Roadmap" Project for timeline.
