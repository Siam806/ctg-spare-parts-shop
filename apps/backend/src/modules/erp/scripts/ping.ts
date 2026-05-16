/**
 * erp:ping — connectivity test for the ERPNext sandbox.
 *
 * Reads ERP_BASE_URL, ERP_API_KEY, ERP_API_SECRET from the environment
 * (or falls back to the local Docker Compose defaults).
 *
 * Usage:
 *   pnpm --filter backend erp:ping
 *
 * Expected output on success:
 *   ✓ ERPNext reachable at http://localhost:8080 — Frappe version: 16.x.x
 *
 * Exit code 0 on success, 1 on failure.
 */

import { ErpClient } from "../client.js"

const ERP_BASE_URL = process.env.ERP_BASE_URL ?? "http://localhost:8080"
const ERP_API_KEY = process.env.ERP_API_KEY ?? ""
const ERP_API_SECRET = process.env.ERP_API_SECRET ?? ""

if (!ERP_API_KEY || !ERP_API_SECRET) {
  console.error(
    "✗ ERP_API_KEY and ERP_API_SECRET must be set.\n" +
      "  See infrastructure/erpnext/README.md for instructions."
  )
  process.exit(1)
}

const client = new ErpClient({
  baseUrl: ERP_BASE_URL,
  apiKey: ERP_API_KEY,
  apiSecret: ERP_API_SECRET,
})

void (async () => {
  try {
    const version = await client.ping()
    console.log(
      `✓ ERPNext reachable at ${ERP_BASE_URL} — Frappe version: ${version}`
    )
    process.exit(0)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`✗ ERPNext connectivity test failed:\n  ${message}`)
    process.exit(1)
  }
})()
