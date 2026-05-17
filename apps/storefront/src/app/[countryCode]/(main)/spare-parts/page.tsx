import { Metadata } from "next"
import SparePartsSearchTemplate from "@modules/spare-parts/templates/search-template"

export const metadata: Metadata = {
  title: "Spare Parts Catalog",
  description: "Find spare parts for CTG equipment by brand, model, or part number",
}

export default function SparePartsPage() {
  return <SparePartsSearchTemplate />
}
