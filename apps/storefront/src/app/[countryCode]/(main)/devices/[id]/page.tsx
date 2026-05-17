import { Metadata } from "next"
import { notFound } from "next/navigation"
import DeviceDetailsTemplate from "@modules/device-lookup/templates/device-details-template"
import { getDeviceWithParts } from "@lib/data/devices"

interface DevicePageProps {
  params: {
    id: string
    countryCode: string
  }
}

export async function generateMetadata({ params }: DevicePageProps): Promise<Metadata> {
  try {
    const { device } = await getDeviceWithParts(params.id)
    return {
      title: `${device.model_name} Compatible Parts`,
      description: `Find spare parts compatible with ${device.brand} ${device.model_name}`,
    }
  } catch {
    return {
      title: "Device Not Found",
      description: "The requested device could not be found",
    }
  }
}

export default async function DevicePage({ params }: DevicePageProps) {
  try {
    const data = await getDeviceWithParts(params.id)
    
    if (!data.device) {
      notFound()
    }
    
    return <DeviceDetailsTemplate data={data} />
  } catch {
    notFound()
  }
}
