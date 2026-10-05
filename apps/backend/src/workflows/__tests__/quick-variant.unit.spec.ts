import { addedOptionValue, planOptionChange, removeAddedOptionValue } from "../quick-variant"

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

describe("removeAddedOptionValue", () => {
  const store = (found: { id: string }[]) => ({
    listProductOptionValues: jest.fn().mockResolvedValue(found),
    deleteProductOptionValues: jest.fn().mockResolvedValue(undefined),
  })
  it("deletes only the value created for that option", async () => {
    const service = store([{ id: "optval_9" }])
    await removeAddedOptionValue(service, { option_id: "opt_1", value: "Small" })
    expect(service.listProductOptionValues).toHaveBeenCalledWith({ option_id: "opt_1", value: "Small" }, { select: ["id"] })
    expect(service.deleteProductOptionValues).toHaveBeenCalledWith(["optval_9"])
  })
  it("does nothing when the value is already gone", async () => {
    const service = store([])
    await removeAddedOptionValue(service, { option_id: "opt_1", value: "Small" })
    expect(service.deleteProductOptionValues).not.toHaveBeenCalled()
  })
})
