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
import { useEffect, useState } from "react"

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
  logo: string
  country: string
  status: string
}

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  logo: "",
  country: "",
  status: "active",
}

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
      logo: brand.logo || "",
      country: brand.country || "",
      status: brand.status,
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
          logo: form.logo.trim() || null,
          country: form.country.trim() || null,
          status: form.status,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Request failed")

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

            {/* Logo URL + Country + Status row */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 2 }}>
                <Label htmlFor="brand-logo" style={{ display: "block", marginBottom: "4px" }}>
                  Logo URL
                </Label>
                <Input
                  id="brand-logo"
                  placeholder="e.g. /brands/optimum-nutrition.png"
                  value={form.logo}
                  onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
                />
              </div>
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
                      <Text
                        size="small"
                        style={{
                          fontFamily: "monospace",
                          color: "var(--fg-muted)",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                      >
                        {brand.logo}
                      </Text>
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

export const config = defineRouteConfig({
  label: "Brands",
  icon: Tag,
})

export default BrandsPage
