export const MAX_CSV_UPLOAD_BYTES = 10 * 1024 * 1024

export function isCsvUpload(filename: unknown, mimeType: unknown): boolean {
  return typeof filename === "string" && /\.csv$/i.test(filename)
    && typeof mimeType === "string" && ["text/csv", "application/vnd.ms-excel"].includes(mimeType.toLowerCase())
}
