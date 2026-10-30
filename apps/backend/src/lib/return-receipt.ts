export function returnReceiptProblem(shipped: number, received: number, damaged: number, incoming: number): string | null {
  if (![shipped, received, damaged, incoming].every(Number.isFinite) || shipped < 0 || received < 0 || damaged < 0 || incoming <= 0) return "The return quantities could not be checked."
  if (received + damaged + incoming > shipped) return "Mark the items as shipped before receiving their return. Already returned units cannot be received again."
  return null
}
