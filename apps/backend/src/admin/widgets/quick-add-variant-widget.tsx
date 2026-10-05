import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

type ProductOption = {
  id: string
  title: string
  values: { id: string; value: string }[]
}

type WidgetProps = {
  data: {
    id: string
    options: ProductOption[]
  }
}

const QuickAddVariantWidget = ({ data }: WidgetProps) => {
  const productId = data.id

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [optionTitle, setOptionTitle] = useState("")
  const [customOptionTitle, setCustomOptionTitle] = useState("")
  const [optionValue, setOptionValue] = useState("")
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [price, setPrice] = useState("")
  const [currencyCode, setCurrencyCode] = useState("egp")

  // Derive options from product data
  const productOptions: ProductOption[] = data.options || []

  // Determine the final option title (dropdown selection or custom text)
  const resolvedOptionTitle =
    optionTitle === "__new__" ? customOptionTitle : optionTitle

  // Pre-select the first option if available
  useEffect(() => {
    if (productOptions.length > 0 && !optionTitle) {
      setOptionTitle(productOptions[0].title)
    }
  }, [productOptions])

  const resetForm = () => {
    setOptionTitle(productOptions.length > 0 ? productOptions[0].title : "")
    setCustomOptionTitle("")
    setOptionValue("")
    setSku("")
    setBarcode("")
    setPrice("")
    setCurrencyCode("egp")
  }

  const handleSubmit = async () => {
    if (!resolvedOptionTitle || !optionValue || !price) {
      toast.error("Error", {
        description: "Option, value, and price are required.",
      })
      return
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Error", {
        description: "Price must be a valid positive number.",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/admin/products/${productId}/quick-variant`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            option_title: resolvedOptionTitle,
            option_value: optionValue,
            title: optionValue,
            sku: sku || undefined,
            barcode: barcode || undefined,
            prices: [
              {
                amount: priceNum,
                currency_code: currencyCode,
              },
            ],
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Failed to create variant")
      }

      toast.success("Variant Created!", {
        description: `"${optionValue}" variant added successfully. Refresh to see it in the variants table.`,
      })

      resetForm()
      setIsOpen(false)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong"
      toast.error("Failed", { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isOpen ? "16px" : "0",
        }}
      >
        <div>
          <Heading level="h2">Quick Variant Creator</Heading>
          <Text size="small" style={{ color: "var(--fg-muted)" }}>
            Add a new variant with a new option value in one step
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Cancel" : "+ Quick Add Variant"}
        </Button>
      </div>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "16px",
            border: "1px solid var(--border-base)",
            borderRadius: "8px",
            background: "var(--bg-subtle)",
          }}
        >
          {/* Option Selection */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <Label htmlFor="option-select" style={{ marginBottom: "4px", display: "block" }}>
                Option Name
              </Label>
              <Select
                value={optionTitle}
                onValueChange={(val) => setOptionTitle(val)}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select option..." />
                </Select.Trigger>
                <Select.Content>
                  {productOptions.map((opt) => (
                    <Select.Item key={opt.id} value={opt.title}>
                      {opt.title}
                    </Select.Item>
                  ))}
                  <Select.Item value="__new__">
                    + Create New Option
                  </Select.Item>
                </Select.Content>
              </Select>
            </div>

            {optionTitle === "__new__" && (
              <div style={{ flex: 1 }}>
                <Label htmlFor="custom-option" style={{ marginBottom: "4px", display: "block" }}>
                  New Option Name
                </Label>
                <Input
                  id="custom-option"
                  placeholder="e.g. Flavor, Size, Color"
                  value={customOptionTitle}
                  onChange={(e) => setCustomOptionTitle(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Option Value */}
          <div>
            <Label htmlFor="option-value" style={{ marginBottom: "4px", display: "block" }}>
              New Value
            </Label>
            <Input
              id="option-value"
              placeholder={
                resolvedOptionTitle === "Flavor"
                  ? "e.g. Salted Caramel"
                  : resolvedOptionTitle === "Size"
                    ? "e.g. 2.27 kg"
                    : "e.g. New option value"
              }
              value={optionValue}
              onChange={(e) => setOptionValue(e.target.value)}
            />
          </div>

          {/* SKU & Barcode row */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <Label htmlFor="sku" style={{ marginBottom: "4px", display: "block" }}>
                SKU
              </Label>
              <Input
                id="sku"
                placeholder="e.g. WH-SC-1KG"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Label htmlFor="barcode" style={{ marginBottom: "4px", display: "block" }}>
                Barcode (optional)
              </Label>
              <Input
                id="barcode"
                placeholder="e.g. 6221234567890"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
          </div>

          {/* Price row */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <Label htmlFor="price" style={{ marginBottom: "4px", display: "block" }}>
                Price
              </Label>
              <Input
                id="price"
                type="number"
                placeholder="e.g. 1250"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Label htmlFor="currency" style={{ marginBottom: "4px", display: "block" }}>
                Currency
              </Label>
              <Select
                value={currencyCode}
                onValueChange={(val) => setCurrencyCode(val)}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="egp">EGP</Select.Item>
                  <Select.Item value="usd">USD</Select.Item>
                  <Select.Item value="eur">EUR</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              paddingTop: "8px",
            }}
          >
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                resetForm()
                setIsOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleSubmit}
              isLoading={loading}
              disabled={loading}
            >
              Create Variant
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default QuickAddVariantWidget
