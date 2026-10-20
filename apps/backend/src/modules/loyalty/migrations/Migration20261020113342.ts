import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261020113342 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "points_entry" drop constraint if exists "points_entry_kind_source_id_unique";`);
    this.addSql(`create table if not exists "points_entry" ("id" text not null, "customer_id" text not null, "kind" text check ("kind" in ('earn', 'refund', 'expire')) not null, "points" integer not null, "source_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "points_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_points_entry_customer_id" ON "points_entry" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_points_entry_deleted_at" ON "points_entry" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_points_entry_kind_source_id_unique" ON "points_entry" ("kind", "source_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "points_entry" cascade;`);
  }

}
