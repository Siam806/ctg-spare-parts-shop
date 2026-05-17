// Type declarations for medusa-test-utils
declare module "medusa-test-utils" {
  export function medusaIntegrationTestRunner(options: {
    testName?: string
    inApp?: boolean
    env?: Record<string, string>
    fn: (options: { getContainer: () => any }) => void
  }): void
}
