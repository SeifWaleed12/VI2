import { discardAuthIdentity } from "../discard-auth-identity"

const auth = { deleteAuthIdentities: jest.fn() }
const logger = { error: jest.fn() }
const container = { resolve: (key: string) => (key === "auth" ? auth : logger) } as never

beforeEach(() => jest.clearAllMocks())

it("deletes the identity", async () => {
  await discardAuthIdentity(container, "auth_test")
  expect(auth.deleteAuthIdentities).toHaveBeenCalledWith(["auth_test"])
  expect(logger.error).not.toHaveBeenCalled()
})

it("logs a reference, not the failure's details, when deleting fails", async () => {
  auth.deleteAuthIdentities.mockRejectedValueOnce(new Error("private provider secret"))
  await discardAuthIdentity(container, "auth_test")
  expect(logger.error).toHaveBeenCalledWith("Failed to compensate auth identity auth_test after customer creation failure")
})
