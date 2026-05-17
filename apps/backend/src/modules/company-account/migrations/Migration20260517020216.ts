import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260517020216 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "company" ("id" text not null, "name" text not null, "vat_number" text null, "kvk_number" text null, "billing_address_line_1" text not null, "billing_address_line_2" text null, "billing_city" text not null, "billing_postal_code" text not null, "billing_province" text null, "billing_country_code" text not null, "phone" text null, "website" text null, "approval_status" text check ("approval_status" in ('pending', 'approved', 'rejected')) not null default 'pending', "approved_at" timestamptz null, "rejected_at" timestamptz null, "rejection_reason" text null, "metadata" jsonb not null default '{}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "company_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_deleted_at" ON "company" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "company_user" ("id" text not null, "customer_id" text not null, "company_id" text not null, "role" text check ("role" in ('admin', 'buyer', 'view_only')) not null default 'buyer', "is_primary_contact" boolean not null default false, "metadata" jsonb not null default '{}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "company_user_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_user_deleted_at" ON "company_user" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "company" cascade;`);

    this.addSql(`drop table if exists "company_user" cascade;`);
  }

}
