import { MedusaError } from "@medusajs/framework/utils"
import { addedOptionValue, planOptionChange, removeCreatedOptionValue, snapshotOptionValues } from "../quick-variant"

const sizes = [{ id: "opt_1", title: "Size", values: [{ value: "Large" }] }]

it("creates the option with its value when the product has no such option", () => {
  expect(planOptionChange([], "Flavor", "Vanilla")).toEqual({
    option_title: "Flavor",
    option_value: "Vanilla",
    change: { add: [{ title: "Flavor", values: ["Vanilla"] }] },
  })
})
it("adds only the missing value to an existing option", () => {
  expect(planOptionChange(sizes, "Size", "Small")).toEqual({
    option_title: "Size",
    option_value: "Small",
    change: { update: [{ product_option_id: "opt_1", add: [{ value: "Small" }] }] },
  })
})
it("changes nothing when the option and value already exist", () => {
  expect(planOptionChange(sizes, "Size", "Large").change).toBeNull()
})
it("matches case-insensitively and reuses the stored spelling", () => {
  expect(planOptionChange(sizes, "size", "LARGE")).toEqual({ option_title: "Size", option_value: "Large", change: null })
  expect(planOptionChange(sizes, "SIZE", "Small").option_title).toBe("Size")
})
it("treats an option without values as needing the value added", () => {
  expect(planOptionChange([{ id: "opt_2", title: "Color" }], "Color", "Red").change).toEqual({
    update: [{ product_option_id: "opt_2", add: [{ value: "Red" }] }],
  })
})

describe("addedOptionValue", () => {
  it("names the value created on an existing option", () => {
    expect(addedOptionValue(planOptionChange(sizes, "Size", "Small"))).toEqual({ option_id: "opt_1", value: "Small" })
  })
  it("is null for a new option, which Medusa removes as a whole", () => {
    expect(addedOptionValue(planOptionChange([], "Flavor", "Vanilla"))).toBeNull()
  })
  it("is null when the value already exists, so nothing created is ever removed", () => {
    expect(addedOptionValue(planOptionChange(sizes, "Size", "Large"))).toBeNull()
  })
})

describe("snapshotOptionValues and removeCreatedOptionValue", () => {
  const store = (found: { id: string }[], softDelete = jest.fn().mockResolvedValue([])) => ({
    listProductOptionValues: jest.fn().mockResolvedValue(found),
    softDeleteProductOptionValues: softDelete,
  })
  const added = { option_id: "opt_1", value: "Small" }

  it("records every value the option already holds, not only a first page", async () => {
    const service = store([{ id: "optval_1" }, { id: "optval_2" }])
    expect(await snapshotOptionValues(service, added)).toEqual({ ...added, existing_ids: ["optval_1", "optval_2"] })
    expect(service.listProductOptionValues).toHaveBeenCalledWith({ option_id: "opt_1" }, { select: ["id"], take: null })
  })
  it("deletes only a value that was not in the snapshot", async () => {
    const service = store([{ id: "optval_old" }, { id: "optval_new" }])
    await removeCreatedOptionValue(service, { ...added, existing_ids: ["optval_old"] })
    expect(service.softDeleteProductOptionValues).toHaveBeenCalledWith(["optval_new"])
  })
  it("never deletes a value that already existed", async () => {
    const service = store([{ id: "optval_old" }])
    await removeCreatedOptionValue(service, { ...added, existing_ids: ["optval_old"] })
    expect(service.softDeleteProductOptionValues).not.toHaveBeenCalled()
  })
  it("keeps a value that Medusa refuses to delete because a product uses it", async () => {
    const refused = jest.fn().mockRejectedValue(new MedusaError(MedusaError.Types.INVALID_DATA, "Cannot delete product option values that are associated with products."))
    await expect(removeCreatedOptionValue(store([{ id: "optval_new" }], refused), { ...added, existing_ids: [] })).resolves.toBeUndefined()
  })
  it("still raises an unexpected failure", async () => {
    const broken = jest.fn().mockRejectedValue(new Error("database unavailable"))
    await expect(removeCreatedOptionValue(store([{ id: "optval_new" }], broken), { ...added, existing_ids: [] })).rejects.toThrow("database unavailable")
  })
})
