# Requirements: CTG Spare Parts Webshop

## 1. Overview

A B2B-oriented e-commerce webshop that allows healthcare organisations, biomedical engineers, and equipment technicians to browse, search, and purchase spare parts for **CTG (Cardiotocography / fetal monitor) equipment**. Orders are not necessarily bulk; individual parts for maintenance and repair are the primary use case.

---

## 2. Business Goals

- Provide a self-service channel for customers to find and order spare parts without calling a sales rep.
- Reduce order-processing overhead by automating quoting, invoicing, and fulfillment initiation.
- Maintain accurate stock visibility; an ERP / inventory system will need to be selected and set up as part of this project.
- Support professional (B2B) buyers with features such as account management, order history, and company-level invoicing.

---

## 3. Scope

### In scope
- Product catalog with structured spare parts data.
- Customer account management (B2B registration, company profiles).
- Shopping cart and checkout flow.
- Payment processing.
- Order management and status tracking.
- ERP / inventory system selection, setup, and integration (stock sync, order push).
- Shipping / logistics integration (carrier selection, label generation, tracking).
- Parts catalog / device lookup (search by device model, serial number, or part number).
- Admin back-office for product and order management.

### Out of scope (initial release)
- Repair/service booking or field-service management.
- End-consumer (B2C) storefront.
- Marketplace / multi-vendor functionality.

---

## 4. Functional Requirements

### 4.1 Product Catalog

| ID | Requirement |
|----|-------------|
| PC-01 | Products must be categorised by CTG device brand, device model, and part type (e.g. transducer, belt, cable, battery, probe, stylus). |
| PC-02 | Each product must have: part number (OEM and internal), name, description, compatible device models, unit of measure, images, price (ex. VAT), and stock status. |
| PC-03 | Products can be marked as *discontinued*, *special order*, or *hazardous* (for shipping compliance). |
| PC-04 | The catalog must support structured search and filtering by brand, model, part type, part number, and keyword. |
| PC-05 | A **device / part lookup** flow must allow users to identify parts by device model name or serial-number prefix, presenting a filtered parts list. |
| PC-06 | Related / compatible parts must be linkable (e.g. "customers also need this consumable with that sensor"). |

### 4.2 Customer Accounts

| ID | Requirement |
|----|-------------|
| CA-01 | Registration requires company name, VAT/KvK number, billing address, and at least one contact person. |
| CA-02 | A company account can have multiple users with roles: **Admin** (full access), **Buyer** (order + view), **View-only** (view orders only). |
| CA-03 | Accounts are subject to manual or automated approval before ordering is enabled (to enforce B2B-only policy). |
| CA-04 | Customers can view full order history, download invoices (PDF), and re-order from past orders. |
| CA-05 | Optional: agreed/contract pricing per account or account group (price lists). |

### 4.3 Shopping Cart & Checkout

| ID | Requirement |
|----|-------------|
| SC-01 | Persistent shopping cart linked to the user account (survives logout/re-login). |
| SC-02 | Cart must show unit price, quantity, line total, and stock availability per line. |
| SC-03 | Checkout collects: shipping address (from saved addresses or ad hoc), shipping method selection, and purchase order (PO) reference field. |
| SC-04 | Order summary must display subtotal, shipping cost, VAT breakdown, and grand total before confirmation. |
| SC-05 | Support split-shipment notification when items have different availability dates. |

### 4.4 Payments

| ID | Requirement |
|----|-------------|
| PM-01 | Integrate at least one payment gateway (e.g. Stripe, Mollie, or Adyen) supporting card, iDEAL, and SEPA bank transfer. |
| PM-02 | B2B customers with an approved credit limit must be able to checkout on **invoice (net payment terms)** without immediate payment. |
| PM-03 | VAT must be handled correctly for intra-EU B2B (reverse charge) and domestic transactions. |
| PM-04 | Payment status must be propagated to the order record and the inventory/ERP system. |

### 4.5 Order Management

| ID | Requirement |
|----|-------------|
| OM-01 | Orders transition through states: `pending_payment` → `confirmed` → `picking` → `shipped` → `delivered` / `cancelled` / `returned`. |
| OM-02 | Order confirmations and shipping notifications are sent by email to the customer (with tracking link). |
| OM-03 | Customers can request a return/RMA from the order detail page; RMA workflow routes to the admin. |
| OM-04 | Admin users can manually create orders on behalf of customers (phone/email orders). |

### 4.6 ERP / Inventory System

