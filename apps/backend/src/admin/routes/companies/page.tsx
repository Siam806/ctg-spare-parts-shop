import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { Container, Heading, Table, Badge, Button } from "@medusajs/ui"

type Company = {
  id: string
  name: string
  vat_number: string | null
  kvk_number: string | null
  billing_city: string
  billing_country_code: string
  approval_status: "pending" | "approved" | "rejected"
  created_at: string
}

const statusColors: Record<string, "green" | "orange" | "red"> = {
  approved: "green",
  pending: "orange",
  rejected: "red",
}

const CompaniesPage = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const res = await fetch("/admin/companies", {
        credentials: "include",
      })
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <Container>
        <Heading level="h1">Company Registrations</Heading>
        <p>Loading...</p>
      </Container>
    )
  }

  const companies: Company[] = data?.companies || []

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <Heading level="h1">Company Registrations</Heading>
        <Button variant="secondary" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Company Name</Table.HeaderCell>
            <Table.HeaderCell>VAT / KvK</Table.HeaderCell>
            <Table.HeaderCell>City</Table.HeaderCell>
            <Table.HeaderCell>Country</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Registered</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {companies.map((company) => (
            <Table.Row key={company.id}>
              <Table.Cell>{company.name}</Table.Cell>
              <Table.Cell>
                {company.vat_number || company.kvk_number || "-"}
              </Table.Cell>
              <Table.Cell>{company.billing_city}</Table.Cell>
              <Table.Cell>
                {company.billing_country_code.toUpperCase()}
              </Table.Cell>
              <Table.Cell>
                <Badge color={statusColors[company.approval_status]}>
                  {company.approval_status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {new Date(company.created_at).toLocaleDateString()}
              </Table.Cell>
              <Table.Cell>
                <a href={`/app/companies/${company.id}`}>
                  <Button variant="secondary" size="small">
                    View
                  </Button>
                </a>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {companies.length === 0 && (
        <p className="text-ui-fg-subtle mt-4">No company registrations yet.</p>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Companies",
})

export default CompaniesPage
