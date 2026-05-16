# ERPNext Local Dev Sandbox

Local ERPNext instance for development and integration testing against the CTG spare parts webshop backend.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- At least 4 GB of RAM allocated to Docker

## Start the sandbox

```sh
cd infrastructure/erpnext
docker compose up -d
```

First run takes **2–3 minutes** while `create-site` installs ERPNext and seeds the database.

Once up, open: **http://localhost:8080**

| Field    | Value           |
|----------|-----------------|
| Username | `Administrator` |
| Password | `admin`         |

## Generate an API key for Medusa integration

1. Log in to ERPNext at http://localhost:8080
2. Go to **Settings → My Account → API Access**
3. Click **Generate Keys**
4. Copy the **API Key** and **API Secret**
5. Add them to `apps/backend/.env`:

```env
ERP_BASE_URL=http://localhost:8080
ERP_API_KEY=<your-api-key>
ERP_API_SECRET=<your-api-secret>
```

## Test connectivity from Medusa

```sh
pnpm --filter backend erp:ping
```

This runs `apps/backend/src/modules/erp/scripts/ping.ts` which authenticates against ERPNext and prints the server version.

## Stop / destroy

```sh
# Stop (keeps data)
docker compose down

# Destroy all data and start fresh
docker compose down -v
```

## Production notes

For production, deploy ERPNext on a **Hetzner CX21** (4 GB RAM, 40 GB SSD, ~€6/mo, Frankfurt EU region).
See ADR-002 for the full rationale and integration architecture.
