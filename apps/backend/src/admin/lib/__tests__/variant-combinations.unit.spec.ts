import { combinationCount, MAX_VARIANTS, optionCombinations } from "../variant-combinations"

describe("combinationCount", () => {
  it("counts combinations without building them", () => {
    const fifty = Array.from({ length: 50 }, (_, index) => `v${index}`)
    expect(combinationCount([{ title: "A", values: fifty }, { title: "B", values: fifty }, { title: "C", values: fifty }])).toBe(125000)
    expect(combinationCount([{ title: "Size", values: ["1 kg", "2 kg"] }, { title: "Flavor", values: ["Choc"] }])).toBe(2)
    expect(combinationCount([])).toBe(0)
  })

  it("matches the server's variant limit", () => {
    expect(MAX_VARIANTS).toBe(100)
  })
})

describe("optionCombinations", () => {
  it("returns every combination of two options, first option first", () => {
    expect(optionCombinations([
      { title: "Flavor", values: ["Chocolate", "Vanilla"] },
      { title: "Size", values: ["1 kg", "2.27 kg"] },
    ])).toEqual([
      { Flavor: "Chocolate", Size: "1 kg" },
      { Flavor: "Chocolate", Size: "2.27 kg" },
      { Flavor: "Vanilla", Size: "1 kg" },
      { Flavor: "Vanilla", Size: "2.27 kg" },
    ])
  })

  it("returns one row per value for a single option", () => {
    expect(optionCombinations([{ title: "Size", values: ["1 kg"] }])).toEqual([{ Size: "1 kg" }])
  })

  it("returns no rows without options or when an option has no values", () => {
    expect(optionCombinations([])).toEqual([])
    expect(optionCombinations([{ title: "Size", values: ["1 kg"] }, { title: "Flavor", values: [] }])).toEqual([])
  })
})
