# ADR-001 — Platform & Infrastructure Decisions

**Date:** 2026-05-16  
**Status:** Accepted  
**Deciders:** Project owner

---

## Context

The CTG spare parts webshop requires a foundation decision covering:

- E-commerce framework / platform
- Frontend stack
- Repository structure
- CI/CD tooling
- Hosting & database

These were deferred from the requirements document (§8) and are resolved here before implementation begins.

---

## Decisions

### 1. E-commerce framework: Medusa.js v2

**Chosen:** Medusa.js v2 (latest stable)

**Rationale:**
- Open-source, self-hosted, TypeScript-first — matches the B2B custom-flow requirements (approval gates, company accounts, contract pricing, RMA workflow).
- Modular v2 architecture allows incremental addition of commerce modules (inventory, payment, shipping) without rewriting the core.
- Native support for custom API routes, workflows, and admin extensions — needed for the CTG-specific device lookup and B2B features.
- No per-transaction or per-seat SaaS fees; total cost of ownership is lower than hosted platforms at this scale.

**Rejected alternatives:**
- *Headless Shopify* — monthly cost, B2B features require expensive B2B plan, limited custom workflow extensibility.
- *Custom Next.js + Stripe* — maximum flexibility but requires building all commerce primitives (cart, orders, inventory) from scratch, adding significant delivery risk.
- *WooCommerce* — PHP-based, not suited for headless/API-first B2B flows; weak TypeScript ecosystem.

### 2. Storefront: Next.js 14 (App Router)

**Chosen:** Next.js 14 with App Router, based on Medusa's official Next.js DTC starter.

**Rationale:**
- React Server Components reduce client-side JS, improving performance (supports the ≤ 2 s checkout page load NFR).
- Medusa's official starter provides a battle-tested baseline for product catalog, cart, checkout, and account pages.
- App Router is the current Next.js standard; aligns with long-term framework direction.
- Deploys natively on Vercel with zero additional config.

### 3. Repository structure: pnpm monorepo (Turborepo)

**Chosen:** Single GitHub repository with pnpm workspaces and Turborepo.

Structure:
```
ctg-spare-parts-shop/
├── apps/
│   ├── backend/       # Medusa v2 Node.js server + admin dashboard
│   └── storefront/    # Next.js 14 App Router storefront
├── docs/adr/          # Architecture decision records
└── package.json       # Root workspace
```

**Rationale:**
- Shared TypeScript types between backend and storefront without publishing packages.
- Single CI pipeline, single PR for cross-app changes.
- Turborepo provides task caching and parallelisation for build/test/lint.

### 4. CI/CD: GitHub Actions

**Chosen:** GitHub Actions

**Rationale:**
- Native to GitHub (where the repo lives); no additional service to configure.
- Free tier covers the expected build volumes.
- Rich marketplace of actions for pnpm, Node, Vercel deployment.

### 5. Hosting: Vercel

**Chosen:** Vercel for both storefront (native Next.js) and Medusa backend (Node.js serverless/container).

**Rationale:**
- Zero-config Next.js deployments with preview URLs per PR — accelerates storefront iteration.
- EU region available (Frankfurt) — satisfies GDPR data-residency requirement.
- Native integration with Neon Postgres.

### 6. Database: Neon (serverless Postgres)

**Chosen:** Neon serverless Postgres, EU (Frankfurt) region.

**Rationale:**
- Vercel's preferred Postgres partner with first-class dashboard integration.
- Serverless branching enables per-PR preview database branches — aligns with the GitHub Actions / Vercel preview workflow.
- Scales to zero in non-production environments, reducing cost.
- EU-hosted — satisfies GDPR requirement for customer data stored within the EU (§7 constraints).

---

## Consequences

- All future slice implementations assume this stack. Deviations require a new ADR.
- Medusa v2's modular architecture means ERP, shipping, and payment integrations are implemented as Medusa modules/plugins, not standalone services.
- The `apps/backend` node_modules must be excluded from the `pnpm-workspace.yaml` `.medusa/` build output to avoid workspace conflicts.
- Redis is required by Medusa for event queuing in production (can use Upstash Redis on Vercel).
