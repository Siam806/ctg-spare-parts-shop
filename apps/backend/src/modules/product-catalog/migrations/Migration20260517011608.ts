import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260517011608 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "device" ("id" text not null, "brand" text not null, "product_line" text null, "model_name" text not null, "model_number" text null, "serial_number_prefix" text null, "description" text null, "specifications" jsonb not null default '{}', "manual_url" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "device_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_device_deleted_at" ON "device" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "spare_part_details" ("id" text not null, "product_id" text not null, "oem_part_number" text null, "internal_sku" text not null, "brand" text not null, "device_model" text not null, "part_type" text not null, "compatible_device_models" jsonb not null default '{}', "is_discontinued" boolean not null default false, "is_special_order" boolean not null default false, "is_hazardous" boolean not null default false, "unit_of_measure" text not null default 'piece', "specifications" jsonb not null default '{}', "datasheet_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "spare_part_details_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_spare_part_details_deleted_at" ON "spare_part_details" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "device" cascade;`);

    this.addSql(`drop table if exists "spare_part_details" cascade;`);
  }

}
