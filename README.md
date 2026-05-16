# CTG Spare Parts Shop

B2B e-commerce webshop for CTG (Cardiotocography / fetal monitor) spare parts — built for healthcare organisations, biomedical engineers, and equipment technicians.

## Stack

| Layer | Technology |
|---|---|
| Commerce backend | [Medusa.js v2](https://docs.medusajs.com) |
| Storefront | Next.js 14 (App Router) |
| Database | Neon serverless Postgres (EU) |
| Cache / events | Redis (Upstash in production) |
| Hosting | Vercel |
| CI/CD | GitHub Actions |
| Monorepo | pnpm workspaces + Turborepo |

Architecture decisions are documented in [`docs/adr/`](./docs/adr/).

## Project structure

```
ctg-spare-parts-shop/
├── apps/
│   ├── backend/       # Medusa v2 server + admin dashboard  (port 9000)
│   └── storefront/    # Next.js 14 storefront               (port 8000)
├── docs/
│   └── adr/           # Architecture Decision Records
├── .github/
│   └── workflows/     # GitHub Actions CI pipeline
└── requirements.md    # Business & functional requirements
```

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v10+  (`npm i -g pnpm`)
- A [Neon](https://console.neon.tech) Postgres database (EU Frankfurt region recommended)
- Redis — local (`redis-server`) or [Upstash](https://upstash.com) for production

## Local setup

### 1. Clone & install

```bash
git clone https://github.com/Siam806/ctg-spare-parts-shop.git
cd ctg-spare-parts-shop
pnpm install
```

### 2. Configure the backend

```bash
cp apps/backend/.env.template apps/backend/.env
```

Open `apps/backend/.env` and fill in:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
JWT_SECRET=<random-32-byte-hex>
COOKIE_SECRET=<random-32-byte-hex>
```

Generate secrets with: `openssl rand -hex 32`

### 3. Run database migrations

```bash
cd apps/backend
pnpm medusa db:migrate
```

### 4. Create the first admin user

```bash
pnpm medusa user -e admin@example.com -p yourpassword
```

### 5. Start the backend

```bash
# From repo root:
pnpm backend:dev

# Or from apps/backend:
pnpm dev
```

Admin dashboard → [http://localhost:9000/app](http://localhost:9000/app)

### 6. Get a publishable API key

Admin → Settings → Publishable API Keys → Create.  Copy the key.

### 7. Configure the storefront

`apps/storefront/.env.local` is pre-populated with sensible defaults. Set your publishable key:

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
```

### 8. Start the storefront

```bash
# From repo root:
pnpm storefront:dev

# Or from apps/storefront:
pnpm dev
```

Storefront → [http://localhost:8000](http://localhost:8000)

### Run everything at once

```bash
pnpm dev   # starts backend + storefront in parallel via Turborepo
```

## Environment variables reference

### Backend (`apps/backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon (or any Postgres) connection string |
| `JWT_SECRET` | Yes | 32+ byte random secret for JWTs |
| `COOKIE_SECRET` | Yes | 32+ byte random secret for session cookies |
| `REDIS_URL` | Yes | Redis connection URL |
| `STORE_CORS` | Yes | Allowed storefront origins |
| `ADMIN_CORS` | Yes | Allowed admin dashboard origins |
| `AUTH_CORS` | Yes | Allowed auth origins |

### Storefront (`apps/storefront/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Yes | Publishable API key from admin |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Yes | Medusa backend URL |
| `NEXT_PUBLIC_DEFAULT_REGION` | Yes | Default region code (`nl`) |
| `NEXT_PUBLIC_BASE_URL` | Yes | Storefront base URL |
| `NEXT_PUBLIC_STRIPE_KEY` | No | Stripe publishable key (when Stripe is integrated) |

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and PR to `main`:

1. **Install** — `pnpm install --frozen-lockfile`
2. **Lint** — storefront ESLint
3. **Type-check** — `tsc --noEmit` for both apps
4. **Build** — production build of storefront + backend
5. **Test** — backend unit tests

Deployments to Vercel are triggered automatically on merge to `main` via the Vercel GitHub integration.

## Deployment (Vercel)

1. Import the repo in [Vercel](https://vercel.com/new).
2. Set root directory to the repo root (Vercel reads `vercel.json`).
3. Add environment variables in the Vercel dashboard (same as `apps/storefront/.env.local` for the storefront project).
4. For the backend, deploy as a separate Vercel project or use a Node.js server (Railway, Render, etc.) and point `NEXT_PUBLIC_MEDUSA_BACKEND_URL` at it.

## Further reading

- [Medusa v2 documentation](https://docs.medusajs.com)
- [Architecture decisions](./docs/adr/)
- [Requirements](./requirements.md)
