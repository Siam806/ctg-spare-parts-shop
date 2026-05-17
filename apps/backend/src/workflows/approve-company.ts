import {
  createStep,
  createWorkflow,
  WorkflowResponse,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { COMPANY_ACCOUNT_MODULE } from "../modules/company-account"
import CompanyAccountModuleService from "../modules/company-account/service"
import { Modules } from "@medusajs/framework/utils"

type ApproveCompanyInput = {
  company_id: string
}

type RejectCompanyInput = {
  company_id: string
  reason?: string
}

const approveCompanyStep = createStep(
  "approve-company",
  async (input: ApproveCompanyInput, { container }) => {
    const companyAccountService: CompanyAccountModuleService =
      container.resolve(COMPANY_ACCOUNT_MODULE)

    const previousState = await companyAccountService.retrieveCompany(
      input.company_id
    )
    const company = await companyAccountService.approveCompany(input.company_id)

    return new StepResponse(company, {
      company_id: input.company_id,
      previous_status: previousState.approval_status,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return
    const companyAccountService: CompanyAccountModuleService =
      container.resolve(COMPANY_ACCOUNT_MODULE)
    await companyAccountService.updateCompanies({
      id: compensationData.company_id,
      approval_status: compensationData.previous_status,
    })
  }
)

const emitCompanyApprovedStep = createStep(
  "emit-company-approved",
  async (input: { company_id: string }, { container }) => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "company.approved",
      data: { id: input.company_id },
    })
    return new StepResponse(undefined)
  }
)

export const approveCompanyWorkflow = createWorkflow(
  "approve-company",
  (input: ApproveCompanyInput) => {
    const company = approveCompanyStep(input)
    emitCompanyApprovedStep({ company_id: input.company_id })
    return new WorkflowResponse({ company })
  }
)

const rejectCompanyStep = createStep(
  "reject-company",
  async (input: RejectCompanyInput, { container }) => {
    const companyAccountService: CompanyAccountModuleService =
      container.resolve(COMPANY_ACCOUNT_MODULE)

    const previousState = await companyAccountService.retrieveCompany(
      input.company_id
    )
    const company = await companyAccountService.rejectCompany(
      input.company_id,
      input.reason
    )

    return new StepResponse(company, {
      company_id: input.company_id,
      previous_status: previousState.approval_status,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return
    const companyAccountService: CompanyAccountModuleService =
      container.resolve(COMPANY_ACCOUNT_MODULE)
    await companyAccountService.updateCompanies({
      id: compensationData.company_id,
      approval_status: compensationData.previous_status,
    })
  }
)

const emitCompanyRejectedStep = createStep(
  "emit-company-rejected",
  async (input: { company_id: string }, { container }) => {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "company.rejected",
      data: { id: input.company_id },
    })
    return new StepResponse(undefined)
  }
)

export const rejectCompanyWorkflow = createWorkflow(
  "reject-company",
  (input: RejectCompanyInput) => {
    const company = rejectCompanyStep(input)
    emitCompanyRejectedStep({ company_id: input.company_id })
    return new WorkflowResponse({ company })
  }
)
