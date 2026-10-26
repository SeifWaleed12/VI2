// Uses local connection credentials in memory; never points Medusa at the live database.
const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { createRequire } = require("node:module")
const root = path.resolve(__dirname, "../../../..")
const req = createRequire(path.join(root, "package.json"))
const { Client } = req("pg")
const dotenv = req("dotenv")
const sourceEnv = process.env.VI2_TEST_ENV_FILE
if (!sourceEnv) throw new Error("Set VI2_TEST_ENV_FILE to the local backend env file; values are never printed")
const parsed = dotenv.parse(fs.readFileSync(sourceEnv))
const source = new URL(parsed.DATABASE_URL)
const env = { ...process.env, NODE_ENV: "test", REDIS_URL: "", RESEND_API_KEY: "", RESEND_FROM: "", S3_ACCESS_KEY_ID: "", S3_SECRET_ACCESS_KEY: "",
 JWT_SECRET: "reviews-isolated-test-secret", COOKIE_SECRET: "reviews-isolated-cookie-secret", STORE_CORS: "http://localhost:3000", ADMIN_CORS: "http://localhost:9000", AUTH_CORS: "http://localhost:3000", STOREFRONT_URL: "http://localhost:3000",
 DB_HOST: source.hostname, DB_PORT: source.port || "5432", DB_USERNAME: decodeURIComponent(source.username), DB_PASSWORD: decodeURIComponent(source.password) }
const mode = process.argv[2]
if (!["generate", "test"].includes(mode)) throw new Error("Choose generate or test")
const database = mode === "generate" ? "vi2_reviews_schema_20261026" : "vi2_reviews_http_20261026"
source.pathname = "/postgres"
async function main() {
 const client = new Client({ connectionString: source.toString(), connectionTimeoutMillis: 5000 })
 await client.connect()
 let owned = false
 const names = [database, database + "-template"]
 try {
  const existing = await client.query("select datname from pg_database where datname = any($1)", [names])
  if (existing.rows.length) throw new Error("The named disposable database already exists; refuse to replace it")
  owned = true
  const target = new URL(source); target.pathname = "/" + database
  env.DATABASE_URL = target.toString()
  let args
  if (mode === "generate") {
   await client.query('CREATE DATABASE "' + database + '"')
   const cli = path.join(path.dirname(req.resolve("@medusajs/cli/package.json")), "cli.js")
   args = [cli, "db:generate", "productReview"]
  } else {
   args = ["--experimental-vm-modules", req.resolve("jest/bin/jest"), "--config", "jest.integration.config.js", "--runInBand", "--testPathPattern=integration-tests/http/product-reviews.spec.ts"]
  }
  const child = spawnSync(process.execPath, args, { cwd: path.join(root, "apps/backend"), env, stdio: "inherit" })
  process.exitCode = child.status ?? 1
 } finally {
  // Both names were verified absent before this run and belong only to this probe.
  for (const name of owned ? names : []) {
   await client.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()", [name])
   await client.query('DROP DATABASE IF EXISTS "' + name + '"')
  }
  console.log(owned ? "Disposable review database and template removed" : "Existing database and template preserved")
  await client.end()
 }
}
main().catch(error => { console.error(error.code || error.name, "Native review probe failed; connection details withheld"); process.exitCode = 1 })
