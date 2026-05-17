import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260517031349 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shipment_record" ("id" text not null, "order_id" text not null, "carrier" text check ("carrier" in ('sendcloud', 'postnl')) not null, "service" text not null, "tracking_number" text not null, "tracking_url" text null, "label_url" text null, "label_data" jsonb null, "cost" numeric null, "currency" text not null default 'eur', "weight" numeric not null, "dimensions" jsonb null, "from_address" jsonb not null, "to_address" jsonb not null, "hazmat" boolean not null default false, "hazmat_type" text check ("hazmat_type" in ('lithium', 'magnetized', 'dry_ice', 'other')) null, "status" text check ("status" in ('created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned')) not null default 'created', "shipped_at" timestamptz null, "delivered_at" timestamptz null, "carrier_response" jsonb null, "raw_cost" jsonb null, "raw_weight" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipment_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_record_order_id" ON "shipment_record" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_record_tracking_number" ON "shipment_record" ("tracking_number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_record_deleted_at" ON "shipment_record" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipment_record" cascade;`);
  }

}
