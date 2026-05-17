import { ErpClient, ErpClientConfig } from "./client"

/**
 * ErpModuleService
 *
 * Medusa module service for the ERPNext integration.
 * Wraps ErpClient and exposes typed methods used by workflows and subscribers.
 *
 * All ERP-specific logic lives here; workflows must not import ErpClient directly.
 */
export class ErpModuleService {
  private readonly client: ErpClient

  constructor(config: ErpClientConfig) {
    this.client = new ErpClient(config)
  }

  /**
   * Health-check. Resolves with the ERPNext version string on success.
   * Used by the `erp:ping` script and the startup health-check.
   */
  async ping(): Promise<string> {
    return this.client.ping()
  }
}

export default ErpModuleService
