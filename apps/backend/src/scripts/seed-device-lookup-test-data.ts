import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import { PRODUCT_CATALOG_MODULE } from "../modules/product-catalog";
import ProductCatalogModuleService from "../modules/product-catalog/service";

/**
 * Seed test data for device lookup feature
 * Run with: pnpm --filter backend medusa exec ./src/scripts/seed-device-lookup-test-data.ts
 */
export default async function seedDeviceLookupTestData({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productCatalogService: ProductCatalogModuleService = container.resolve(PRODUCT_CATALOG_MODULE);

  logger.info("Seeding device lookup test data...");

  // Check if we already have devices
  const existingDevices = await productCatalogService.listDevices();
  const hasDevices = existingDevices.length > 0;
  if (hasDevices) {
    logger.info(`Found ${existingDevices.length} existing devices. Skipping device seed.`);
  }

  // Get shipping profile
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  // Get default sales channel
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  });
  const defaultSalesChannel = salesChannels[0];

  // Define test devices (CTG/Fetal Monitor equipment)
  const devicesData = [
    // Philips Avalon Series
    {
      brand: "Philips",
      product_line: "Avalon FM20",
      model_name: "Avalon FM20 Fetal Monitor",
      model_number: "FM20",
      serial_number_prefix: "PHFM20",
      description: "Basic fetal monitor with CTG functionality",
    },
    {
      brand: "Philips",
      product_line: "Avalon FM30",
      model_name: "Avalon FM30 Fetal Monitor",
      model_number: "FM30",
      serial_number_prefix: "PHFM30",
      description: "Advanced fetal monitor with maternal monitoring",
    },
    {
      brand: "Philips",
      product_line: "Avalon FM40",
      model_name: "Avalon FM40 Fetal Monitor",
      model_number: "FM40",
      serial_number_prefix: "PHFM40",
      description: "High-end fetal monitor with twins capability",
    },
    {
      brand: "Philips",
      product_line: "Avalon FM50",
      model_name: "Avalon FM50 Fetal Monitor",
      model_number: "FM50",
      serial_number_prefix: "PHFM50",
      description: "Premium fetal monitor with full features",
    },
    // GE Corometrics Series
    {
      brand: "GE Healthcare",
      product_line: "Corometrics 170",
      model_name: "Corometrics 170 Series",
      model_number: "C170",
      serial_number_prefix: "GEC170",
      description: "Entry-level fetal monitor",
    },
    {
      brand: "GE Healthcare",
      product_line: "Corometrics 250",
      model_name: "Corometrics 250 Series",
      model_number: "C250",
      serial_number_prefix: "GEC250",
      description: "Mid-range fetal monitor with CTG",
    },
    {
      brand: "GE Healthcare",
      product_line: "Corometrics 250cx",
      model_name: "Corometrics 250cx",
      model_number: "C250CX",
      serial_number_prefix: "GEC250CX",
      description: "Advanced fetal monitor with color display",
    },
    // Toitu
    {
      brand: "Toitu",
      product_line: "FM-800",
      model_name: "FM-800 Fetal Monitor",
      model_number: "FM800",
      serial_number_prefix: "TOFM800",
      description: "Compact fetal monitor for small clinics",
    },
    {
      brand: "Toitu",
      product_line: "FM-1000",
      model_name: "FM-1000 Fetal Monitor",
      model_number: "FM1000",
      serial_number_prefix: "TOFM1000",
      description: "Full-featured fetal monitor",
    },
    // Edan
    {
      brand: "Edan",
      product_line: "F2",
      model_name: "F2 Fetal Monitor",
      model_number: "F2",
      serial_number_prefix: "EDF2",
      description: "Portable fetal monitor",
    },
    {
      brand: "Edan",
      product_line: "F3",
      model_name: "F3 Fetal Monitor",
      model_number: "F3",
      serial_number_prefix: "EDF3",
      description: "Advanced portable fetal monitor",
    },
    {
      brand: "Edan",
      product_line: "F6",
      model_name: "F6 Fetal Monitor",
      model_number: "F6",
      serial_number_prefix: "EDF6",
      description: "Twin fetal monitoring system",
    },
    // Huntleigh
    {
      brand: "Huntleigh",
      product_line: "Sonicaid",
      model_name: "Sonicaid FD3",
      model_number: "FD3",
      serial_number_prefix: "HUFD3",
      description: "Doppler fetal monitor",
    },
    {
      brand: "Huntleigh",
      product_line: "Sonicaid",
      model_name: "Sonicaid Team3",
      model_number: "TEAM3",
      serial_number_prefix: "HUTEAM3",
      description: "Team monitoring system",
    },
  ];

  // Create devices only if none exist
  if (!hasDevices) {
    logger.info(`Creating ${devicesData.length} test devices...`);

    for (const deviceData of devicesData) {
      try {
        const [device] = await productCatalogService.createDevices([deviceData]);
        logger.info(`Created device: ${device.brand} ${device.model_name}`);
      } catch (error) {
        logger.error(`Failed to create device ${deviceData.model_name}:`, error);
      }
    }
  }

  // Define spare parts that are compatible with multiple devices
  const sparePartsData = [
    // Ultrasound Transducers
    {
      title: "M2736A Ultrasound Transducer",
      handle: "m2736a-ultrasound-transducer",
      description: "Compatible ultrasound transducer for Philips Avalon series",
      oem_part_number: "M2736A",
      internal_sku: "CTG-UT-PH-001",
      brand: "Philips",
      device_model: "Avalon FM20",
      part_type: "transducer",
      price: 45000, // in cents = €450
      compatible_devices: ["Philips Avalon FM20", "Philips Avalon FM30", "Philips Avalon FM40", "Philips Avalon FM50"],
    },
    {
      title: "M2735A Toco Transducer",
      handle: "m2735a-toco-transducer",
      description: "Tocodynamometer transducer for contraction monitoring",
      oem_part_number: "M2735A",
      internal_sku: "CTG-TC-PH-001",
      brand: "Philips",
      device_model: "Avalon FM20",
      part_type: "transducer",
      price: 32000, // €320
      compatible_devices: ["Philips Avalon FM20", "Philips Avalon FM30", "Philips Avalon FM40", "Philips Avalon FM50"],
    },
    // GE Parts
    {
      title: "2264HAX Toco Transducer",
      handle: "2264hax-toco-transducer",
      description: "TOCO transducer for GE Corometrics series",
      oem_part_number: "2264HAX",
      internal_sku: "CTG-TC-GE-001",
      brand: "GE Healthcare",
      device_model: "Corometrics 170 Series",
      part_type: "transducer",
      price: 28000, // €280
      compatible_devices: ["GE Corometrics 170 Series", "GE Corometrics 250 Series", "GE Corometrics 250cx"],
    },
    {
      title: "2260HAX Ultrasound Transducer",
      handle: "2260hax-ultrasound-transducer",
      description: "Ultrasound transducer for fetal heart rate monitoring",
      oem_part_number: "2260HAX",
      internal_sku: "CTG-UT-GE-001",
      brand: "GE Healthcare",
      device_model: "Corometrics 170 Series",
      part_type: "transducer",
      price: 38000, // €380
      compatible_devices: ["GE Corometrics 170 Series", "GE Corometrics 250 Series", "GE Corometrics 250cx"],
    },
    // Belts
    {
      title: "Monitoring Belt Set (Pack of 5)",
      handle: "monitoring-belt-set",
      description: "Universal monitoring belts for securing transducers",
      oem_part_number: "989803144401",
      internal_sku: "CTG-BLT-UNI-001",
      brand: "Generic",
      device_model: "Avalon FM20",
      part_type: "belt",
      price: 2500, // €25
      compatible_devices: ["Philips Avalon FM20", "Philips Avalon FM30", "Philips Avalon FM40", "Philips Avalon FM50",
                          "GE Corometrics 170 Series", "GE Corometrics 250 Series"],
    },
    // Cables
    {
      title: "Patient Cable for M2736A",
      handle: "patient-cable-m2736a",
      description: "Replacement patient cable for ultrasound transducer",
      oem_part_number: "M2734-60001",
      internal_sku: "CTG-CBL-PH-001",
      brand: "Philips",
      device_model: "Avalon FM20",
      part_type: "cable",
      price: 8500, // €85
      compatible_devices: ["Philips Avalon FM20", "Philips Avalon FM30", "Philips Avalon FM40", "Philips Avalon FM50"],
    },
    {
      title: "TOCO Cable for 2264HAX",
      handle: "toco-cable-2264hax",
      description: "Replacement cable for GE TOCO transducer",
      oem_part_number: "2264LAX",
      internal_sku: "CTG-CBL-GE-001",
      brand: "GE Healthcare",
      device_model: "Corometrics 170 Series",
      part_type: "cable",
      price: 7200, // €72
      compatible_devices: ["GE Corometrics 170 Series", "GE Corometrics 250 Series", "GE Corometrics 250cx"],
    },
    // Batteries
    {
      title: "Rechargeable Battery Pack",
      handle: "rechargeable-battery-pack",
      description: "Lithium-ion battery for portable monitors",
      oem_part_number: "M4607A",
      internal_sku: "CTG-BAT-PH-001",
      brand: "Philips",
      device_model: "Avalon FM20",
      part_type: "battery",
      price: 15000, // €150
      is_hazardous: true,
      compatible_devices: ["Philips Avalon FM30", "Philips Avalon FM40", "Philips Avalon FM50"],
    },
    // Paper
    {
      title: "CTG Chart Paper (Pack of 10)",
      handle: "ctg-chart-paper",
      description: "Thermal paper for CTG recording",
      oem_part_number: "40457E",
      internal_sku: "CTG-PAP-UNI-001",
      brand: "Generic",
      device_model: "Avalon FM20",
      part_type: "consumable",
      price: 4500, // €45
      compatible_devices: ["Philips Avalon FM20", "Philips Avalon FM30", "Philips Avalon FM40", "Philips Avalon FM50",
                          "GE Corometrics 170 Series", "GE Corometrics 250 Series", "GE Corometrics 250cx"],
    },
    // Probes
    {
      title: "Fetal scalp electrode probe",
      handle: "fetal-scalp-electrode",
      description: "Single-use scalp electrode for direct monitoring",
      oem_part_number: "M1355A",
      internal_sku: "CTG-PRB-PH-001",
      brand: "Philips",
      device_model: "Avalon FM20",
      part_type: "probe",
      price: 1200, // €12 per unit
      compatible_devices: ["Philips Avalon FM20", "Philips Avalon FM30", "Philips Avalon FM40", "Philips Avalon FM50"],
    },
    // Toitu parts
    {
      title: "FM-800 Transducer Set",
      handle: "fm800-transducer-set",
      description: "Complete transducer set for FM-800",
      oem_part_number: "TS-800",
      internal_sku: "CTG-TS-TO-001",
      brand: "Toitu",
      device_model: "FM-800 Fetal Monitor",
      part_type: "transducer",
      price: 55000, // €550
      compatible_devices: ["Toitu FM-800 Fetal Monitor"],
    },
    // Edan parts
    {
      title: "F3 Ultrasound Module",
      handle: "f3-ultrasound-module",
      description: "Replacement ultrasound module for F3",
      oem_part_number: "UM-F3",
      internal_sku: "CTG-UM-ED-001",
      brand: "Edan",
      device_model: "F3 Fetal Monitor",
      part_type: "module",
      price: 42000, // €420
      compatible_devices: ["Edan F3 Fetal Monitor"],
    },
    // Huntleigh parts
    {
      title: "Sonicaid Doppler Probe",
      handle: "sonicaid-doppler-probe",
      description: "2MHz doppler probe for FD3",
      oem_part_number: "DP-02",
      internal_sku: "CTG-DP-HU-001",
      brand: "Huntleigh",
      device_model: "Sonicaid FD3",
      part_type: "probe",
      price: 18000, // €180
      compatible_devices: ["Huntleigh Sonicaid FD3"],
    },
  ];

  logger.info(`Creating ${sparePartsData.length} spare parts with products...`);

  // Create products and spare part details
  for (const partData of sparePartsData) {
    // Create the product in Medusa
    const { result: products } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: partData.title,
            handle: partData.handle,
            description: partData.description,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            options: [
              {
                title: "Default",
                values: ["Default"],
              },
            ],
            variants: [
              {
                title: "Default",
                sku: partData.internal_sku,
                options: {
                  Default: "Default",
                },
                prices: [
                  {
                    amount: partData.price,
                    currency_code: "eur",
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel.id,
              },
            ],
          },
        ],
      },
    });

    const product = products[0];

    // Create spare part details linked to this product
    await productCatalogService.createSparePartDetails([{
      product_id: product.id,
      oem_part_number: partData.oem_part_number,
      internal_sku: partData.internal_sku,
      brand: partData.brand,
      device_model: partData.device_model,
      part_type: partData.part_type,
      compatible_device_models: { devices: partData.compatible_devices },
      is_discontinued: false,
      is_special_order: false,
      is_hazardous: partData.is_hazardous || false,
      unit_of_measure: "piece",
      specifications: {
        compatible_with: partData.compatible_devices.join(", "),
      },
    }]);

    logger.info(`Created spare part: ${partData.title} (${partData.internal_sku})`);
  }

  logger.info("✅ Device lookup test data seeding completed!");
  logger.info("");
  logger.info("Test devices created:");
  logger.info("- Philips: Avalon FM20, FM30, FM40, FM50");
  logger.info("- GE Healthcare: Corometrics 170, 250, 250cx");
  logger.info("- Toitu: FM-800, FM-1000");
  logger.info("- Edan: F2, F3, F6");
  logger.info("- Huntleigh: Sonicaid FD3, Team3");
  logger.info("");
  logger.info("You can now test the device lookup at: http://localhost:8000/devices");
}
