"use client"

import Link from "next/link"
import { DeviceWithPartsResponse } from "@lib/data/devices"
import { Heading, Text, Button } from "@modules/common/components/ui"
import SparePartCard from "@modules/spare-parts/components/spare-part-card"

interface DeviceDetailsTemplateProps {
  data: DeviceWithPartsResponse
}

export default function DeviceDetailsTemplate({ data }: DeviceDetailsTemplateProps) {
  const { device, compatible_parts, compatible_parts_count } = data
  
  return (
    <div className="content-container py-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/devices" className="text-blue-600 hover:underline">
            ← Back to Device Lookup
          </Link>
        </div>
        
        {/* Device Header */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {device.brand}
                </span>
                {device.product_line && (
                  <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                    {device.product_line}
                  </span>
                )}
              </div>
              
              <Heading level="h1" className="text-3xl font-semibold mb-2">
                {device.model_name}
              </Heading>
              
              {device.model_number && (
                <Text className="text-gray-600 mb-1">
                  Model Number: <strong>{device.model_number}</strong>
                </Text>
              )}
              
              {device.serial_number_prefix && (
                <Text className="text-gray-600 mb-1">
                  Serial Number Prefix: <strong>{device.serial_number_prefix}</strong>
                </Text>
              )}
              
              {device.description && (
                <Text className="text-gray-600 mt-3">{device.description}</Text>
              )}
            </div>
            
            <div className="text-right">
              <div className="bg-blue-600 text-white px-6 py-4 rounded-lg">
                <Text className="text-blue-100 text-sm">Compatible Parts</Text>
                <div className="text-3xl font-bold">{compatible_parts_count}</div>
              </div>
            </div>
          </div>
          
          {device.manual_url && (
            <div className="mt-4 pt-4 border-t">
              <a
                href={device.manual_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View Device Manual →
              </a>
            </div>
          )}
        </div>
        
        {/* Compatible Parts */}
        <div>
          <Heading level="h2" className="text-2xl font-semibold mb-6">
            Compatible Spare Parts
          </Heading>
          
          {compatible_parts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Text className="text-gray-600 mb-4">
                No compatible spare parts found for this device.
              </Text>
              <Link href="/spare-parts">
                <Button variant="secondary">Browse All Spare Parts</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Text className="text-gray-600">
                  Showing {compatible_parts.length} compatible part{compatible_parts.length !== 1 ? "s" : ""}
                </Text>
              </div>
              
              <ul className="grid grid-cols-1 small:grid-cols-2 medium:grid-cols-3 gap-4">
                {compatible_parts.map((sparePart) => (
                  <li key={sparePart.id}>
                    <SparePartCard sparePart={sparePart} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        
        {/* Related Actions */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/devices">
              <Button variant="secondary">Find Parts for Another Device</Button>
            </Link>
            <Link href="/spare-parts">
              <Button variant="secondary">Browse All Spare Parts</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
