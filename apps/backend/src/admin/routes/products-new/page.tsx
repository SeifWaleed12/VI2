import { Alert, Button, Checkbox, clx, Divider, FocusModal, Heading, Hint, Input, Label, ProgressTabs, Select, Switch, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { getAll, getJson } from "../../lib/get-json"
import { combinationCount, MAX_VARIANTS, optionCombinations } from "../../lib/variant-combinations"
import { CategoryCombobox, type Category } from "./category-combobox"
import { ChipCombobox } from "./chip-combobox"

type Brand = { id: string, name: string }
type SharedOption = { id: string, title: string, values: { id: string, value: string, rank: number | null }[] }
// A shared option on this product: chosen existing values and values to add to it.
type ChosenOption = { id: string, valueIds: string[], newValues: string[] }
// title stays undefined until edited, so the row shows its default title.
type Cell = { title?: string, sku: string, barcode: string, price: string }
type Tab = "details" | "organize" | "variants"

const TABS: { value: Tab, label: string }[] = [
  { value: "details", label: "Details" },
  { value: "organize", label: "Organize" },
  { value: "variants", label: "Variants" },
]
const NEW = "new:"
const emptyCell: Cell = { sku: "", barcode: "", price: "" }
const LABELS: Record<keyof Cell, string> = { title: "Title", sku: "SKU", barcode: "Barcode", price: "Price" }
const rowKey = (combination: Record<string, string>) => JSON.stringify(combination)
// Without variants Medusa creates one default variant; its row has no option values.
const DEFAULT_ROW: Record<string, string> = {}
const sameValue = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const byRank = (a: { rank: number | null, value: string }, b: { rank: number | null, value: string }) =>
  (a.rank ?? Number.MAX_VALUE) - (b.rank ?? Number.MAX_VALUE) || a.value.localeCompare(b.value)

// Which tab holds the field a server error names.
const tabOf = (path: string): Tab =>
  path.startsWith("variants") ? "variants" : /^(category_ids|weight|brand_id|eda|discountable)/.test(path) ? "organize" : "details"

const Field = ({ id, label, optional, error, children }: { id: string, label: string, optional?: boolean, error?: string, children: ReactNode }) => (
  <div className="flex flex-col gap-y-2">
    <Label htmlFor={id} size="small" weight="plus">
      {label}{optional && <span className="text-ui-fg-muted font-normal"> (Optional)</span>}
    </Label>
    {children}
    {error && <Hint variant="error">{error}</Hint>}
  </div>
)

// The card with a switch that Medusa's form uses for yes/no settings.
const SwitchBox = ({ id, label, description, checked, onChange }: { id: string, label: string, description: string, checked: boolean, onChange: (checked: boolean) => void }) => (
  <div className="bg-ui-bg-component shadow-elevation-card-rest flex items-start gap-x-3 rounded-lg p-3">
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
    <div className="flex flex-col">
      <Label htmlFor={id} size="small" weight="plus">{label}</Label>
      <Hint>{description}</Hint>
    </div>
  </div>
)

// Medusa's Create product form, plus what the shop needs: brand, EDA
// registration, weight, EGP prices and shared options whose new values are
// added for every product. The server (POST /admin/vi2-products) validates and
// saves it all in one workflow; this page collects the input and shows the
// server's messages next to the fields.
const NewProductPage = () => {
  const navigate = useNavigate()
  const prompt = usePrompt()
  const [tab, setTab] = useState<Tab>("details")
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sharedOptions, setSharedOptions] = useState<SharedOption[]>([])

  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [handle, setHandle] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [chosen, setChosen] = useState<ChosenOption[]>([])
  const [hasVariants, setHasVariants] = useState(false)
  const [skipped, setSkipped] = useState<string[]>([])
  const [discountable, setDiscountable] = useState(true)
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [brandId, setBrandId] = useState("")
  const [weight, setWeight] = useState("")
  const [edaNumber, setEdaNumber] = useState("")
  const [edaApproved, setEdaApproved] = useState(false)
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getJson("/admin/brands?status=active").then((body) => setBrands(body.brands ?? []))
      .catch(() => toast.error("Could not load brands"))
    getAll<Category>("/admin/product-categories?limit=200&fields=id,name,parent_category_id,rank", "product_categories").then(setCategories)
      .catch(() => toast.error("Could not load categories"))
    getJson("/admin/product-options?is_exclusive=false&limit=200&fields=id,title,values.id,values.value,values.rank")
      .then((body) => setSharedOptions(body.product_options ?? []))
      .catch(() => toast.error("Could not load product options"))
  }, [])

  // Each chosen option with its title and value names, existing values first in their shared order.
  const options = chosen.flatMap((option) => {
    const shared = sharedOptions.find((candidate) => candidate.id === option.id)
    if (!shared) return []
    const existing = shared.values.filter((value) => option.valueIds.includes(value.id)).sort(byRank)
    return [{ ...option, shared, title: shared.title, values: [...existing.map((value) => value.value), ...option.newValues] }]
  })
  const completeOptions = options.filter((option) => option.values.length)
  // Counted before building rows: a few long value lists would otherwise create
  // thousands of rows and freeze the page.
  const variantTotal = combinationCount(completeOptions)
  const combinations = variantTotal > MAX_VARIANTS ? [] : optionCombinations(completeOptions)
  const rows = hasVariants ? combinations.filter((combination) => !skipped.includes(rowKey(combination))) : [DEFAULT_ROW]

  const updateOption = (id: string, change: (option: ChosenOption) => ChosenOption) =>
    setChosen((current) => current.map((option) => (option.id === id ? change(option) : option)))
  const setOptionIds = (ids: string[]) => setChosen((current) =>
    ids.map((id) => current.find((option) => option.id === id) ?? { id, valueIds: [], newValues: [] }))
  const setValues = (id: string, keys: string[]) => updateOption(id, (option) => ({
    ...option,
    valueIds: keys.filter((key) => !key.startsWith(NEW)),
    newValues: keys.filter((key) => key.startsWith(NEW)).map((key) => key.slice(NEW.length)),
  }))
  // A typed value that the option already has (ignoring case) selects it instead of adding it twice.
  const addValue = (shared: SharedOption, name: string) => updateOption(shared.id, (option) => {
    const existing = shared.values.find((value) => sameValue(value.value, name))
    if (existing) return option.valueIds.includes(existing.id) ? option : { ...option, valueIds: [...option.valueIds, existing.id] }
    return option.newValues.some((value) => sameValue(value, name)) ? option : { ...option, newValues: [...option.newValues, name] }
  })
  // Editing a field clears its error, like Medusa's form.
  const edited = (...keys: string[]) => setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !keys.includes(key))))
  const setCell = (key: string, field: keyof Cell, value: string) => {
    setCells((current) => ({ ...current, [key]: { ...(current[key] ?? emptyCell), [field]: value } }))
    edited(`${key}.${field}`)
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

  // What Continue checks on each tab before moving on; the server checks everything again.
  const tabErrors = (on: Tab) => {
    const found: Record<string, string> = {}
    if (on === "details") {
      if (!title.trim()) found.title = "Enter a title"
      if (hasVariants) {
        if (!options.length) found.options = "Add at least one option"
        options.forEach((option, index) => { if (!option.values.length) found[`options.${index}`] = "Choose at least one value" })
        if (variantTotal > MAX_VARIANTS) found.options = `These options make ${variantTotal} variants; the most is ${MAX_VARIANTS}. Remove some values.`
        else if (options.length && !rows.length) found.variants = "Keep at least one variant"
      }
    } else if (on === "organize") {
      if (!brandId) found.brand_id = "Choose a brand"
      if (!categoryIds.length) found.category_ids = "Choose at least one category"
    }
    return found
  }
  const fieldId = (key: string) => {
    if (key === "brand_id") return "brand"
    if (key === "category_ids") return "categories"
    if (key.startsWith("options.")) return `values-${options[Number(key.split(".")[1])]?.id}`
    return key === "options" || key === "variants" ? "options" : key
  }
  // Shows the first tab before `next` that has problems, with its first problem
  // in view and focused, like Medusa's form. Returns false when one was found.
  const checkTabsBefore = (next: Tab) => {
    for (const item of TABS.slice(0, TABS.findIndex((candidate) => candidate.value === next))) {
      const found = tabErrors(item.value)
      if (Object.keys(found).length) {
        setErrors(found)
        setTab(item.value)
        requestAnimationFrame(() => document.getElementById(fieldId(Object.keys(found)[0]))?.focus())
        return false
      }
    }
    return true
  }
  const goTo = (next: Tab) => {
    if (!checkTabsBefore(next)) return
    setErrors({})
    setTab(next)
  }

  const save = async (status: "draft" | "published") => {
    // The variant cells are checked by the server and shown in the table.
    if (!checkTabsBefore("variants")) return
    setSaving(true)
    setErrors({})
    const keys = rows.map(rowKey)
    try {
      const res = await fetch("/admin/vi2-products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle: subtitle.trim() || undefined,
          handle: handle.trim() || undefined,
          description: description.trim() || undefined,
          category_ids: categoryIds,
          status,
          weight: weight === "" ? undefined : Number(weight),
          discountable,
          brand_id: brandId || undefined,
          eda: edaNumber.trim() ? { registration_number: edaNumber, is_approved: edaApproved } : undefined,
          images,
          options: !hasVariants ? [] : options.map((option) => ({ id: option.id, value_ids: option.valueIds, new_values: option.newValues.length ? option.newValues : undefined })),
          variants: rows.map((combination) => {
            const cell = cells[rowKey(combination)] ?? emptyCell
            return { options: combination, title: cell.title?.trim() || undefined, sku: cell.sku, barcode: cell.barcode.trim() || undefined, price: cell.price === "" ? undefined : Number(cell.price) }
          }),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(status === "draft" ? "Product saved as draft" : "Product published")
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
      const firstPath = Object.keys(body.errors ?? {})[0]
      setTab(firstPath ? tabOf(firstPath) : /SKU/.test(body.message ?? "") ? "variants" : tab)
      if (firstPath && tabOf(firstPath) !== "variants") requestAnimationFrame(() => document.getElementById(fieldId(firstPath))?.focus())
      toast.error(body.message || "The product could not be created.")
    } catch {
      toast.error("The product could not be created. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  // Closing with Esc, the X or Cancel asks first when something was entered, like Medusa's form.
  const close = async () => {
    const entered = [title, subtitle, handle, description, weight, edaNumber].some((value) => value.trim()) || images.length > 0 ||
      chosen.length > 0 || categoryIds.length > 0 || !!brandId || !discountable || hasVariants || edaApproved || Object.values(cells).some((cell) => Object.values(cell).some(Boolean))
    if (entered && !await prompt({
      title: "Are you sure you want to leave this form?",
      description: "You have unsaved changes that will be lost if you exit this form.",
      confirmText: "Continue",
      cancelText: "Cancel",
      variant: "confirmation",
    })) return
    navigate("/products")
  }

  const tabIndex = TABS.findIndex((item) => item.value === tab)
  const variantError = (key: string, field: keyof Cell) => errors[`${key}.${field}`]

  return (
    <FocusModal open onOpenChange={(open) => { if (!open) close() }}>
      <FocusModal.Content>
        <FocusModal.Title asChild><span className="sr-only">Create product</span></FocusModal.Title>
        <ProgressTabs value={tab} onValueChange={(next) => goTo(next as Tab)} className="flex h-full flex-col overflow-hidden">
          <FocusModal.Header>
            <div className="-my-2 w-full border-l">
              <ProgressTabs.List className="flex w-full items-center justify-start">
                {TABS.map((item, index) => (
                  <ProgressTabs.Trigger key={item.value} value={item.value} className="max-w-[200px] truncate"
                    status={index < tabIndex ? "completed" : index === tabIndex ? "in-progress" : "not-started"}>
                    {item.label}
                  </ProgressTabs.Trigger>
                ))}
              </ProgressTabs.List>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="size-full overflow-hidden">
            <ProgressTabs.Content value="details" className="size-full overflow-y-auto">
              <div className="flex flex-col items-center p-16">
                <div className="flex w-full max-w-[720px] flex-col gap-y-8">
                  <Heading>Create Product</Heading>
                  <div className="flex flex-col gap-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field id="title" label="Title" error={errors.title}>
                        <Input id="title" placeholder="Whey Protein" value={title} aria-invalid={!!errors.title} onChange={(e) => { setTitle(e.target.value); edited("title") }} />
                      </Field>
                      <Field id="subtitle" label="Subtitle" optional error={errors.subtitle}>
                        <Input id="subtitle" placeholder="Isolate" value={subtitle} onChange={(e) => { setSubtitle(e.target.value); edited("subtitle") }} />
                      </Field>
                      <Field id="handle" label="Handle" optional error={errors.handle}>
                        <Input id="handle" placeholder="whey-protein" value={handle} aria-invalid={!!errors.handle} onChange={(e) => { setHandle(e.target.value); edited("handle") }} />
                      </Field>
                    </div>
                    <Field id="description" label="Description" optional error={errors.description}>
                      <Textarea id="description" placeholder="What it is, who it is for and how to use it." value={description} onChange={(e) => setDescription(e.target.value)} />
                    </Field>
                    <div className="flex flex-col gap-y-2">
                      <Label size="small" weight="plus">Media<span className="text-ui-fg-muted font-normal"> (Optional)</span></Label>
                      <label className={clx(
                        "bg-ui-bg-component border-ui-border-strong transition-fg flex w-full cursor-pointer flex-col items-center gap-y-2 rounded-lg border border-dashed p-8",
                        "hover:border-ui-border-interactive focus-within:border-ui-border-interactive focus-within:shadow-borders-focus",
                        errors.images && "!border-ui-border-error"
                      )}>
                        <Text className="text-ui-fg-subtle">{uploading ? "Uploading…" : "Upload images"}</Text>
                        <Text size="small" leading="compact" className="text-ui-fg-muted">Drag and drop images here or click to upload. The first image is the thumbnail.</Text>
                        <input type="file" accept="image/*" multiple disabled={uploading} className="sr-only"
                          onChange={(e) => { upload(e.target.files); e.target.value = "" }} />
                      </label>
                      {errors.images && <Hint variant="error">{errors.images}</Hint>}
                      <ul className="flex flex-col gap-y-2">
                        {images.map((url, index) => (
                          <li key={url} className="bg-ui-bg-component shadow-elevation-card-rest flex items-center justify-between rounded-lg px-3 py-2">
                            <div className="flex items-center gap-x-3">
                              <div className="bg-ui-bg-base h-10 w-[30px] overflow-hidden rounded-md">
                                <img src={url} alt="" className="size-full object-cover object-center" />
                              </div>
                              <div className="flex flex-col">
                                <Text size="small" leading="compact">{url.split("/").pop()}</Text>
                                {index === 0 && <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">Thumbnail</Text>}
                              </div>
                            </div>
                            <div className="flex items-center gap-x-1">
                              {index > 0 && (
                                <Button size="small" variant="transparent" type="button"
                                  onClick={() => setImages((current) => [url, ...current.filter((item) => item !== url)])}>Make thumbnail</Button>
                              )}
                              <Button size="small" variant="transparent" type="button"
                                onClick={() => setImages((current) => current.filter((item) => item !== url))}>Delete</Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Divider />
                  <div className="flex flex-col gap-y-8">
                    <div className="flex flex-col gap-y-6">
                      <Heading level="h2">Variants</Heading>
                      <SwitchBox id="has-variants" label="Yes, this is a product with variants" checked={hasVariants}
                        onChange={(checked) => { setHasVariants(checked); setErrors({}) }}
                        description="When unchecked, we will create a default variant for you" />
                    </div>
                    {hasVariants && (
                      <div className="flex flex-col gap-y-8">
                      <div className="flex flex-col gap-y-2">
                        <div className="flex flex-col">
                          <Label htmlFor="options" weight="plus">Product options</Label>
                          <Hint>Choose shared options, like Flavor or Size. They are managed in Products › Options and used by every product.</Hint>
                        </div>
                        <ChipCombobox id="options" placeholder="Choose options" invalid={!!errors.options}
                          choices={sharedOptions.map((option) => ({ value: option.id, label: option.title }))}
                          value={chosen.map((option) => option.id)}
                          onChange={(ids) => { setOptionIds(ids); setSkipped([]); setErrors({}) }} />
                        {errors.options && <Hint variant="error">{errors.options}</Hint>}
                      </div>
                      {options.length > 0 && (
                        <div className="flex flex-col gap-y-4">
                          <div className="flex flex-col">
                            <Label weight="plus">Values</Label>
                            <Hint>Choose the values this product comes in. Type a new one and press Enter to add it; it is saved to the option with the product.</Hint>
                          </div>
                          {options.map((option, index) => (
                            <div key={option.id} className="flex flex-col gap-y-2">
                              <Label htmlFor={`values-${option.id}`} size="small" weight="plus">{option.title}</Label>
                              <ChipCombobox id={`values-${option.id}`} placeholder={`Choose ${option.title.toLowerCase()} values`}
                                invalid={!!errors[`options.${index}`]}
                                choices={[
                                  ...[...option.shared.values].sort(byRank).map((value) => ({ value: value.id, label: value.value })),
                                  ...option.newValues.map((name) => ({ value: `${NEW}${name}`, label: name, hint: "new" })),
                                ]}
                                value={[...option.valueIds, ...option.newValues.map((name) => `${NEW}${name}`)]}
                                onChange={(keys) => { setValues(option.id, keys); setSkipped([]); edited(`options.${index}`, "options", "variants") }}
                                onCreate={(name) => { addValue(option.shared, name); setSkipped([]); edited(`options.${index}`, "options", "variants") }} />
                              {errors[`options.${index}`] && <Hint variant="error">{errors[`options.${index}`]}</Hint>}
                            </div>
                          ))}
                        </div>
                    )}
                    <div className="flex flex-col gap-y-4">
                      <div className="flex flex-col">
                        <Label weight="plus">Product variants</Label>
                        <Hint>Untick the combinations this product is not sold in.</Hint>
                      </div>
                      {errors.variants && <Alert variant="error">{errors.variants}</Alert>}
                      {combinations.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border">
                          <div className="bg-ui-bg-component text-ui-fg-subtle grid items-center gap-3 border-b px-6 py-2.5"
                            style={{ gridTemplateColumns: `20px repeat(${completeOptions.length}, 1fr)` }}>
                            <Checkbox aria-label="Select all variants"
                              checked={skipped.length === 0 ? true : rows.length === 0 ? false : "indeterminate"}
                              onCheckedChange={(checked) => setSkipped(checked === true ? [] : combinations.map(rowKey))} />
                            {completeOptions.map((option) => <Text key={option.id} size="small" leading="compact" weight="plus">{option.title}</Text>)}
                          </div>
                          {combinations.map((combination, index) => {
                            const key = rowKey(combination)
                            return (
                              <div key={key} className={clx("bg-ui-bg-base text-ui-fg-subtle grid items-center gap-3 px-6 py-2.5", index < combinations.length - 1 && "border-b")}
                                style={{ gridTemplateColumns: `20px repeat(${completeOptions.length}, 1fr)` }}>
                                <Checkbox aria-label={`Sell ${Object.values(combination).join(" / ")}`} checked={!skipped.includes(key)}
                                  onCheckedChange={(checked) => setSkipped((current) => checked === true ? current.filter((item) => item !== key) : [...current, key])} />
                                {Object.values(combination).map((value, column) => <Text key={column} size="small" leading="compact">{value}</Text>)}
                              </div>
                            )
                          })}
                        </div>
                      ) : variantTotal <= MAX_VARIANTS && <Alert>Choose an option and its values to see the variants.</Alert>}
                    </div>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </ProgressTabs.Content>

            <ProgressTabs.Content value="organize" className="size-full overflow-y-auto">
              <div className="flex flex-col items-center p-16">
                <div className="flex w-full max-w-[720px] flex-col gap-y-8">
                  <Heading>Organize</Heading>
                  <SwitchBox id="discountable" label="Discountable" checked={discountable} onChange={setDiscountable}
                    description="When unchecked, discounts will not be applied to this product." />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field id="brand" label="Brand" error={errors.brand_id}>
                      <Select value={brandId} onValueChange={(id) => { setBrandId(id); edited("brand_id") }}>
                        <Select.Trigger id="brand" aria-invalid={!!errors.brand_id}><Select.Value placeholder="Choose a brand" /></Select.Trigger>
                        <Select.Content>
                          {brands.map((brand) => <Select.Item key={brand.id} value={brand.id}>{brand.name}</Select.Item>)}
                        </Select.Content>
                      </Select>
                    </Field>
                    <Field id="categories" label="Categories" error={errors.category_ids}>
                      <CategoryCombobox id="categories" categories={categories}
                        value={categoryIds} onChange={(ids) => { setCategoryIds(ids); edited("category_ids") }} invalid={!!errors.category_ids} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field id="weight" label="Weight (grams)" optional error={errors.weight}>
                      <Input id="weight" type="number" min="0" value={weight} aria-invalid={!!errors.weight} onChange={(e) => { setWeight(e.target.value); edited("weight") }} />
                    </Field>
                    <Field id="eda-number" label="EDA registration number" optional error={errors["eda.registration_number"] ?? errors.eda}>
                      <Input id="eda-number" maxLength={100} value={edaNumber} onChange={(e) => { setEdaNumber(e.target.value); edited("eda", "eda.registration_number") }} />
                    </Field>
                  </div>
                  <SwitchBox id="eda-approved" label="Approved by EDA" checked={edaApproved} onChange={setEdaApproved}
                    description="Saved only with a registration number. Shoppers see the product as EDA approved." />
                  <Text size="small" className="text-ui-fg-subtle">
                    The product is sold on the website with the default shipping profile. Stock starts at 0; set it on the product page.
                  </Text>
                </div>
              </div>
            </ProgressTabs.Content>

            <ProgressTabs.Content value="variants" className="size-full overflow-y-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-ui-bg-subtle txt-compact-small-plus text-ui-fg-subtle text-left">
                    <th className="border-ui-border-base border-b border-r px-4 py-2.5 font-medium">{hasVariants ? completeOptions.map((option) => option.title).join(" / ") : "Variant"}</th>
                    <th className="border-ui-border-base border-b border-r px-4 py-2.5 font-medium">Title</th>
                    <th className="border-ui-border-base border-b border-r px-4 py-2.5 font-medium">SKU</th>
                    <th className="border-ui-border-base border-b border-r px-4 py-2.5 font-medium">Barcode<span className="text-ui-fg-muted font-normal"> (Optional)</span></th>
                    <th className="border-ui-border-base border-b px-4 py-2.5 font-medium">Price EGP<span className="text-ui-fg-muted font-normal"> (incl. tax)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((combination, index) => {
                    const key = rowKey(combination)
                    const cell = cells[key] ?? emptyCell
                    const name = hasVariants ? Object.values(combination).join(" / ") : "Default variant"
                    const input = (field: keyof Cell, props: { type?: string, min?: string, step?: string } = {}) => (
                      <td className={clx("border-ui-border-base border-b align-top focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-ui-fg-interactive",
                        field !== "price" && "border-r", variantError(key, field) && "bg-ui-tag-red-bg")}>
                        <input id={`variant-${index}-${field}`} aria-label={`${LABELS[field]} for ${name}`}
                          aria-invalid={!!variantError(key, field)} {...props}
                          value={field === "title" ? cell.title ?? name : cell[field]} onChange={(e) => setCell(key, field, e.target.value)}
                          className="txt-compact-small text-ui-fg-base w-full bg-transparent px-4 py-2.5 outline-none" />
                        {variantError(key, field) && <Text size="xsmall" className="text-ui-fg-error px-4 pb-2">{variantError(key, field)}</Text>}
                      </td>
                    )
                    return (
                      <tr key={key}>
                        <td className="border-ui-border-base bg-ui-bg-subtle txt-compact-small text-ui-fg-subtle border-b border-r px-4 py-2.5 align-top">{name}</td>
                        {input("title")}
                        {input("sku")}
                        {input("barcode")}
                        {input("price", { type: "number", min: "0", step: "0.01" })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!rows.length && <Text size="small" className="text-ui-fg-subtle p-6">Choose options and values in Details first.</Text>}
            </ProgressTabs.Content>
          </FocusModal.Body>
        </ProgressTabs>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild>
              <Button size="small" variant="secondary" type="button">Cancel</Button>
            </FocusModal.Close>
            <Button size="small" variant="secondary" type="button" isLoading={saving} disabled={saving || uploading} onClick={() => save("draft")}>Save as draft</Button>
            {tab === "variants" ? (
              <Button size="small" type="button" isLoading={saving} disabled={saving || uploading} onClick={() => save("published")}>Publish</Button>
            ) : (
              <Button size="small" type="button" onClick={() => goTo(TABS[tabIndex + 1].value)}>Continue</Button>
            )}
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

export default NewProductPage
