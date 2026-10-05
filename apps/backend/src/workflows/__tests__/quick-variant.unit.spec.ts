import { planOptionChange } from "../quick-variant"

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
