import { definePolicies } from "@medusajs/framework/utils"

// At every start Medusa deletes the permissions no code defines, which silently
// removes them from every role. Medusa 2.21 defines none for our Brand module,
// and none for refunds, captures and credit lines although its own payment and
// order routes check them, so those are defined here. The price-list batch
// route checks "price:*", which Medusa does not define either.
const OPERATIONS = ["read", "create", "update", "delete"] as const
const RESOURCES = ["brand", "refund", "capture", "credit_line"]

const pascal = (value: string) => value.replace(/(^|_)([a-z])/g, (_match, _sep, letter: string) => letter.toUpperCase())

export const projectPolicies = definePolicies([
  ...RESOURCES.flatMap((resource) => OPERATIONS.map((operation) => ({
    name: `${pascal(operation)}${pascal(resource)}`,
    resource,
    operation,
    description: `${pascal(operation)} ${resource.replace(/_/g, " ")}`,
  }))),
  { name: "AllPrice", resource: "price", operation: "*", description: "Every operation on prices" },
])
