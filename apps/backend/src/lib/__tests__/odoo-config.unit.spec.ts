import { odooModules } from "../odoo-config"

const odooEnv = {
  ODOO_URL: " https://vi2.odoo.com/ ",
  ODOO_DB: "vi2",
  ODOO_LOGIN: "sync@example.com",
  ODOO_API_KEY: "key",
}

it("loads the Odoo module when every ODOO variable is set", () => {
  expect(odooModules(odooEnv)).toEqual([{
    resolve: "./src/modules/odoo",
    options: { url: "https://vi2.odoo.com", db: "vi2", login: "sync@example.com", apiKey: "key" },
  }])
  expect(odooModules({ ...odooEnv, NODE_ENV: "production" })).toHaveLength(1)
})

it("leaves Odoo out without ODOO variables, and always in tests", () => {
  expect(odooModules({})).toEqual([])
  expect(odooModules({ NODE_ENV: "production" })).toEqual([])
  expect(odooModules({ ODOO_URL: "  " })).toEqual([])
  expect(odooModules({ ...odooEnv, NODE_ENV: "test" })).toEqual([])
})

it("refuses a partial setup", () => {
  expect(() => odooModules({ ...odooEnv, ODOO_API_KEY: "" })).toThrow("Set all of ODOO_URL")
})

it("refuses an address that is not a web address", () => {
  expect(() => odooModules({ ...odooEnv, ODOO_URL: "vi2.odoo.com" })).toThrow("ODOO_URL must be a full address")
  expect(() => odooModules({ ...odooEnv, ODOO_URL: "ftp://vi2.odoo.com" })).toThrow("ODOO_URL must use https:")
})

it("allows plain http only to this machine, in every environment", () => {
  for (const url of ["http://localhost:8069", "http://127.0.0.1:8069", "http://[::1]:8069"]) {
    expect(odooModules({ ...odooEnv, ODOO_URL: url })[0].options.url).toBe(url)
  }
  expect(() => odooModules({ ...odooEnv, ODOO_URL: "http://vi2.odoo.com" })).toThrow("ODOO_URL must use https:")
  expect(() => odooModules({ ...odooEnv, ODOO_URL: "http://staging.example.com:8069" })).toThrow("ODOO_URL must use https:")
  expect(() => odooModules({ ...odooEnv, ODOO_URL: "http://localhost.example.com" })).toThrow("ODOO_URL must use https:")
  expect(() => odooModules({ ...odooEnv, ODOO_URL: "http://vi2.odoo.com", NODE_ENV: "production" })).toThrow("ODOO_URL must use https:")
})
