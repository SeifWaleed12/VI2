import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { Tag } from "lucide-react"
import { useEffect, useRef, useState, type DragEvent } from "react"

type Brand = {
  id: string
  name: string
  slug: string
  description?: string | null
  logo?: string | null
  country?: string | null
  status: string
}

type FormState = {
  name: string
  slug: string
  description: string
  country: string
  status: string
  // The saved logo's address; a newly picked file and a removal wait for Save.
  logo: string
  logoFile: File | null
  removeLogo: boolean
}

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  country: "",
  status: "active",
  logo: "",
  logoFile: null,
  removeLogo: false,
}

// The server checks the file's real type and size again (lib/brand-logo.ts).
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_LOGO_BYTES = 1024 * 1024
const logoProblem = (file: File) =>
  !LOGO_TYPES.includes(file.type) ? "The logo must be a PNG, JPG or WebP image."
    : file.size > MAX_LOGO_BYTES ? "The logo must be 1 MB or smaller." : null

const base64Of = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
  reader.onerror = () => reject(new Error("The logo file could not be read."))
  reader.readAsDataURL(file)
})

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const BrandsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchBrands = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/brands", { credentials: "include" })
      const data = await res.json()
      setBrands(data.brands || [])
    } catch {
      toast.error("Error", { description: "Failed to load brands." })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (brand: Brand) => {
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || "",
      country: brand.country || "",
      status: brand.status,
      logo: brand.logo || "",
      logoFile: null,
      removeLogo: false,
    })
    setEditingId(brand.id)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleNameChange = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: editingId ? f.slug : slugify(value),
    }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Validation", { description: "Name and Slug are required." })
      return
    }

    setSubmitting(true)
    try {
      const isEditing = !!editingId
      const url = isEditing ? `/admin/brands/${editingId}` : "/admin/brands"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
          country: form.country.trim() || null,
          status: form.status,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Request failed")
      // A new brand exists now: a failed logo upload below can be retried as an edit.
      setEditingId(data.brand.id)

      if (form.logoFile) {
        const logo = await fetch(`/admin/brands/${data.brand.id}/logo`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: await base64Of(form.logoFile) }),
        })
        if (!logo.ok) throw new Error(`Brand saved, but the logo was not: ${(await logo.json().catch(() => ({}))).message || "upload failed"}`)
      } else if (form.removeLogo) {
        const logo = await fetch(`/admin/brands/${data.brand.id}/logo`, { method: "DELETE", credentials: "include" })
        if (!logo.ok) throw new Error("Brand saved, but the logo was not removed.")
      }

      toast.success(isEditing ? "Brand Updated" : "Brand Created", {
        description: `"${form.name}" has been ${isEditing ? "updated" : "created"} successfully.`,
      })
      closeForm()
      fetchBrands()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      toast.error("Failed", { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete "${brand.name}"?`)) return

    setDeletingId(brand.id)
    try {
      const res = await fetch(`/admin/brands/${brand.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Delete failed")
      }
      toast.success("Brand Deleted", {
        description: `"${brand.name}" has been removed.`,
      })
      fetchBrands()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed"
      toast.error("Failed", { description: msg })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1100px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <Heading level="h1">Brands</Heading>
          <Text size="small" style={{ color: "var(--fg-muted)", marginTop: "4px" }}>
            Manage brands that appear in the storefront menu and product catalog.
          </Text>
        </div>
        <Button variant="primary" size="small" onClick={openCreate}>
          + Add Brand
        </Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Container style={{ marginBottom: "24px" }}>
          <Heading level="h2" style={{ marginBottom: "16px" }}>
            {editingId ? "Edit Brand" : "New Brand"}
          </Heading>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Name + Slug row */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <Label htmlFor="brand-name" style={{ display: "block", marginBottom: "4px" }}>
                  Name *
                </Label>
                <Input
                  id="brand-name"
                  placeholder="e.g. Optimum Nutrition"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label htmlFor="brand-slug" style={{ display: "block", marginBottom: "4px" }}>
                  Slug *
                </Label>
                <Input
                  id="brand-slug"
                  placeholder="e.g. optimum-nutrition"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="brand-desc" style={{ display: "block", marginBottom: "4px" }}>
                Description
              </Label>
              <Input
                id="brand-desc"
                placeholder="Short description of the brand"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <LogoField form={form} setForm={setForm} />

            {/* Country + Status row */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <Label htmlFor="brand-country" style={{ display: "block", marginBottom: "4px" }}>
                  Country
                </Label>
                <Input
                  id="brand-country"
                  placeholder="e.g. USA"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label htmlFor="brand-status" style={{ display: "block", marginBottom: "4px" }}>
                  Status
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm((f) => ({ ...f, status: val }))}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="active">Active</Select.Item>
                    <Select.Item value="inactive">Inactive</Select.Item>
                  </Select.Content>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px" }}>
              <Button variant="secondary" size="small" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={submitting}
              >
                {editingId ? "Save Changes" : "Create Brand"}
              </Button>
            </div>
          </div>
        </Container>
      )}

      {/* Brands Table */}
      <Container>
        {loading ? (
          <Text style={{ padding: "16px", color: "var(--fg-muted)" }}>Loading brands…</Text>
        ) : brands.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--fg-muted)",
            }}
          >
            <Text>No brands yet. Click &quot;+ Add Brand&quot; to create your first one.</Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Slug</Table.HeaderCell>
                <Table.HeaderCell>Country</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Logo</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {brands.map((brand) => (
                <Table.Row key={brand.id}>
                  <Table.Cell>
                    <Text weight="plus">{brand.name}</Text>
                    {brand.description && (
                      <Text size="small" style={{ color: "var(--fg-muted)" }}>
                        {brand.description}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" style={{ fontFamily: "monospace", color: "var(--fg-muted)" }}>
                      {brand.slug}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">{brand.country || "—"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={brand.status === "active" ? "green" : "grey"} size="xsmall">
                      {brand.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {brand.logo ? (
                      <img src={brand.logo} alt={`${brand.name} logo`} style={{ width: "40px", height: "40px", objectFit: "contain", display: "block" }} />
                    ) : (
                      <Text size="small" style={{ color: "var(--fg-muted)" }}>
                        —
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <Button variant="secondary" size="small" onClick={() => openEdit(brand)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDelete(brand)}
                        isLoading={deletingId === brand.id}
                        disabled={!!deletingId}
                      >
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  )
}

// Pick or drop a logo; it shows at once and is uploaded when the brand is saved.
const LogoField = ({ form, setForm }: { form: FormState, setForm: (update: (f: FormState) => FormState) => void }) => {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!form.logoFile) return setPreview(null)
    const url = URL.createObjectURL(form.logoFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [form.logoFile])

  const shown = preview ?? (form.removeLogo ? null : form.logo || null)
  const pick = (file: File | undefined) => {
    if (!file) return
    const problem = logoProblem(file)
    if (problem) return void toast.error("Logo not added", { description: problem })
    setForm((f) => ({ ...f, logoFile: file, removeLogo: false }))
  }
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    pick(event.dataTransfer.files[0])
  }

  return (
    <div>
      <Label htmlFor="brand-logo" style={{ display: "block", marginBottom: "4px" }}>
        Logo
      </Label>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
          style={{
            width: "96px", height: "96px", flex: "0 0 96px", display: "grid", placeItems: "center",
            border: "1px dashed var(--border-strong)", borderRadius: "8px", background: "var(--bg-subtle)",
          }}
        >
          {shown
            ? <img src={shown} alt="Brand logo preview" style={{ maxWidth: "84px", maxHeight: "84px", objectFit: "contain" }} />
            : <Text size="xsmall" style={{ color: "var(--fg-muted)", textAlign: "center" }}>Drop logo here</Text>}
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" size="small" type="button" onClick={() => input.current?.click()}>
              {shown ? "Replace logo" : "Upload logo"}
            </Button>
            {shown && (
              <Button
                variant="transparent"
                size="small"
                type="button"
                onClick={() => setForm((f) => ({ ...f, logoFile: null, removeLogo: !!f.logo }))}
              >
                Remove
              </Button>
            )}
          </div>
          <Text size="xsmall" style={{ color: "var(--fg-muted)" }}>
            PNG, JPG or WebP, up to 1 MB. Saved with the brand.
          </Text>
        </div>
        <input
          ref={input}
          id="brand-logo"
          type="file"
          accept={LOGO_TYPES.join(",")}
          hidden
          onChange={(event) => {
            pick(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Brands",
  icon: Tag,
})

export default BrandsPage
