import { MedusaError } from "@medusajs/framework/utils"
import { quickVariantErrorResponse } from "../errors"

it("maps a missing product to 404", () => {
  expect(quickVariantErrorResponse(new MedusaError(MedusaError.Types.NOT_FOUND, "Product prod_1 was not found"))).toEqual({ status: 404, message: "Product not found" })
})
it("never exposes unexpected error details", () => {
  expect(quickVariantErrorResponse(new Error("connect ECONNREFUSED 10.0.0.5:5432"))).toEqual({ status: 500, message: "Failed to create quick variant" })
  expect(quickVariantErrorResponse(new MedusaError(MedusaError.Types.DB_ERROR, "relation product does not exist"))).toEqual({ status: 500, message: "Failed to create quick variant" })
})
