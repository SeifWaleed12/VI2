// Reads an admin API answer. An error answer rejects too, so a failed load shows
// its error instead of looking like an empty list.
export const getJson = (path: string) => fetch(path, { credentials: "include" })
  .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${path} answered ${res.status}`))))
