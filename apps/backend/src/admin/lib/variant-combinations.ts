export type OptionInput = { title: string, values: string[] }

// The most variants one save accepts (newProductSchema in src/api/validators.ts).
export const MAX_VARIANTS = 100

// How many variants the options make, without building them.
export function combinationCount(options: OptionInput[]): number {
  return options.length ? options.reduce((total, option) => total * option.values.length, 1) : 0
}

// Every combination of the options' values, for example Flavor x Size, as the
// option map a variant needs ({ Flavor: "Chocolate", Size: "1 kg" }).
export function optionCombinations(options: OptionInput[]): Record<string, string>[] {
  if (!options.length) return []
  return options.reduce<Record<string, string>[]>(
    (rows, option) => rows.flatMap((row) => option.values.map((value) => ({ ...row, [option.title]: value }))),
    [{}]
  )
}
