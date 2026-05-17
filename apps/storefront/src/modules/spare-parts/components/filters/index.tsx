"use client"

import { useState, useCallback, ChangeEvent } from "react"
import { Input, Label } from "@modules/common/components/ui"
import NativeSelect from "@modules/common/components/native-select"
import CheckboxWithLabel from "@modules/common/components/checkbox"

export type FilterState = {
  brand: string
  deviceModel: string
  partType: string
  keyword: string
  partNumber: string
  includeDiscontinued: boolean
  includeSpecialOrder: boolean
  includeHazardous: boolean
}

type SparePartsFiltersProps = {
  availableFilters: {
    brands: string[]
    device_models: string[]
    part_types: string[]
  }
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export default function SparePartsFilters({
  availableFilters,
  filters,
  onFiltersChange,
}: SparePartsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters)
  
  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }, [localFilters, onFiltersChange])
  
  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Filter Spare Parts</h3>
      
      {/* Keyword Search */}
      <div>
        <Label htmlFor="keyword">Keyword</Label>
        <Input
          id="keyword"
          placeholder="Search by name, description..."
          value={localFilters.keyword}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter("keyword", e.target.value)}
        />
      </div>
      
      {/* Part Number Search */}
      <div>
        <Label htmlFor="partNumber">Part Number</Label>
        <Input
          id="partNumber"
          placeholder="OEM or Internal SKU"
          value={localFilters.partNumber}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter("partNumber", e.target.value)}
        />
      </div>
      
      {/* Brand Filter */}
      <div>
        <Label>Brand</Label>
        <NativeSelect
          value={localFilters.brand}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => updateFilter("brand", e.target.value)}
          placeholder="All Brands"
        >
          <option value="">All Brands</option>
          {availableFilters.brands?.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </NativeSelect>
      </div>
      
      {/* Device Model Filter */}
      <div>
        <Label>Device Model</Label>
        <NativeSelect
          value={localFilters.deviceModel}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => updateFilter("deviceModel", e.target.value)}
          placeholder="All Models"
        >
          <option value="">All Models</option>
          {availableFilters.device_models?.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </NativeSelect>
      </div>
      
      {/* Part Type Filter */}
      <div>
        <Label>Part Type</Label>
        <NativeSelect
          value={localFilters.partType}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => updateFilter("partType", e.target.value)}
          placeholder="All Types"
        >
          <option value="">All Types</option>
          {availableFilters.part_types?.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </NativeSelect>
      </div>
      
      {/* Flags */}
      <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
        <CheckboxWithLabel
          checked={localFilters.includeDiscontinued}
          onChange={() => updateFilter("includeDiscontinued", !localFilters.includeDiscontinued)}
          label="Show Discontinued"
        />
        <CheckboxWithLabel
          checked={localFilters.includeSpecialOrder}
          onChange={() => updateFilter("includeSpecialOrder", !localFilters.includeSpecialOrder)}
          label="Show Special Order"
        />
        <CheckboxWithLabel
          checked={localFilters.includeHazardous}
          onChange={() => updateFilter("includeHazardous", !localFilters.includeHazardous)}
          label="Show Hazardous"
        />
      </div>
    </div>
  )
}
