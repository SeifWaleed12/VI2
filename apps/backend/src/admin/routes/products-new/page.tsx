import { Button, Checkbox, Container, Heading, Input, Label, Select, Switch, Text, Textarea, toast } from "@medusajs/ui"
import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { optionCombinations } from "../../lib/variant-combinations"

type Brand = { id: string, name: string }
type Category = { id: string, name: string, parent_category_id: string | null }
type OptionRow = { title: string, values: string }
type Cell = { sku: string, barcode: string, price: string }

const NO_BRAND = "none"
const emptyCell: Cell = { sku: "", barcode: "", price: "" }
const rowKey = (combination: Record<string, string>) => JSON.stringify(combination)
const splitValues = (text: string) => [...new Set(text.split(",").map((value) => value.trim()).filter(Boolean))]

const getJson = (path: string) => fetch(path, { credentials: "include" }).then((res) => res.json())

const Field = ({ id, label, error, children }: { id: string, label: string, error?: string, children: ReactNode }) => (
  <div className="flex flex-col gap-y-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {error && <Text size="small" className="text-ui-fg-error">{error}</Text>}
  </div>
)

// One form that creates a product with everything the shop needs. The server
// (POST /admin/vi2-products) validates and saves it in one workflow; this page
// only collects the input and shows the server's messages next to the fields.
const NewProductPage = () => {
  const navigate = useNavigate()
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [title, setTitle] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [description, setDescription] = useState("")
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [status, setStatus] = useState("draft")
  const [weight, setWeight] = useState("")
  const [discountable, setDiscountable] = useState(true)
  const [brandId, setBrandId] = useState(NO_BRAND)
  const [edaNumber, setEdaNumber] = useState("")
  const [edaApproved, setEdaApproved] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [options, setOptions] = useState<OptionRow[]>([{ title: "", values: "" }])
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [removed, setRemoved] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getJson("/admin/brands?status=active").then((body) => setBrands(body.brands ?? []))
      .catch(() => toast.error("Could not load brands"))
    getJson("/admin/product-categories?limit=500&fields=id,name,parent_category_id").then((body) => setCategories(body.product_categories ?? []))
      .catch(() => toast.error("Could not load categories"))
  }, [])

  const categoryLabel = (category: Category) => {
    const parent = categories.find((candidate) => candidate.id === category.parent_category_id)
    return parent ? `${parent.name} › ${category.name}` : category.name
  }
  const sortedCategories = [...categories].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)))

  const parsedOptions = options.map((option) => ({ title: option.title.trim(), values: splitValues(option.values) }))
  const rows = optionCombinations(parsedOptions.filter((option) => option.title && option.values.length))
    .filter((combination) => !removed.includes(rowKey(combination)))

  const setCell = (key: string, field: keyof Cell, value: string) =>
    setCells((current) => ({ ...current, [key]: { ...(current[key] ?? emptyCell), [field]: value } }))
  const setOption = (index: number, field: keyof OptionRow, value: string) => {
    setOptions((current) => current.map((option, i) => (i === index ? { ...option, [field]: value } : option)))
    setRemoved([])
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const form = new FormData()
      for (const file of Array.from(files)) form.append("files", file)
      const res = await fetch("/admin/uploads", { method: "POST", credentials: "include", body: form })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || "Upload failed")
      setImages((current) => [...current, ...body.files.map((file: { url: string }) => file.url)])
    } catch (err: unknown) {
      toast.error("Images not uploaded", { description: err instanceof Error ? err.message : "Something went wrong" })
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setErrors({})
    setMessage("")
    const keys = rows.map(rowKey)
    try {
      const res = await fetch("/admin/vi2-products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          title_ar: titleAr.trim() || undefined,
          description: description.trim() || undefined,
          category_ids: categoryIds,
          status,
          weight: weight === "" ? undefined : Number(weight),
          discountable,
          brand_id: brandId === NO_BRAND ? undefined : brandId,
          eda: edaNumber.trim() ? { registration_number: edaNumber, is_approved: edaApproved } : undefined,
          images,
          options: parsedOptions,
          variants: rows.map((combination) => {
            const cell = cells[rowKey(combination)] ?? emptyCell
            return { options: combination, sku: cell.sku, barcode: cell.barcode.trim() || undefined, price: cell.price === "" ? undefined : Number(cell.price) }
          }),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success("Product created")
        return navigate(`/products/${body.product.id}`)
      }
      // Variant errors come back by position; show them on the row they belong to.
      const fieldErrors: Record<string, string> = {}
      for (const [path, text] of Object.entries((body.errors ?? {}) as Record<string, string>)) {
        const [first, index, ...rest] = path.split(".")
        fieldErrors[first === "variants" && keys[Number(index)] ? [keys[Number(index)], ...rest].join(".") : path] = text
      }
      rows.forEach((combination) => {
        const sku = cells[rowKey(combination)]?.sku.trim()
        if (sku && body.message?.includes(`SKU ${sku} already exists`)) fieldErrors[`${rowKey(combination)}.sku`] = "Already exists in the store"
      })
      setErrors(fieldErrors)
      setMessage(body.message || "The product could not be created.")
    } catch {
      setMessage("The product could not be created. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div>
        <Heading level="h1">New product (Vi2)</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Sold on the website with the default shipping profile. Stock starts at 0 and comes from Odoo.
          Dimensions, HS code, origin, type, collection and tags are edited later on the product page.
        </Text>
      </div>

      <Container className="flex flex-col gap-y-4 px-6 py-4">
        <Heading level="h2">Basics</Heading>
        <div className="grid grid-cols-2 gap-4">
          <Field id="title" label="Name in English *" error={errors.title}>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field id="title-ar" label="Name in Arabic" error={errors.title_ar}>
            <Input id="title-ar" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          </Field>
        </div>
        <Field id="description" label="Description" error={errors.description}>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field id="status" label="Status" error={errors.status}>
            <Select value={status} onValueChange={setStatus}>
              <Select.Trigger id="status"><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="draft">Draft</Select.Item>
                <Select.Item value="published">Published</Select.Item>
              </Select.Content>
            </Select>
          </Field>
          <Field id="weight" label="Weight in grams" error={errors.weight}>
            <Input id="weight" type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <div className="flex items-center gap-x-2 pt-6">
            <Checkbox id="discountable" checked={discountable} onCheckedChange={(checked) => setDiscountable(checked === true)} />
            <Label htmlFor="discountable">Discountable</Label>
          </div>
        </div>
        <Field id="categories" label="Categories" error={errors.category_ids}>
          <div id="categories" className="flex max-h-60 flex-col gap-y-2 overflow-y-auto rounded-md border p-3">
            {sortedCategories.map((category) => (
              <div key={category.id} className="flex items-center gap-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={categoryIds.includes(category.id)}
                  onCheckedChange={(checked) => setCategoryIds((current) =>
                    checked === true ? [...current, category.id] : current.filter((id) => id !== category.id))}
                />
                <Label htmlFor={`category-${category.id}`}>{categoryLabel(category)}</Label>
              </div>
            ))}
          </div>
        </Field>
      </Container>

      <Container className="grid grid-cols-2 gap-4 px-6 py-4">
        <div className="flex flex-col gap-y-4">
          <Heading level="h2">Brand</Heading>
          <Field id="brand" label="Brand" error={errors.brand_id}>
            <Select value={brandId} onValueChange={setBrandId}>
              <Select.Trigger id="brand"><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value={NO_BRAND}>No brand</Select.Item>
                {brands.map((brand) => <Select.Item key={brand.id} value={brand.id}>{brand.name}</Select.Item>)}
              </Select.Content>
            </Select>
          </Field>
        </div>
        <div className="flex flex-col gap-y-4">
          <Heading level="h2">EDA registration</Heading>
          <Field id="eda-number" label="Registration number" error={errors["eda.registration_number"] ?? errors.eda}>
            <Input id="eda-number" maxLength={100} value={edaNumber} onChange={(e) => setEdaNumber(e.target.value)} />
          </Field>
          <div className="flex items-center gap-x-2">
            <Switch id="eda-approved" checked={edaApproved} onCheckedChange={setEdaApproved} />
            <Label htmlFor="eda-approved">Approved by EDA</Label>
          </div>
        </div>
      </Container>

      <Container className="flex flex-col gap-y-4 px-6 py-4">
        <Heading level="h2">Images</Heading>
        <Text size="small" className="text-ui-fg-subtle">The first image is the thumbnail.</Text>
        <input type="file" accept="image/*" multiple disabled={uploading} aria-label="Upload images"
          onChange={(e) => { upload(e.target.files); e.target.value = "" }} />
        {errors.images && <Text size="small" className="text-ui-fg-error">{errors.images}</Text>}
        <div className="flex flex-wrap gap-4">
          {images.map((url, index) => (
            <div key={url} className="flex flex-col items-center gap-y-1">
              <img src={url} alt={`Image ${index + 1}`} className="h-24 w-24 rounded-md border object-cover" />
              <Text size="xsmall">{index === 0 ? "Thumbnail" : `Image ${index + 1}`}</Text>
              <Button size="small" variant="transparent" onClick={() => setImages((current) => current.filter((item) => item !== url))}>Remove</Button>
            </div>
          ))}
        </div>
      </Container>

      <Container className="flex flex-col gap-y-4 px-6 py-4">
        <Heading level="h2">Options</Heading>
        <Text size="small" className="text-ui-fg-subtle">For example Flavor: Chocolate, Vanilla. Separate values with commas.</Text>
        {options.map((option, index) => (
          <div key={index} className="grid grid-cols-[1fr_2fr_auto] items-end gap-4">
            <Field id={`option-${index}`} label="Option" error={errors[`options.${index}.title`]}>
              <Input id={`option-${index}`} placeholder="Flavor" value={option.title} onChange={(e) => setOption(index, "title", e.target.value)} />
            </Field>
            <Field id={`values-${index}`} label="Values" error={errors[`options.${index}.values`]}>
              <Input id={`values-${index}`} placeholder="Chocolate, Vanilla" value={option.values} onChange={(e) => setOption(index, "values", e.target.value)} />
            </Field>
            <Button size="small" variant="secondary" disabled={options.length === 1}
              onClick={() => { setOptions((current) => current.filter((_, i) => i !== index)); setRemoved([]) }}>Remove</Button>
          </div>
        ))}
        {errors.options && <Text size="small" className="text-ui-fg-error">{errors.options}</Text>}
        <div>
          <Button size="small" variant="secondary" onClick={() => setOptions((current) => [...current, { title: "", values: "" }])}>Add option</Button>
        </div>
      </Container>

      <Container className="flex flex-col gap-y-4 px-6 py-4">
        <Heading level="h2">Variants</Heading>
        <Text size="small" className="text-ui-fg-subtle">Prices are in EGP, including tax. SKU and price are required.</Text>
        {rows.length === 0 && <Text size="small" className="text-ui-fg-subtle">Add an option with at least one value.</Text>}
        {errors.variants && <Text size="small" className="text-ui-fg-error">{errors.variants}</Text>}
        {rows.map((combination) => {
          const key = rowKey(combination)
          const cell = cells[key] ?? emptyCell
          const name = Object.values(combination).join(" / ")
          return (
            <div key={key} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-start gap-4">
              <Text size="small" weight="plus" className="pt-8">{name}</Text>
              <Field id={`${key}-sku`} label="SKU *" error={errors[`${key}.sku`]}>
                <Input id={`${key}-sku`} value={cell.sku} onChange={(e) => setCell(key, "sku", e.target.value)} />
              </Field>
              <Field id={`${key}-barcode`} label="Barcode" error={errors[`${key}.barcode`]}>
                <Input id={`${key}-barcode`} value={cell.barcode} onChange={(e) => setCell(key, "barcode", e.target.value)} />
              </Field>
              <Field id={`${key}-price`} label="Price (EGP) *" error={errors[`${key}.price`]}>
                <Input id={`${key}-price`} type="number" min="0" step="0.01" value={cell.price} onChange={(e) => setCell(key, "price", e.target.value)} />
              </Field>
              <Button size="small" variant="secondary" className="mt-7" aria-label={`Remove ${name}`}
                onClick={() => setRemoved((current) => [...current, key])}>Remove</Button>
            </div>
          )
        })}
      </Container>

      <div className="flex items-center justify-end gap-x-4">
        {message && <Text size="small" className="text-ui-fg-error" role="alert">{message}</Text>}
        <Button variant="secondary" onClick={() => navigate("/products")}>Cancel</Button>
        <Button isLoading={saving} disabled={saving || uploading} onClick={save}>Create</Button>
      </div>
    </div>
  )
}

export default NewProductPage
