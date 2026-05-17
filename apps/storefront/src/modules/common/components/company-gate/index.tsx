import { getMyCompany } from "@lib/data/company"
import { retrieveCustomer } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Props = {
  children: React.ReactNode
  /** Minimum roles that can access this content. Defaults to ["admin", "buyer"] */
  allowedRoles?: ("admin" | "buyer" | "view_only")[]
}

export default async function CompanyGate({
  children,
  allowedRoles = ["admin", "buyer"],
}: Props) {
  const customer = await retrieveCustomer()

  // Not logged in — let child pages handle their own auth redirect
  if (!customer) {
    return <>{children}</>
  }

  const companyData = await getMyCompany()

  // Customer hasn't registered a company
  if (!companyData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto text-center">
        <h2 className="text-xl-semi mb-4">Company Registration Required</h2>
        <p className="text-base-regular text-ui-fg-subtle mb-6">
          You need to register your company before you can access this page.
          Please complete the B2B registration process.
        </p>
        <LocalizedClientLink
          href="/account"
          className="underline text-ui-fg-interactive"
        >
          Go to Account
        </LocalizedClientLink>
      </div>
    )
  }

  // Company pending approval
  if (companyData.company.approval_status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto text-center">
        <h2 className="text-xl-semi mb-4">Account Pending Approval</h2>
        <p className="text-base-regular text-ui-fg-subtle mb-4">
          Your company <strong>{companyData.company.name}</strong> is awaiting
          approval. You will be notified by email once your account has been
          reviewed.
        </p>
        <p className="text-small-regular text-ui-fg-muted">
          In the meantime, you can browse our catalog.
        </p>
      </div>
    )
  }

  // Company rejected
  if (companyData.company.approval_status === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto text-center">
        <h2 className="text-xl-semi mb-4">Registration Rejected</h2>
        <p className="text-base-regular text-ui-fg-subtle mb-4">
          Your company registration for{" "}
          <strong>{companyData.company.name}</strong> was not approved.
        </p>
        {companyData.company.rejection_reason && (
          <p className="text-small-regular text-ui-fg-muted mb-4">
            Reason: {companyData.company.rejection_reason}
          </p>
        )}
        <p className="text-small-regular text-ui-fg-muted">
          Please contact support if you have questions.
        </p>
      </div>
    )
  }

  // Role check
  if (!allowedRoles.includes(companyData.company_user.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto text-center">
        <h2 className="text-xl-semi mb-4">Access Restricted</h2>
        <p className="text-base-regular text-ui-fg-subtle">
          Your role ({companyData.company_user.role.replace("_", "-")}) does not
          have permission to access this page.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
