import { getMyCompany } from "@lib/data/company"

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: "Pending Approval", color: "text-orange-600 bg-orange-50" },
  approved: { text: "Approved", color: "text-green-700 bg-green-50" },
  rejected: { text: "Rejected", color: "text-red-600 bg-red-50" },
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  buyer: "Buyer",
  view_only: "View Only",
}

export default async function CompanyStatus() {
  const companyData = await getMyCompany()

  if (!companyData) {
    return (
      <div className="flex flex-col gap-y-2 p-4 border border-dashed border-gray-300 rounded">
        <h3 className="text-large-semi">Company</h3>
        <p className="text-small-regular text-ui-fg-subtle">
          No company registered. Complete B2B registration to start ordering.
        </p>
      </div>
    )
  }

  const { company, company_user } = companyData
  const status = statusLabels[company.approval_status] || statusLabels.pending

  return (
    <div className="flex flex-col gap-y-2">
      <h3 className="text-large-semi">Company</h3>
      <div className="flex items-center gap-x-3">
        <span className="text-base-regular font-medium">{company.name}</span>
        <span
          className={`text-small-regular px-2 py-0.5 rounded ${status.color}`}
        >
          {status.text}
        </span>
      </div>
      <div className="flex items-center gap-x-2 text-small-regular text-ui-fg-subtle">
        <span>Role: {roleLabels[company_user.role] || company_user.role}</span>
        {company_user.is_primary_contact && (
          <span className="text-orange-600">(Primary Contact)</span>
        )}
      </div>
      {company.approval_status === "rejected" && company.rejection_reason && (
        <p className="text-small-regular text-red-600 mt-1">
          Reason: {company.rejection_reason}
        </p>
      )}
    </div>
  )
}
