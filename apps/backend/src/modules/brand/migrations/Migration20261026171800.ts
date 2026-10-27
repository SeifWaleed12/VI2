import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261026171800 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" add column if not exists "logo_file_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop column if exists "logo_file_id";`);
  }

}
