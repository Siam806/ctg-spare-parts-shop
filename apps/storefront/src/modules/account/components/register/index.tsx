"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup as (state: string | null, formData: FormData) => Promise<string | null>, null as string | null)

  return (
    <div
      className="max-w-md flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        Register your company
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        Create a B2B account for your organisation. Your registration will be
        reviewed before ordering is enabled.
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        {/* Contact Person */}
        <h2 className="text-base-semi mb-2 mt-2">Contact Person</h2>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="First name"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="Last name"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="Password"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>

        {/* Company Details */}
        <h2 className="text-base-semi mb-2 mt-6">Company Details</h2>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Company name"
            name="company_name"
            required
            data-testid="company-name-input"
          />
          <Input
            label="VAT number"
            name="vat_number"
            data-testid="vat-number-input"
          />
          <Input
            label="KvK number"
            name="kvk_number"
            data-testid="kvk-number-input"
          />
        </div>

        {/* Billing Address */}
        <h2 className="text-base-semi mb-2 mt-6">Billing Address</h2>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Address line 1"
            name="billing_address_line_1"
            required
            autoComplete="address-line1"
            data-testid="billing-address-1-input"
          />
          <Input
            label="Address line 2"
            name="billing_address_line_2"
            autoComplete="address-line2"
            data-testid="billing-address-2-input"
          />
          <Input
            label="City"
            name="billing_city"
            required
            autoComplete="address-level2"
            data-testid="billing-city-input"
          />
          <Input
            label="Postal code"
            name="billing_postal_code"
            required
            autoComplete="postal-code"
            data-testid="billing-postal-code-input"
          />
          <Input
            label="Province / State"
            name="billing_province"
            autoComplete="address-level1"
            data-testid="billing-province-input"
          />
          <Input
            label="Country code (e.g. NL)"
            name="billing_country_code"
            required
            maxLength={2}
            autoComplete="country"
            data-testid="billing-country-code-input"
          />
        </div>

        <ErrorMessage error={message} data-testid="register-error" />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          By creating an account, you agree to our{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline"
          >
            Privacy Policy
          </LocalizedClientLink>{" "}
          and{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline"
          >
            Terms of Use
          </LocalizedClientLink>
          .
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          Register
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        Already a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          Sign in
        </button>
        .
      </span>
    </div>
  )
}

export default Register
