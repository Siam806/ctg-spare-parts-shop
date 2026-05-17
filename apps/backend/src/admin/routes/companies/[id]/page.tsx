import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { Container, Heading, Badge, Button, Text, Textarea } from "@medusajs/ui"
import { useState } from "react"

type Company = {
  id: string
  name: string
  vat_number: string | null
  kvk_number: string | null
  billing_address_line_1: string
  billing_address_line_2: string | null
  billing_city: string
  billing_postal_code: string
  billing_province: string | null
  billing_country_code: string
  phone: string | null
  website: string | null
  approval_status: "pending" | "approved" | "rejected"
  rejection_reason: string | null
  approved_at: string | null
  rejected_at: string | null
  created_at: string
}

type CompanyUser = {
  id: string
  customer_id: string
  role: string
  is_primary_contact: boolean
}

const statusColors: Record<string, "green" | "orange" | "red"> = {
  approved: "green",
  pending: "orange",
  rejected: "red",
}

const CompanyDetailPage = () => {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [rejectionReason, setRejectionReason] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-company", id],
    queryFn: async () => {
      const res = await fetch(`/admin/companies/${id}`, {
        credentials: "include",
      })
      return res.json()
    },
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/admin/companies/${id}/approve`, {
        method: "POST",
        credentials: "include",
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-company", id] })
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/admin/companies/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-company", id] })
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] })
      setRejectionReason("")
    },
  })

  if (isLoading) {
    return (
      <Container>
        <Heading level="h1">Company Details</Heading>
        <p>Loading...</p>
      </Container>
    )
  }

  const company: Company = data?.company
  const companyUsers: CompanyUser[] = data?.company_users || []

  if (!company) {
    return (
      <Container>
        <Heading level="h1">Company not found</Heading>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">{company.name}</Heading>
          <Badge color={statusColors[company.approval_status]} className="mt-2">
            {company.approval_status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <Heading level="h2" className="mb-2">Company Information</Heading>
          <div className="space-y-1">
            <Text><strong>VAT Number:</strong> {company.vat_number || "-"}</Text>
            <Text><strong>KvK Number:</strong> {company.kvk_number || "-"}</Text>
            <Text><strong>Phone:</strong> {company.phone || "-"}</Text>
            <Text><strong>Website:</strong> {company.website || "-"}</Text>
          </div>
        </div>

        <div>
          <Heading level="h2" className="mb-2">Billing Address</Heading>
          <div className="space-y-1">
            <Text>{company.billing_address_line_1}</Text>
            {company.billing_address_line_2 && (
              <Text>{company.billing_address_line_2}</Text>
            )}
            <Text>
              {company.billing_postal_code} {company.billing_city}
            </Text>
            {company.billing_province && (
              <Text>{company.billing_province}</Text>
            )}
            <Text>{company.billing_country_code.toUpperCase()}</Text>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Heading level="h2" className="mb-2">Users ({companyUsers.length})</Heading>
        <div className="space-y-2">
          {companyUsers.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              <Text>{user.customer_id}</Text>
              <Badge color="green">{user.role}</Badge>
              {user.is_primary_contact && (
                <Badge color="orange">Primary Contact</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {company.rejection_reason && (
        <div className="mb-6 p-4 bg-ui-bg-subtle rounded">
          <Text><strong>Rejection reason:</strong> {company.rejection_reason}</Text>
        </div>
      )}

      {company.approval_status === "pending" && (
        <div className="border-t pt-6 space-y-4">
          <Heading level="h2">Actions</Heading>

          <div className="flex gap-4">
            <Button
              variant="primary"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve Company"}
            </Button>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <Button
              variant="danger"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Company"}
            </Button>
          </div>
        </div>
      )}

      {company.approval_status === "rejected" && (
        <div className="border-t pt-6">
          <Button
            variant="primary"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? "Approving..." : "Approve Company (Override)"}
          </Button>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Company Details",
})

export default CompanyDetailPage
