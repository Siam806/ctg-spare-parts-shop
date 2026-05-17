"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { listDevices, getDeviceFilters, Device } from "@lib/data/devices"
import { Heading, Text, Button } from "@modules/common/components/ui"

interface FilterOptions {
  brands: string[]
  product_lines: string[]
}

type SelectionStep = "brand" | "product_line" | "model" | "serial_search"

export default function DeviceLookupTemplate() {
  const router = useRouter()
  const [step, setStep] = useState<SelectionStep>("brand")
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brands: [],
    product_lines: [],
  })
  
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [selectedProductLine, setSelectedProductLine] = useState<string>("")
  const [serialPrefix, setSerialPrefix] = useState<string>("")
  
  const [devices, setDevices] = useState<Device[]>([])
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Load filter options on mount
  useEffect(() => {
    getDeviceFilters().then((options) => {
      setFilterOptions(options)
      setIsLoading(false)
    })
  }, [])
  
  // Load all devices on mount
  useEffect(() => {
    listDevices({ limit: 1000 }).then((response) => {
      setDevices(response.devices)
    })
  }, [])
  
  // Filter devices based on current selection
  useEffect(() => {
    let filtered = devices
    
    if (selectedBrand) {
      filtered = filtered.filter((d) => d.brand === selectedBrand)
    }
    
    if (selectedProductLine) {
      filtered = filtered.filter((d) => d.product_line === selectedProductLine)
    }
    
    setFilteredDevices(filtered)
  }, [devices, selectedBrand, selectedProductLine])
  
  const handleBrandSelect = useCallback((brand: string) => {
    setSelectedBrand(brand)
    setSelectedProductLine("")
    setStep("product_line")
  }, [])
  
  const handleProductLineSelect = useCallback((productLine: string) => {
    setSelectedProductLine(productLine)
    setStep("model")
  }, [])
  
  const handleModelSelect = useCallback((deviceId: string) => {
    router.push(`/devices/${deviceId}`)
  }, [router])
  
  const handleSerialSearch = useCallback(async () => {
    if (!serialPrefix.trim()) return
    
    setIsLoading(true)
    try {
      const response = await listDevices({ serial_prefix: serialPrefix, limit: 100 })
      setFilteredDevices(response.devices)
      setStep("model")
    } finally {
      setIsLoading(false)
    }
  }, [serialPrefix])
  
  const handleBack = useCallback(() => {
    if (step === "model") {
      if (serialPrefix) {
        setSerialPrefix("")
        setStep("serial_search")
      } else {
        setSelectedProductLine("")
        setStep("product_line")
      }
    } else if (step === "product_line") {
      setSelectedBrand("")
      setStep("brand")
    } else if (step === "serial_search") {
      setStep("brand")
    }
  }, [step, serialPrefix])
  
  const availableProductLines = filterOptions.product_lines.filter((pl) =>
    devices.some((d) => d.brand === selectedBrand && d.product_line === pl)
  )
  
  if (isLoading && step === "brand") {
    return (
      <div className="content-container py-12">
        <div className="flex items-center justify-center h-64">
          <Text>Loading...</Text>
        </div>
      </div>
    )
  }
  
  return (
    <div className="content-container py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <Heading level="h1" className="text-3xl font-semibold mb-3">
            Find Parts for Your Device
          </Heading>
          <Text className="text-gray-600 text-lg">
            Select your CTG equipment to find compatible spare parts
          </Text>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`h-2 w-24 rounded-full ${step === "brand" ? "bg-blue-600" : "bg-gray-200"}`} />
          <div className={`h-2 w-24 rounded-full ${step === "product_line" || step === "serial_search" ? "bg-blue-600" : step === "brand" ? "bg-gray-200" : "bg-blue-600"}`} />
          <div className={`h-2 w-24 rounded-full ${step === "model" ? "bg-blue-600" : "bg-gray-200"}`} />
        </div>
        
        {/* Back button */}
        {step !== "brand" && (
          <Button variant="secondary" onClick={handleBack} className="mb-6">
            ← Back
          </Button>
        )}
        
        {/* Alternative search option */}
        {step === "brand" && (
          <div className="mb-8 text-center">
            <Text className="text-gray-500 mb-2">Or search by</Text>
            <Button 
              variant="secondary" 
              onClick={() => setStep("serial_search")}
            >
              Serial Number Prefix
            </Button>
          </div>
        )}
        
        {/* Step: Brand Selection */}
        {step === "brand" && (
          <div>
            <Heading level="h2" className="text-xl font-medium mb-6 text-center">
              Select Brand
            </Heading>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filterOptions.brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => handleBrandSelect(brand)}
                  className="p-6 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                >
                  <Text className="font-medium">{brand}</Text>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Step: Serial Number Search */}
        {step === "serial_search" && (
          <div>
            <Heading level="h2" className="text-xl font-medium mb-6 text-center">
              Search by Serial Number Prefix
            </Heading>
            <div className="max-w-md mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serialPrefix}
                  onChange={(e) => setSerialPrefix(e.target.value)}
                  placeholder="Enter serial number prefix (e.g., SN123)"
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleSerialSearch()}
                />
                <Button onClick={handleSerialSearch} disabled={!serialPrefix.trim()}>
                  Search
                </Button>
              </div>
              <Text className="text-gray-500 text-sm mt-2">
                Tip: The prefix is usually the first few characters of your device&apos;s serial number plate.
              </Text>
            </div>
          </div>
        )}
        
        {/* Step: Product Line Selection */}
        {step === "product_line" && (
          <div>
            <Heading level="h2" className="text-xl font-medium mb-6 text-center">
              Select Product Line - {selectedBrand}
            </Heading>
            {availableProductLines.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableProductLines.map((productLine) => (
                  <button
                    key={productLine}
                    onClick={() => handleProductLineSelect(productLine)}
                    className="p-6 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                  >
                    <Text className="font-medium">{productLine}</Text>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <Text className="text-gray-500 mb-4">No product lines found for this brand.</Text>
                <Button onClick={() => setStep("model")}>View All {selectedBrand} Models</Button>
              </div>
            )}
          </div>
        )}
        
        {/* Step: Model Selection */}
        {step === "model" && (
          <div>
            <Heading level="h2" className="text-xl font-medium mb-2 text-center">
              Select Model
            </Heading>
            {selectedBrand && (
              <Text className="text-center text-gray-600 mb-6">
                {selectedBrand}
                {selectedProductLine && ` › ${selectedProductLine}`}
              </Text>
            )}
            {serialPrefix && (
              <Text className="text-center text-gray-600 mb-6">
                Serial prefix: &quot;{serialPrefix}&quot;
              </Text>
            )}
            
            {filteredDevices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDevices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleModelSelect(device.id)}
                    className="p-6 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <Text className="font-medium text-lg">{device.model_name}</Text>
                    {device.model_number && (
                      <Text className="text-gray-500 text-sm">Model #: {device.model_number}</Text>
                    )}
                    {device.serial_number_prefix && (
                      <Text className="text-gray-500 text-sm">Serial prefix: {device.serial_number_prefix}</Text>
                    )}
                    {device.description && (
                      <Text className="text-gray-600 text-sm mt-2">{device.description}</Text>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Text className="text-gray-500">No devices found matching your criteria.</Text>
                <Button onClick={handleBack} className="mt-4">
                  Go Back
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
