import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Brand logos are PNG, JPEG or WebP up to 1 MB (Seif, 2026-10-26). The type
// is read from the file's first bytes, not from its name or the browser's
// claim. SVG is refused: it can carry script, and uploads are served from the
// same address as the admin.
export const MAX_LOGO_BYTES = 1024 * 1024

const KINDS = [
  { mimeType: "image/png", extension: "png", matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: "image/jpeg", extension: "jpg", matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mimeType: "image/webp", extension: "webp", matches: (b: Buffer) => b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" },
]

export type LogoProblem = "too_large" | "not_an_image"

export function logoImage(bytes: Buffer): { mimeType: string, extension: string } | LogoProblem {
  if (bytes.length > MAX_LOGO_BYTES) return "too_large"
  const kind = KINDS.find((k) => k.matches(bytes))
  return kind ? { mimeType: kind.mimeType, extension: kind.extension } : "not_an_image"
}

// Deletes a brand's logo file once the brand no longer points to it (replaced,
// removed, or the brand deleted). An undeleted file only costs storage, so a
// failure is logged, not returned.
export async function deleteBrandLogoFile(container: MedusaContainer, fileId: string | null | undefined) {
  if (!fileId) return
  try {
    await container.resolve(Modules.FILE).deleteFiles(fileId)
  } catch {
    container.resolve(ContainerRegistrationKeys.LOGGER).warn(`Could not delete brand logo file ${fileId}`)
  }
}
