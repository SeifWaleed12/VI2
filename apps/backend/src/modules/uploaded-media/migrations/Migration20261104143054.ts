import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261104143054 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "uploaded_media" ("id" text not null, "url" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "uploaded_media_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_uploaded_media_deleted_at" ON "uploaded_media" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_uploaded_media_created_at" ON "uploaded_media" ("created_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "uploaded_media" cascade;`);
  }

}