> **Note:** No ERP or inventory management system is currently in place. Selecting and implementing one is part of this project scope.


| ID | Requirement |
|----|-------------|
| EI-01 | An ERP or inventory management system must be selected that supports the operational needs of the webshop (stock tracking, order management, invoicing). |
| EI-02 | Real-time (or near-real-time) stock level sync from the chosen system to the webshop catalog. |
| EI-03 | Confirmed orders are pushed to the system automatically to initiate pick/pack/ship. |
| EI-04 | Price lists and product data can be imported/updated via scheduled sync or webhook. |
| EI-05 | The integration must handle system downtime gracefully (queue, retry, alert). |

### 4.7 Shipping & Logistics Integration

| ID | Requirement |
|----|-------------|
| SL-01 | Carrier rates are fetched at checkout based on weight, dimensions, destination, and service level. |
| SL-02 | Shipping labels are generated automatically when an order enters `picking` state. |
| SL-03 | Tracking numbers are stored on the order and shared with the customer via email and the account portal. |
| SL-04 | Support for at least two carriers; carrier selection must be configurable per destination region. |
| SL-05 | Hazardous-goods flag on products must trigger appropriate carrier restrictions and documentation. |

### 4.8 Parts Catalog / Device Lookup

| ID | Requirement |
|----|-------------|
| DL-01 | Maintain a structured device database: brand → product line → device model → compatible parts. |
| DL-02 | Users can look up parts by entering a device model name or serial-number prefix; the system returns all compatible parts. |
| DL-03 | Part numbers (OEM reference + internal SKU) are searchable and displayed prominently. |
| DL-04 | The device/parts database can be maintained by admin users via a back-office interface or bulk CSV import. |

### 4.9 Admin Back-Office

| ID | Requirement |
|----|-------------|
| AB-01 | Product CRUD: create, edit, archive products; manage images, compatibility matrix, pricing. |
| AB-02 | Order management dashboard: view, filter, update order status, print packing slips. |
| AB-03 | Customer management: approve/reject registrations, manage account roles, set price lists. |
| AB-04 | Reporting: sales by period, top-selling parts, out-of-stock events, revenue by customer. |
| AB-05 | CMS-light: manage static content pages (About, Contact, Returns Policy, Shipping Information). |

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Product search results must return within 500 ms (p95) under normal load. Checkout page must load within 2 s. |
| **Availability** | 99.5 % uptime target; scheduled maintenance windows communicated in advance. |
| **Security** | All data in transit encrypted (TLS 1.2+). PCI-DSS compliance for payment flow (SAQ-A or SAQ-A-EP, depending on gateway). GDPR-compliant data handling. |
| **Accessibility** | WCAG 2.1 AA for the customer-facing storefront. |
| **Scalability** | Architecture must support catalogue growth to 10 000+ SKUs without redesign. |
| **Internationalisation** | Support for at least English and Dutch (UI strings, email templates). Currency: EUR. |
| **Auditability** | All order state changes, payment events, and admin actions must be logged with timestamp and actor. |

---

## 6. User Roles Summary

| Role | Description |
|------|-------------|
| **Guest** | Can browse catalog and use device lookup; cannot add to cart or see prices (optional gating). |
| **Customer – Buyer** | Registered B2B user; can browse, order, and view own order history. |
| **Customer – Admin** | Manages company users, addresses, and billing settings. |
| **Shop Admin** | Full access to back-office: products, orders, customers, reports. |
| **Warehouse Staff** | Access to order picking/shipping workflow only. |

---

## 7. Constraints & Assumptions

- Primary market: Netherlands / EU; all prices in EUR with Dutch VAT rules as baseline.
- The shop does not manufacture parts; all inventory is sourced and warehoused before listing.
- No ERP or inventory management system is currently in place; selection and setup is in scope for this project. Integration approach (REST API, EDI, file-based) to be confirmed once a system is chosen.
- Payment on invoice (B2B credit) requires a credit-check or trust-based approval process defined by the business.
- GDPR: customer data is stored within the EU.

---

## 8. Out-of-Scope Decisions (deferred to tech spec)

- Choice of e-commerce framework / platform (custom-built vs. headless Shopify vs. Medusa.js vs. other).
- CI/CD pipeline and hosting infrastructure.
- Specific ERP and carrier API contracts.
- Detailed data model and API design.
- UI/UX design and brand guidelines.

---

*Document status: Draft v0.1 — to be reviewed and signed off before technical specification begins.*
