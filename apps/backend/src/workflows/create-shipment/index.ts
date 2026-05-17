import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Logger } from "@medusajs/framework/types"
import ShippingModuleService from "../../modules/shipping/service"
import { SHIPPING_MODULE } from "../../modules/shipping"
import { Address, CarrierType } from "../../modules/shipping/types"

/**
 * Input for creating a shipment
 */
export interface CreateShipmentInput {
  orderId: string
  items: Array<{
    id: string
    quantity: number
    weight?: number
  }>
  fromAddress: Address
  toAddress: Address
  carrier?: CarrierType
  service?: string
  isHazmat?: boolean
}

/**
 * Output from creating a shipment
 */
export interface CreateShipmentOutput {
  trackingNumber: string
  labelUrl: string
  trackingUrl: string
  carrier: CarrierType
  cost: number
}

/**
 * Step: Calculate total weight from order items
 */
const calculateShipmentWeightStep = createStep(
  "calculate-shipment-weight",
  async (input: { items: CreateShipmentInput["items"] }, { container }) => {
    const query = container.resolve("query")
    let totalWeight = 0

    for (const item of input.items) {
      if (item.weight) {
        totalWeight += item.weight * item.quantity
      } else {
        // Fetch variant weight from database
        const { data } = await query.graph({
          entity: "product_variant",
          fields: ["weight"],
          filters: { id: item.id },
        })
        const weight = data[0]?.weight || 0
        totalWeight += weight * item.quantity
      }
    }

    // Add packaging weight (100g buffer)
    totalWeight += 100

    return new StepResponse({ weight: totalWeight })
  }
)

/**
 * Step: Create shipping label via carrier
 */
const createLabelStep = createStep(
  "create-shipping-label",
  async (
    input: CreateShipmentInput & { weight: number },
    { container }
  ) => {
    const shippingService: ShippingModuleService = container.resolve(SHIPPING_MODULE)
    const logger: Logger = container.resolve("logger")

    logger.info(`[CreateShipmentWorkflow] Creating label for order ${input.orderId}`)

    try {
      const result = await shippingService.createLabel({
        orderId: input.orderId,
        from: input.fromAddress,
        to: input.toAddress,
        weight: input.weight,
        carrier: input.carrier,
        service: input.service,
        isHazmat: input.isHazmat,
      })

      return new StepResponse<CreateShipmentOutput>({
        trackingNumber: result.trackingNumber,
        labelUrl: result.labelUrl,
        trackingUrl: result.trackingUrl,
        carrier: result.carrier,
        cost: result.cost,
      })
    } catch (error) {
      logger.error(`[CreateShipmentWorkflow] Failed to create label: ${error}`)
      throw error
    }
  }
)

/**
 * Workflow: Create shipment for an order
 *
 * This workflow is triggered when an order enters the "picking" state.
 * It calculates the total weight, creates a shipping label,
 * and stores the tracking information.
 */
export const createShipmentWorkflow = createWorkflow(
  "create-shipment",
  (input: CreateShipmentInput) => {
    // Calculate total weight
    const { weight } = calculateShipmentWeightStep({
      items: input.items,
    })

    // Create shipping label
    const label = createLabelStep({
      ...input,
      weight: weight,
    })

    return new WorkflowResponse(label)
  }
)
