import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261009165648 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "eda_registration" ("id" text not null, "registration_number" text not null, "is_approved" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "eda_registration_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_eda_registration_deleted_at" ON "eda_registration" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "eda_registration" cascade;`);
  }

}
