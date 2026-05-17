export type CompanyApprovalStatus = "pending" | "approved" | "rejected"

export const COMPANY_STATUS_COLORS: Record<CompanyApprovalStatus, "green" | "orange" | "red"> = {
  approved: "green",
  pending: "orange",
  rejected: "red",
}