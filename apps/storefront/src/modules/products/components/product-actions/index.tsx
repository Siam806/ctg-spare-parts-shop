"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type CartAllowed =
  | "allowed"
  | "unauthenticated"
  | "no_company"
  | "pending"
  | "rejected"
  | "view_only"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  cartAllowed?: CartAllowed
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

/** Inline callout shown when the user cannot add to cart due to auth/approval state */
function CartBlockedNotice({ cartAllowed }: { cartAllowed: CartAllowed }) {
  if (cartAllowed === "unauthenticated") {
    return (
      <div className="text-small-regular text-ui-fg-subtle bg-ui-bg-subtle border border-ui-border-base rounded-md p-3">
        <LocalizedClientLink href="/account" className="underline font-medium text-ui-fg-interactive">
          Sign in
        </LocalizedClientLink>{" "}
        with an approved B2B account to add items to your cart.
      </div>
    )
  }

  if (cartAllowed === "no_company") {
    return (
      <div className="text-small-regular text-ui-fg-subtle bg-ui-bg-subtle border border-ui-border-base rounded-md p-3">
        You need to{" "}
        <LocalizedClientLink href="/account" className="underline font-medium text-ui-fg-interactive">
          register your company
        </LocalizedClientLink>{" "}
        before you can order.
      </div>
    )
  }

  if (cartAllowed === "pending") {
    return (
      <div className="text-small-regular text-ui-fg-subtle bg-ui-bg-subtle border border-ui-border-base rounded-md p-3">
        Your company account is <span className="font-medium">pending approval</span>. You will be notified once it is reviewed.
      </div>
    )
  }

  if (cartAllowed === "rejected") {
    return (
      <div className="text-small-regular text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
        Your company registration was <span className="font-medium">not approved</span>. Please contact support.
      </div>
    )
  }

  if (cartAllowed === "view_only") {
    return (
      <div className="text-small-regular text-ui-fg-subtle bg-ui-bg-subtle border border-ui-border-base rounded-md p-3">
        Your account role (view-only) does not permit adding items to cart.
      </div>
    )
  }

  return null
}

export default function ProductActions({
  product,
  disabled,
  cartAllowed = "allowed",
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setAddError(null)
    setIsAdding(true)

    const result = await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    }).catch((err: Error) => {
      setAddError(err.message ?? "Failed to add item to cart.")
    })

    setIsAdding(false)
  }

  const canAddToCart = cartAllowed === "allowed"

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        {canAddToCart ? (
          <>
            <Button
              onClick={handleAddToCart}
              disabled={
                !inStock ||
                !selectedVariant ||
                !!disabled ||
                isAdding ||
                !isValidVariant
              }
              variant="primary"
              className="w-full h-10"
              isLoading={isAdding}
              data-testid="add-product-button"
            >
              {!selectedVariant && !options
                ? "Select variant"
                : !inStock || !isValidVariant
                ? "Out of stock"
                : "Add to cart"}
            </Button>
            {addError && (
              <p className="text-small-regular text-red-500 mt-1" data-testid="add-to-cart-error">
                {addError}
              </p>
            )}
          </>
        ) : (
          <CartBlockedNotice cartAllowed={cartAllowed} />
        )}

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding || !canAddToCart}
        />
      </div>
    </>
  )
}
