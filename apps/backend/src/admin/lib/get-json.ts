// Reads an admin API answer. An error answer rejects too, so a failed load shows
// its error instead of looking like an empty list.
export const getJson = (path: string) => fetch(path, { credentials: "include" })
  .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${path} answered ${res.status}`))))

// Reads every page of an admin list (`path` already has a query with its limit);
// Medusa answers at most `limit` rows at a time.
export const getAll = async <T>(path: string, key: string): Promise<T[]> => {
  const rows: T[] = []
  for (;;) {
    const body = await getJson(`${path}&offset=${rows.length}`)
    const page: T[] = body[key] ?? []
    rows.push(...page)
    if (!page.length || rows.length >= body.count) return rows
  }
}
