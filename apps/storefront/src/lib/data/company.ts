"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type CompanyStatus = {
  company: {
    id: string
    name: string
    approval_status: "pending" | "approved" | "rejected"
    rejection_reason: string | null
  }
  company_user: {
    id: string
    role: "admin" | "buyer" | "view_only"
    is_primary_contact: boolean
  }
} | null

export async function getMyCompany(): Promise<CompanyStatus> {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders) return null

  try {
    const result = await sdk.client.fetch<CompanyStatus>(
      "/store/companies/me",
      {
        method: "GET",
        headers: authHeaders,
      }
    )
    return result
  } catch {
    return null
  }
}
