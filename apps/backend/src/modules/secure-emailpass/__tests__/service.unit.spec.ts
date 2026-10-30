import { MedusaError } from "@medusajs/framework/utils"
import scrypt from "scrypt-kdf"
import SecureEmailpassService from "../service"
import { CREDENTIAL_CLAIM, credentialStamp } from "../../../lib/security-session"

jest.mock("scrypt-kdf", () => ({ verify: jest.fn(async () => true), kdf: jest.fn(async () => Buffer.from("new-dummy-hash")) }))
const secret = "provider-unit-test-secret"
const provider = () => new SecureEmailpassService({ logger: {} as never }, { credentialStampSecret: secret })

it("stamps the exact password verified by the native provider, without exposing it", async () => {
  const identity = { id: "auth_1", app_metadata: { customer_id: "cus_1" }, provider_identities: [{ provider: "emailpass", provider_metadata: { password: "aGFzaDE=" } }] }
  const service = { retrieve: jest.fn(async () => JSON.parse(JSON.stringify(identity))) }
  jest.mocked(scrypt.verify).mockImplementationOnce(async () => {
    identity.provider_identities[0].provider_metadata.password = "aGFzaDI="
    return true
  })
  const result = await provider().authenticate({ body: { email: "one@example.test", password: "dummy-password" } } as never, service as never)
  expect(result.success).toBe(true)
  expect(result.authIdentity?.app_metadata?.[CREDENTIAL_CLAIM]).toBe(credentialStamp("aGFzaDE=", secret))
  expect(result.authIdentity?.provider_identities?.[0].provider_metadata?.password).toBeUndefined()
})

it("stamps newly registered credentials using native hashing and persistence", async () => {
  const service = {
    retrieve: jest.fn(async () => { throw new MedusaError(MedusaError.Types.NOT_FOUND, "not found") }),
    create: jest.fn(async data => ({ id: "auth_new", app_metadata: {}, provider_identities: [{ provider: "emailpass", provider_metadata: data.provider_metadata }] })),
  }
  const result = await provider().register({ body: { email: "new@example.test", password: "dummy-password" } } as never, service as never)
  expect(result.success).toBe(true)
  expect(result.authIdentity?.app_metadata?.[CREDENTIAL_CLAIM]).toBe(credentialStamp(Buffer.from("new-dummy-hash").toString("base64"), secret))
  expect(service.create).toHaveBeenCalledTimes(1)
  expect(result.authIdentity?.provider_identities?.[0].provider_metadata?.password).toBeUndefined()
})
