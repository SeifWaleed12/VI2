import { optionCombinations } from "../variant-combinations"

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
