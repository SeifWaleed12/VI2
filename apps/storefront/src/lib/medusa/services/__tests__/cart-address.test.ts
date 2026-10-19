import { setCartAddress } from "../cart"
import { medusa } from "../../client"

jest.mock("../../client", () => ({ medusa: { store: { cart: { update: jest.fn() } } } }))

const address = { firstName: "Sara", lastName: "Ali", address1: "Tahrir Square", city: "Cairo", countryCode: "EG", phone: "01000000000" }

it("leaves out a postal code the shopper did not give, instead of a fake 00000", async () => {
  jest.mocked(medusa.store.cart.update).mockResolvedValue({ cart: { id: "cart_1", items: [] } } as never)
  await setCartAddress("cart_1", "sara@test.dev", address)
  const [, payload] = jest.mocked(medusa.store.cart.update).mock.calls[0] as [string, Record<string, Record<string, string>>]
  expect(payload.shipping_address).toEqual({ first_name: "Sara", last_name: "Ali", address_1: "Tahrir Square", city: "Cairo", country_code: "eg", phone: "01000000000" })
  expect(payload.billing_address).toEqual(payload.shipping_address)
  await setCartAddress("cart_1", "sara@test.dev", { ...address, postalCode: " 11511 " })
  expect((jest.mocked(medusa.store.cart.update).mock.calls[1] as [string, Record<string, Record<string, string>>])[1].shipping_address.postal_code).toBe("11511")
})
