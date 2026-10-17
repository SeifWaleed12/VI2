export type OptionInput = { title: string, values: string[] }

// Every combination of the options' values, for example Flavor x Size, as the
// option map a variant needs ({ Flavor: "Chocolate", Size: "1 kg" }).
export function optionCombinations(options: OptionInput[]): Record<string, string>[] {
  if (!options.length) return []
  return options.reduce<Record<string, string>[]>(
    (rows, option) => rows.flatMap((row) => option.values.map((value) => ({ ...row, [option.title]: value }))),
    [{}]
  )
}
