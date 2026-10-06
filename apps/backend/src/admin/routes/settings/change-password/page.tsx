import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, Text, toast } from "@medusajs/ui"
import { useState } from "react"

// The password rule and the attempt limit are enforced by the server; this page
// only checks that the two new passwords match.
const ChangePasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPassword !== repeatPassword) {
      toast.error("Passwords do not match", { description: "Type the same new password twice." })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/admin/users/me/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "The password could not be changed.")
      toast.success("Password changed", { description: "Use your new password next time you sign in." })
      setCurrentPassword("")
      setNewPassword("")
      setRepeatPassword("")
    } catch (err: unknown) {
      toast.error("Password not changed", { description: err instanceof Error ? err.message : "Something went wrong" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Change password</Heading>
        <Text size="small" className="text-ui-fg-subtle">At least 8 characters.</Text>
      </div>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-y-4 px-6 py-4">
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" type="password" autoComplete="current-password" required
            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor="repeat-password">Repeat new password</Label>
          <Input id="repeat-password" type="password" autoComplete="new-password" required
            value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
        </div>
        <div>
          <Button type="submit" size="small" isLoading={submitting}>Change password</Button>
        </div>
      </form>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Change password",
})

export default ChangePasswordPage
