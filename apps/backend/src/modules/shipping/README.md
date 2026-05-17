# Shipping Module

Multi-carrier shipping integration for CTG Spare Parts Webshop.

## Overview

This module provides end-to-end shipping functionality integrated with Medusa.js v2:

- **Rate fetching** at checkout from multiple carriers
- **Automatic label generation** when orders enter picking state
- **Tracking number management** and customer notifications
- **Hazmat compliance** for restricted goods
- **Regional carrier selection** based on destination

## Supported Carriers

### SendCloud (Primary)
Multi-carrier aggregator providing access to:
- DHL (domestic Germany and EU)
- DPD
- UPS
- GLS
- And many others

**Best for:** DE-based shipping EU-wide, DHL domestic coverage

### PostNL (Secondary)
Direct integration with Dutch national carrier.

**Best for:** Netherlands/Belgium deliveries, competitive rates for NL/BE

**Services:**
- Standaard (Standard delivery 1-2 days)
- Avondbezorging (Evening delivery)
- Same Day (Express)
- Brievenbuspakje (Mailbox package for small items)

## Architecture

```
┌─────────────────────────────────────────┐
│         ShippingModuleService           │
│  ┌─────────────┐    ┌─────────────┐    │
│  │SendCloudClient│  │PostNLClient │    │
│  └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
┌───▼────┐         ┌────▼────┐
│SendCloud│         │  PostNL │
│  API   │         │   API   │
└────────┘         └─────────┘
```

## API Endpoints

### Storefront
- `GET /shipping/rates` - Get available shipping rates
  - Query: `to_country`, `to_postal`, `weight`, `hazmat`
  - Returns: Array of rates from all enabled carriers

- `GET /shipping/tracking/:trackingNumber` - Get tracking information
  - Query: `carrier` (optional hint)
  - Returns: Full tracking history

### Admin
- `GET /admin/shipments` - List all shipments
  - Query: `order_id`, `carrier`, `status`, `tracking_number`
  - Returns: Paginated shipment records

## Workflow

### createShipmentWorkflow

Triggered automatically when an order enters the "picking" fulfillment status.

Steps:
1. Calculate total weight from order items + packaging
2. Fetch sender address from environment config
3. Determine optimal carrier based on destination
4. Create shipping label via carrier API
5. Store shipment record with tracking info
6. Update order metadata with tracking details

## Data Model

### ShipmentRecord

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| order_id | string | Linked order |
| carrier | enum | sendcloud / postnl |
| service | string | Service level |
| tracking_number | string | Carrier tracking number |
| tracking_url | string | Customer tracking URL |
| label_url | string | PDF label URL |
| cost | decimal | Shipping cost (cents) |
| weight | decimal | Package weight (grams) |
| from_address | json | Sender address |
| to_address | json | Recipient address |
| hazmat | boolean | Hazardous materials flag |
| status | enum | created → picked_up → in_transit → delivered |
| created_at | timestamp | Label creation time |
| shipped_at | timestamp | Pickup time |
| delivered_at | timestamp | Delivery time |

## Configuration

### Environment Variables

```env
# SendCloud
SENDCLOUD_API_KEY=your_key
SENDCLOUD_API_SECRET=your_secret
SENDCLOUD_SANDBOX=true

# PostNL (optional, for NL/BE focus)
POSTNL_API_KEY=your_key
POSTNL_CUSTOMER_NUMBER=your_number
POSTNL_CUSTOMER_CODE=your_code
POSTNL_SANDBOX=true

# Sender Address (DE-based)
SHIPPING_SENDER_NAME=CTG Spare Parts
SHIPPING_SENDER_COMPANY=CTG Parts GmbH
SHIPPING_SENDER_STREET=Industriestraße
SHIPPING_SENDER_HOUSE_NUMBER=1
SHIPPING_SENDER_CITY=Berlin
SHIPPING_SENDER_POSTAL=10115
SHIPPING_SENDER_COUNTRY=DE
SHIPPING_SENDER_PHONE=+49 30 1234567
SHIPPING_SENDER_EMAIL=shipping@ctg-parts.de
```

## Hazmat Handling (SL-05)

Products flagged with `metadata.hazmat: true` trigger:
- Carrier hazmat restrictions check
- Appropriate documentation requirements
- Service level restrictions (some services don't accept hazmat)

## Regional Carrier Selection (SL-04)

Logic for choosing carrier based on destination:

| Destination | Primary | Secondary |
|-------------|---------|-----------|
| Germany (DE) | SendCloud (DHL) | - |
| Netherlands/BE | SendCloud | PostNL |
| Austria/CH | SendCloud (DHL/DPD) | - |
| Other EU | SendCloud | - |

## Error Handling

- **Carrier API downtime**: Rates from unavailable carriers are skipped, others continue
- **Label creation failure**: Logged, admin alerted, order stays in picking state for retry
- **Invalid addresses**: Validation suggestions returned before label creation

## Testing

```bash
# Test rate fetching
curl "http://localhost:9000/shipping/rates?to_country=NL&to_postal=1012AB&weight=1000"

# Test tracking
curl "http://localhost:9000/shipping/tracking/3SKABA1234567890"
```

## Requirements Mapping

| Req | Implementation |
|-----|----------------|
| SL-01 | `GET /shipping/rates` endpoint, `getRates()` method |
| SL-02 | `orderPickingHandler` subscriber, `createShipmentWorkflow` |
| SL-03 | `ShipmentRecord` model, tracking URLs stored on order |
| SL-04 | `getRecommendedCarriers()` method, regional logic |
| SL-05 | Hazmat detection in subscriber, service filtering |
