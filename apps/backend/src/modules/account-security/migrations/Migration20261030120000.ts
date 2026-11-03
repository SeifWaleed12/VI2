import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261030120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "security_session" ("id" text not null, "auth_identity_id" text not null, "credential_stamp" text not null, "expires_at" timestamptz not null, "revoked" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "security_session_pkey" primary key ("id"));`)
    this.addSql(`create index if not exists "IDX_security_session_expiry" on "security_session" ("expires_at") where "deleted_at" is null;`)
    this.addSql(`create index if not exists "IDX_security_session_deleted_at" on "security_session" ("deleted_at") where "deleted_at" is null;`)
  }
  override async down(): Promise<void> {
    this.addSql(`drop table if exists "security_session";`)
  }
}
