# ADR-002 — ERP / Inventory System: ERPNext

**Date:** 2026-05-16
**Status:** Accepted
**Deciders:** Project owner

We chose **ERPNext (Frappe)** as the ERP and inventory management system for the CTG spare parts webshop.

---

## Context

No ERP or inventory system was in place (requirement EI-01). We needed a system that covers stock tracking, order management, and invoicing for a small-scale B2B EU operation, and that integrates cleanly with the Medusa.js v2 backend via REST API.

Constraints:
- Self-hosted preferred (EU data residency, no licensing fees)
- Small initial scale (<500 SKUs, <50 orders/month)
- Must support EU VAT and intra-EU B2B reverse charge natively
- Integration via REST API or webhooks from Medusa workflows

---

## Decision

**ERPNext self-hosted**, deployed via Docker Compose (local dev) and a Hetzner VPS in a later production phase.

**Integration approach: REST API + webhooks**

- Medusa workflows push confirmed orders to ERPNext via `POST /api/resource/Sales Order`
- ERPNext fires webhooks on stock changes; Medusa subscribers update product inventory levels
- All API calls are authenticated via ERPNext API key + secret (token-based)
- Medusa's Redis-backed job queue handles retries when ERPNext is temporarily unreachable (EI-05)

**Data ownership:** ERPNext is the source of truth for stock levels and pricing. Medusa reads from ERPNext; it does not write stock or pricing back.

---

## Considered Options

| Candidate | Score | Rejection reason |
|-----------|-------|-----------------|
| ERPNext | 9/10 | **Selected** |
| Zoho Inventory + Books | 7/10 | SaaS, monthly cost, reverse charge VAT needs custom config |
| Odoo Community | 6/10 | Primary API is XML-RPC (not REST-native); webhook support requires custom module |
| Katana MRP | 5/10 | No reverse charge VAT; invoicing is rudimentary; €199/month |
| Dolibarr | 4/10 | No webhooks; no reverse charge VAT; weak inventory management |

---

## Consequences

- ERPNext runs as a separate service (Docker Compose locally, Hetzner VPS in production); it is not part of the pnpm monorepo.
- The Medusa backend gains an `erp` Medusa module (in `apps/backend/src/modules/erp/`) that wraps all ERPNext API calls and exposes a typed service interface.
- All ERPNext integration code (order push, stock sync, invoice fetch) lives in that module; no ERP-specific logic leaks into workflows or API routes directly.
- Reverse charge VAT is configured via ERPNext tax templates; no custom development required.
- Local dev sandbox: `docker compose up` from `infrastructure/erpnext/` starts a fully functional ERPNext instance with seed data.
- Production hosting: Hetzner CX21 (4 GB RAM, 40 GB disk, ~€6/mo) is the minimum recommended spec.
