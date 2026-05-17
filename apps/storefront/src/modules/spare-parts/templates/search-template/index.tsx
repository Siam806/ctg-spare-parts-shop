"use client"

import { useState, useEffect, useCallback } from "react"
import { searchSpareParts, getSparePartFilters, SparePartDetails } from "@lib/data/spare-parts"
import SparePartsFilters, { FilterState } from "@modules/spare-parts/components/filters"
import SparePartCard from "@modules/spare-parts/components/spare-part-card"
import { Pagination } from "@modules/store/components/pagination"
import { Heading, Text } from "@modules/common/components/ui"

const PRODUCT_LIMIT = 12

type AvailableFilters = {
  brands: string[]
  device_models: string[]
  part_types: string[]
}

export default function SparePartsSearchTemplate() {
  const [spareParts, setSpareParts] = useState<SparePartDetails[]>([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({
    brands: [],
    device_models: [],
    part_types: [],
  })
  
  const [filters, setFilters] = useState<FilterState>({
    brand: "",
    deviceModel: "",
    partType: "",
    keyword: "",
    partNumber: "",
    includeDiscontinued: false,
    includeSpecialOrder: false,
    includeHazardous: false,
  })
  
  // Load available filters on mount
  useEffect(() => {
    getSparePartFilters().then((data) => {
      setAvailableFilters(data.filters)
    })
  }, [])
  
  // Search spare parts when filters or page changes
  const performSearch = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await searchSpareParts({
        brand: filters.brand || undefined,
        device_model: filters.deviceModel || undefined,
        part_type: filters.partType || undefined,
        keyword: filters.keyword || undefined,
        part_number: filters.partNumber || undefined,
        is_discontinued: filters.includeDiscontinued || undefined,
        is_special_order: filters.includeSpecialOrder || undefined,
        is_hazardous: filters.includeHazardous || undefined,
        limit: PRODUCT_LIMIT,
        offset: (page - 1) * PRODUCT_LIMIT,
      })
      
      setSpareParts(response.spare_parts)
      setCount(response.count)
    } catch (error) {
      console.error("Error searching spare parts:", error)
    } finally {
      setIsLoading(false)
    }
  }, [filters, page])
  
  useEffect(() => {
    performSearch()
  }, [performSearch])
  
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }, [])
  
  const totalPages = Math.ceil(count / PRODUCT_LIMIT)
  
  return (
    <div className="content-container py-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <Heading level="h1" className="text-2xl font-semibold mb-2">
            Spare Parts Catalog
          </Heading>
          <Text className="text-gray-600">
            Find spare parts for CTG equipment by brand, model, or part number
          </Text>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <SparePartsFilters
              availableFilters={availableFilters}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>
          
          {/* Results */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Text>Loading...</Text>
              </div>
            ) : spareParts.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <Text>No spare parts found matching your criteria</Text>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <Text className="text-gray-600">
                    Showing {spareParts.length} of {count} results
                  </Text>
                </div>
                
                <ul className="grid grid-cols-1 small:grid-cols-2 gap-4">
                  {spareParts.map((sparePart) => (
                    <li key={sparePart.id}>
                      <SparePartCard sparePart={sparePart} />
                    </li>
                  ))}
                </ul>
                
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
