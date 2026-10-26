# Deploy to Vercel

## 1. Get a Postgres database

SQLite (`dev.db`) won't work on Vercel — serverless functions can't share a file. Pick one:

- **Neon** (recommended, free tier): https://neon.tech → create project → copy `Pooled connection` + `Direct connection` strings
- **Supabase**: https://supabase.com/dashboard → Project Settings → Database → URI
- **Vercel Marketplace**: Vercel dashboard → Storage → choose Neon/Supabase/Upstash

You need two URLs:
- `DATABASE_URL` — pooled (used by app at runtime, includes `pgbouncer=true&connection_limit=1`)
- `DIRECT_URL` — direct (used by Prisma migrations only)

## 2. Switch Prisma schema to Postgres

```bash
# Replace SQLite schema with the Postgres one
cp prisma/schema.postgres.prisma prisma/schema.prisma

# Wipe SQLite migrations (they won't replay on Postgres)
rm -rf prisma/migrations prisma/dev.db

# Create a fresh initial migration against Postgres
DATABASE_URL="<your DIRECT_URL>" DIRECT_URL="<your DIRECT_URL>" npx prisma migrate dev --name init
```

Commit `prisma/migrations/` so Vercel can replay them at build time.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:YOU/teraruim.git
git push -u origin main
```

## 4. Import into Vercel

```bash
npm i -g vercel        # if not installed
vercel                 # link project
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add AUTH_SECRET production           # openssl rand -base64 32
vercel env add NEXTAUTH_URL production          # https://your-domain.vercel.app
vercel env add ADEX_USER production               # ADEX account login
vercel env add ADEX_PWD production                # ADEX account password
vercel env add AUTH_TRUST_HOST production           # true
vercel --prod
```

The `build` script runs `prisma generate && prisma migrate deploy && next build` — schema is auto-applied to Postgres on every deploy.

## 5. Seed products (one-time)

After first deploy, seed remotely:

```bash
DATABASE_URL="<your DIRECT_URL>" npx tsx prisma/seed.ts
```

Or run it from your machine with the production URL exported.

## 6. Domain + DNS

Vercel dashboard → Settings → Domains → add custom domain. Update `NEXTAUTH_URL` env to match.

## 7. ADEX tracking

ADEX is pull-only (no webhook). Order status is fetched on demand:
- `GET /api/tracking/order/:id` → `get_etat_cmd.php` (current state)
- `Order.adexBarcode` / `Order.adexLabelUrl` are stored at checkout from `add_colis.php`

## Local development reset

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Environment variable summary

| Var | Required | Local | Prod |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `file:./dev.db` | Postgres pooled |
| `DIRECT_URL` | prod only | — | Postgres direct |
| `AUTH_SECRET` | ✅ | any string | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | ✅ | `true` | `true` |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | `https://your-domain` |
| `ADEX_USER` | optional | empty (disabled) | ADEX account login |
| `ADEX_PWD` | optional | empty (disabled) | ADEX account password |
