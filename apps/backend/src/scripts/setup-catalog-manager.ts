import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createRbacPoliciesWorkflow, createRbacRolesWorkflow, createRbacRolePoliciesWorkflow } from "@medusajs/medusa/core-flows"

// Run after native migrations. Explicitly names the bootstrap administrator;
// never upgrades all existing staff or silently assigns manager privileges.
export default async function setupCatalogManager({ container, args }: ExecArgs) {
  const adminId = args[0]
  if (!adminId?.startsWith("user_")) throw new Error("Supply the existing administrator's user ID")
  const users = container.resolve(Modules.USER)
  await users.retrieveUser(adminId)
  const rbac = container.resolve(Modules.RBAC)
  await rbac.retrieveRbacRole("role_super_admin")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "user", fields: ["rbac_roles.id"], filters: { id: adminId } })
  const current = data[0] as { rbac_roles?: { id: string }[] }
  if (!current.rbac_roles?.some((role) => role.id === "role_super_admin")) {
    await container.resolve(ContainerRegistrationKeys.LINK).create({
      [Modules.USER]: { user_id: adminId },
      [Modules.RBAC]: { rbac_role_id: "role_super_admin" },
    })
  }
  const policies: string[] = []
  for (const resource of ["product", "product_variant", "product_option", "product_category", "product_collection", "product_type", "product_tag", "price", "brand"]) {
    for (const operation of ["read", "create", "update"]) {
      const key = `${resource}:${operation}`
      const existing = await rbac.listRbacPolicies({ key })
      if (existing.length) policies.push(existing[0].id)
      else {
        const { result } = await createRbacPoliciesWorkflow(container).run({ input: { policies: [{ key, name: key, resource, operation }] } })
        policies.push(result[0].id)
      }
    }
  }
  let [manager] = await rbac.listRbacRoles({ name: "Catalog Manager" })
  if (!manager) {
    const { result } = await createRbacRolesWorkflow(container).run({ input: { roles: [{ name: "Catalog Manager", description: "Create and edit catalog and prices; no deletion or non-catalog access." }] } })
    manager = result[0]
  }
  const assigned = await rbac.listRbacRolePolicies({ role_id: manager.id })
  const missing = policies.filter((id) => !assigned.some((link) => link.policy_id === id))
  if (missing.length) await createRbacRolePoliciesWorkflow(container).run({ input: { actor_id: adminId, policies: missing.map((id) => ({ role_id: manager.id, policy_id: id })) } })
  container.resolve(ContainerRegistrationKeys.LOGGER).info(`Catalog Manager role ready: ${manager.id}. Assign it through native admin role management, then sign in again.`)
}
