/**
 * Thin HTTP client for the ERPNext / Frappe REST API.
 *
 * Authentication: token-based (API key + secret).
 * Docs: https://frappeframework.com/docs/user/en/api/rest
 */

export interface ErpClientConfig {
  baseUrl: string
  apiKey: string
  apiSecret: string
}

export interface ErpResponse<T = unknown> {
  data: T
}

export class ErpClient {
  private readonly baseUrl: string
  private readonly authHeader: string

  constructor(config: ErpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    // ERPNext token auth format: "token <api_key>:<api_secret>"
    this.authHeader = `token ${config.apiKey}:${config.apiSecret}`
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(
        `ERPNext API error ${res.status} ${res.statusText} at ${method} ${path}: ${text}`
      )
    }

    const json = (await res.json()) as ErpResponse<T>
    return json.data
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path)
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body)
  }

  /**
   * Ping the ERPNext instance.
   * Returns the Frappe version string on success; throws on failure.
   */
  async ping(): Promise<string> {
    const info = await this.get<{ version: string }>(
      "/api/method/frappe.utils.version.get_frappe_version"
    )
    return info.version
  }
}
