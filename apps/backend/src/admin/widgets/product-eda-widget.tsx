import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Input, Label, Switch, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type EdaRegistration = { registration_number: string; is_approved: boolean }

type WidgetProps = { data: { id: string } }

// Shows and edits the product's EDA registration number and approval. The
// server validates the input; this widget only collects it.
const ProductEdaWidget = ({ data }: WidgetProps) => {
  const path = `/admin/products/${data.id}/eda`
  const [saved, setSaved] = useState<EdaRegistration | null>(null)
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [isApproved, setIsApproved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const show = (registration: EdaRegistration | null) => {
    setSaved(registration)
    setRegistrationNumber(registration?.registration_number ?? "")
    setIsApproved(registration?.is_approved ?? false)
  }

  useEffect(() => {
    let active = true
    fetch(path, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => { if (active) show(body.eda_registration ?? null) })
      .catch(() => toast.error("Could not load the EDA registration"))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [path])

  const send = async (method: "POST" | "DELETE") => {
    setBusy(true)
    try {
      const res = await fetch(path, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ registration_number: registrationNumber, is_approved: isApproved }) : undefined,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || "The EDA registration could not be saved.")
      show(body.eda_registration ?? null)
      toast.success(method === "POST" ? "EDA registration saved" : "EDA registration removed")
    } catch (err: unknown) {
      toast.error("Not saved", { description: err instanceof Error ? err.message : "Something went wrong" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">EDA registration</Heading>
        {saved && <Badge color={saved.is_approved ? "green" : "orange"}>{saved.is_approved ? "Approved" : "Not approved"}</Badge>}
      </div>
      {loading ? (
        <Text size="small" className="text-ui-fg-subtle px-6 py-4">Loading...</Text>
      ) : (
        <div className="flex flex-col gap-y-4 px-6 py-4">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="eda-number">Registration number</Label>
            <Input id="eda-number" value={registrationNumber} maxLength={100}
              onChange={(e) => setRegistrationNumber(e.target.value)} />
          </div>
          <div className="flex items-center gap-x-2">
            <Switch id="eda-approved" checked={isApproved} onCheckedChange={setIsApproved} />
            <Label htmlFor="eda-approved">Approved by EDA</Label>
          </div>
          <div className="flex gap-x-2">
            <Button size="small" isLoading={busy} onClick={() => send("POST")}>Save</Button>
            {saved && <Button size="small" variant="secondary" disabled={busy} onClick={() => send("DELETE")}>Remove</Button>}
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductEdaWidget
