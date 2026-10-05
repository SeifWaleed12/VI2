import { quickVariantSchema } from "../../../../validators"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createAndLinkProductOptionsToProductWorkflow,
  createProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id: productId } = req.params
  const parsed = quickVariantSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid variant details" })
  const body = parsed.data

  const {
    option_title,
    option_value,
    title,
    sku,
    barcode,
    prices = [],
    manage_inventory = true,
  } = body

  // Validate required fields
  if (!option_title || !option_value) {
    return res.status(400).json({
      message: "option_title and option_value are required.",
    })
  }

  if (!prices.length) {
    return res.status(400).json({
      message: "At least one price entry is required.",
    })
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // ─── Step 1: Fetch existing product options ─────────────────────
    const { data: [product] } = await query.graph({
      entity: "product",
      fields: ["id", "options.*", "options.values.*"],
      filters: { id: productId },
    })

    if (!product) {
      return res.status(404).json({ message: `Product ${productId} not found.` })
    }

    // ─── Step 2: Find or create the option + value ──────────────────
    const existingOption = (product.options || []).find(
      (opt: any) => opt.title.toLowerCase() === option_title.toLowerCase()
    )

    if (!existingOption) {
      // Option doesn't exist — create it and link to product in one step
      await createAndLinkProductOptionsToProductWorkflow(req.scope).run({
        input: {
          product_id: productId,
          add: [
            {
              title: option_title,
              values: [option_value],
            },
          ],
        },
      })
    } else {
      // Option exists — check if the value already exists
      const valueExists = (existingOption.values || []).some(
        (v: any) => v.value.toLowerCase() === option_value.toLowerCase()
      )

      if (!valueExists) {
        // Add the new value to the existing option via the proper workflow
        await createAndLinkProductOptionsToProductWorkflow(req.scope).run({
          input: {
            product_id: productId,
            update: [
              {
                product_option_id: existingOption.id,
                add: [{ value: option_value }],
              },
            ],
          },
        })
      }
    }

    // ─── Step 3: Create the variant ─────────────────────────────────
    const variantTitle = title || option_value

    const { result: createdVariants } = await createProductVariantsWorkflow(
      req.scope
    ).run({
      input: {
        product_variants: [
          {
            product_id: productId,
            title: variantTitle,
            sku: sku || undefined,
            barcode: barcode || undefined,
            manage_inventory,
            options: {
              [existingOption?.title || option_title]: option_value,
            },
            prices,
          },
        ],
      },
    })

    const variant = createdVariants[0]

    res.status(201).json({ variant })
  } catch {
    const message =
      "Failed to create quick variant"
    res.status(500).json({ message })
  }
}
