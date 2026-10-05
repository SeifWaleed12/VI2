import { MedusaError } from "@medusajs/framework/utils"
import { brandErrorResponse } from "../errors"

it("maps duplicate slugs to 409 and missing brands to 404", () => {
  expect(brandErrorResponse(new MedusaError(MedusaError.Types.DUPLICATE_ERROR, "Brand with slug: x, already exists."), "fallback")).toEqual({ status: 409, message: "A brand with this slug already exists" })
  expect(brandErrorResponse(new MedusaError(MedusaError.Types.NOT_FOUND, "Brand with id: brand_1 was not found"), "fallback")).toEqual({ status: 404, message: "Brand not found" })
})
it("never exposes unexpected error details", () => {
  expect(brandErrorResponse(new Error("connect ECONNREFUSED 10.0.0.5:5432"), "Failed to update brand")).toEqual({ status: 500, message: "Failed to update brand" })
  expect(brandErrorResponse(new MedusaError(MedusaError.Types.DB_ERROR, "relation brand does not exist"), "Failed")).toEqual({ status: 500, message: "Failed" })
})
