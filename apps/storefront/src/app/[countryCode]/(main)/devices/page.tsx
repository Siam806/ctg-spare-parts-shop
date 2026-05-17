import { Metadata } from "next"
import DeviceLookupTemplate from "@modules/device-lookup/templates/lookup-template"

export const metadata: Metadata = {
  title: "Find Parts by Device",
  description: "Look up compatible spare parts for your CTG equipment by brand, model, or serial number",
}

export default function DeviceLookupPage() {
  return <DeviceLookupTemplate />
}
