# Teraruim Tunisie

E-commerce dropshipping site for Tunisia / Algeria / Morocco. Browse, like, friend, gift. Cash on delivery via [ADEX](https://adex.tn).

## Features

- **Shop** — browse, search, category filter, product detail
- **Guest checkout** — buy without account (just need address)
- **Accounts** — email + password (NextAuth v5 / JWT)
- **Likes ♥** — save items to wishlist (auth required)
- **Friends** — search, request, accept (auth required)
- **Friend wishlists** — see what friends liked (only if mutual friends)
- **Gifting** — buy any item as gift for a friend → ships to their address
- **Cart** — localStorage, multi-item COD checkout
- **Order tracking** — live shipment status from Shipper API
- **Admin panel** — products CRUD, orders, gifts, users, role management
- **Shipper integration** — full API wrapper (divisions, products, orders, tracking, webhooks)
- **Cash on delivery only** — no payment processor; courier collects cash

## Stack

- **Next.js 16** App Router (Turbopack), TypeScript, Tailwind CSS v4
- **Auth.js v5** (NextAuth credentials, JWT)
- **Prisma 6** + SQLite (dev) / Postgres (prod)
- **Zod** validation
- **bcryptjs** password hashing (cost 12)

## Quick start

```bash
git clone <repo> && cd e-commerce
npm install
cp .env.example .env       # fill values (defaults work for local)
npx prisma migrate dev     # apply schema
npm run db:seed            # seed 16 products + 3 demo users
npm run dev                # http://localhost:3000
```

**Demo logins** (password: `password123`):
- `alice@demo.dev` (admin via `ADMIN_EMAILS`)
- `bob@demo.dev`
- `carol@demo.dev`

## Project structure

```
src/
├── app/
│   ├── page.tsx                      # Home / shop
│   ├── products/[id]/                # Product detail
│   ├── cart/                         # Cart + guest checkout form
│   ├── orders/[id]/                  # Order confirmation + tracking
│   ├── friends/                      # Friend search + requests
│   ├── u/[id]/                       # User profile + wishlist
│   ├── gift/new/                     # Gift form
│   ├── gifts/                        # Sent + received gifts
│   ├── me/                           # Redirects to /u/[me]
│   ├── me/settings/                  # Address form
│   ├── signin/, signup/              # Auth pages
│   ├── admin/                        # Admin panel (gated)
│   │   ├── page.tsx                  # Dashboard
│   │   ├── products/                 # Products CRUD + Shipper sync
│   │   ├── orders/                   # All orders + refresh status
│   │   ├── gifts/                    # All gifts
│   │   └── users/                    # User list + role toggle
│   └── api/
│       ├── auth/[...nextauth]/       # NextAuth handlers
│       ├── signup/                   # POST register (rate-limited 5/min)
│       ├── likes/                    # POST toggle (rate-limited 60/min)
│       ├── friends/                  # POST request/accept/remove (30/min)
│       ├── gifts/                    # POST create gift (10/min)
│       ├── checkout/                 # POST place order (10/min, guest+auth)
│       ├── divisions/                # GET governorates/cities (TN static list)
│       ├── me/                       # PATCH profile
│       ├── me/role/                  # GET own role (nav uses)
│       ├── tracking/[type]/[id]/     # GET shipment status (ADEX pull)
│       └── admin/                    # All admin APIs (role: admin only)
│           ├── products/             # CRUD products
│           ├── orders/[id]/sync/     # Refresh tracking
│           └── users/[id]/role/      # Promote/demote
├── components/                       # React components
├── lib/
│   ├── db.ts                         # Prisma client singleton
│   ├── adex.ts                       # ADEX courier API wrapper
│   ├── friends.ts                    # Friendship helpers
│   ├── admin.ts                      # requireAdmin / isAdminApi guards
│   └── rateLimit.ts                  # In-memory token bucket
├── auth.ts                           # NextAuth config
└── types/next-auth.d.ts              # Session type augmentation

prisma/
├── schema.prisma                     # Active schema (SQLite for dev)
├── schema.postgres.prisma            # Production schema (copy over)
├── migrations/                       # Migration history
├── seed.ts                           # 16 products + 3 demo users
├── promote-admin.ts                  # CLI: npx tsx prisma/promote-admin.ts <email>
└── dev.db                            # Local SQLite (gitignored)
```

## Environment variables

| Var | Required | Local default | Production |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `file:./dev.db` | Postgres pooled URL |
| `DIRECT_URL` | prod | — | Postgres direct URL (migrations) |
| `AUTH_SECRET` | ✅ | dev placeholder | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | ✅ | `true` | `true` |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | `https://your-domain` |
| `ADEX_USER` | optional | empty (disabled) | ADEX account login |
| `ADEX_PWD` | optional | empty (disabled) | ADEX account password |
| `ADMIN_EMAILS` | ✅ | `touilraed@gmail.com,alice@demo.dev` | comma-separated |

## NPM scripts

```bash
npm run dev           # next dev (Turbopack)
npm run build         # prisma generate + migrate deploy + next build
npm run start         # production server
npm run db:migrate    # prisma migrate dev (after schema changes)
npm run db:seed       # tsx prisma/seed.ts
npm run db:studio     # prisma studio (visual DB browser)
npm install           # postinstall runs prisma generate
```

## Admin panel

Login as alice or any user whose email is in `ADMIN_EMAILS`. "Admin" link appears in nav.

```bash
# Promote any user from CLI
npx tsx prisma/promote-admin.ts user@example.com
```

| Page | What you can do |
|---|---|
| `/admin` | Counts: users, products, orders, gifts, revenue, synced products |
| `/admin/products` | Create / edit / delete / sync each product to Shipper |
| `/admin/products/new` | Form: title, desc, price, image, category, stock, weight, SKU |
| `/admin/orders` | Every order, customer info, tracking, "Refresh status" |
| `/admin/gifts` | Every gift sent on the platform |
| `/admin/users` | Toggle user/admin role per user |

## ADEX integration

Everything in `src/lib/adex.ts`. ADEX (adex.tn) — base `https://adex.tn/api_web/commande`, HTTP Basic auth (account login:password). Pull-only, no webhook.

| Function | ADEX endpoint | Purpose |
|---|---|---|
| `createColis` | `POST /add_colis.php` | Create shipment (COD) → barcode + label URL |
| `getEtat` | `POST /get_etat_cmd.php` | Current shipment state |
| `getTracking` | `POST /tracking_cmd.php` | Full status history |
| `adexCityCode` | (local map) | Governorate name → ADEX city code 1-24 |

Checkout does **not** create the colis — orders land as `pending`. When an admin flips an order to `ready_to_ship` (`PATCH /api/admin/orders/:id`), `dispatchOrderToAdex` (`src/lib/adexOrder.ts`) calls `createColis` and stores `Order.adexBarcode` (num_suivi_cmd) + `Order.adexLabelUrl` (url_bl) with `trackingStatus = "created"`. Idempotent — re-saving the status never duplicates a colis. The governorate is mapped from this app’s id order (`tn-divisions.ts`) to ADEX’s alphabetical 1-24 code.

**Tracking:** pull-only via `GET /api/tracking/order/:id` → `getEtat`. ADEX has no webhook callback.

**Disabled mode:** with empty `ADEX_USER` / `ADEX_PWD`, checkout still works — orders save to DB, tracking shows "not tracked".

## Security

- Bcrypt cost 12 (auth)
- Password min 8 chars
- Zod validation on every API route
- Rate limiting: signup 5/min, checkout 10/min, gifts 10/min, friends 30/min, likes 60/min, all per IP/user
- Friend search: name substring + email **exact match** (no email enumeration)
- Avatar URL uses random UUID (no email PII leaked)
- IDOR protection: all sensitive routes check ownership
- CSRF: same-site cookies (NextAuth)
- XSS: React escapes; Image hosts whitelisted in `next.config.ts`
- SQL injection: Prisma parameterizes everything
- Admin gates: `requireAdmin()` (pages) + `isAdminApi()` (APIs), role check on every call
- Webhook: HMAC-SHA256 timing-safe verification

In-memory rate limiter resets per Vercel instance — swap to Upstash Redis for multi-instance scale.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full Vercel + Postgres guide. Summary:

```bash
# 1. Make Postgres DB (Neon free tier easiest)
# 2. Switch schema
cp prisma/schema.postgres.prisma prisma/schema.prisma
rm -rf prisma/migrations prisma/dev.db
DATABASE_URL=<direct> npx prisma migrate dev --name init

# 3. Push to GitHub, then:
npm i -g vercel
vercel
vercel env add DATABASE_URL DIRECT_URL AUTH_SECRET NEXTAUTH_URL \
  AUTH_TRUST_HOST ADEX_USER ADEX_PWD ADMIN_EMAILS production
vercel --prod

# 4. Seed remotely
DATABASE_URL=<direct> npx tsx prisma/seed.ts
```

Local Postgres alternative via Docker:
```bash
docker compose up -d
DATABASE_URL="postgresql://teraruim:teraruim@localhost:5432/teraruim" npx prisma migrate dev
```

## Database models

Defined in `prisma/schema.prisma`:

- **User** — id, email, name, password, image, phone, address, divisionL1/L2, country, role
- **Product** — id, title, description, price, image, category, stock, weight, sku, shipperProductId
- **Like** — userId + productId (unique pair)
- **Friendship** — userAId + userBId (sorted), status (pending|accepted), requestedBy
- **Gift** — fromUserId, toUserId, productId, message, status, shipperOrderId, trackingStatus
- **Order** — userId? (null for guest), guestName, guestEmail, total, status, ship*, adexBarcode, adexLabelUrl, trackingStatus
- **OrderItem** — orderId, productId, qty, price

## Roadmap

- [ ] Email verification at signup
- [ ] Brute-force lock on signin (Upstash Redis)
- [ ] Multi-instance rate limiter (Upstash)
- [ ] Product image upload (Vercel Blob)
- [ ] Per-friend gift fund (sender prepays for multiple gifts)
- [ ] Push notifications when gift received
- [ ] OAuth providers (Google, Facebook)
- [ ] Shipper rate-quote endpoint integration if/when published

## License

Private project. All rights reserved.
