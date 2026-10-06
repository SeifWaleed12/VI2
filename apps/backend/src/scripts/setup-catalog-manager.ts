import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { createRbacPoliciesWorkflow, createRbacRolesWorkflow, createRbacRolePoliciesWorkflow, deleteRbacRolePoliciesWorkflow, updateRbacRolesWorkflow } from "@medusajs/medusa/core-flows"
import { managerPolicyGrants } from "../lib/manager-role"

const MANAGER_DESCRIPTION = "Runs the shop: orders, catalog, brands, customers, promotions and price lists. No store settings, staff, API keys or stock settings."

// Run after native migrations. Explicitly names the bootstrap administrator;
// never upgrades all existing staff or silently assigns manager privileges.
export default async function setupCatalogManager({ container, args }: ExecArgs) {
  const adminId = args[0]
  if (!adminId?.startsWith("user_")) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Supply the existing administrator's user ID")
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
  // The role's permissions come from the same table as the request guard.
  for (const { resource, operation } of managerPolicyGrants()) {
    const key = `${resource}:${operation}`
    const existing = await rbac.listRbacPolicies({ key })
    if (existing.length) policies.push(existing[0].id)
    else {
      const { result } = await createRbacPoliciesWorkflow(container).run({ input: { policies: [{ key, name: key, resource, operation }] } })
      policies.push(result[0].id)
    }
  }
  let [manager] = await rbac.listRbacRoles({ name: "Catalog Manager" })
  if (!manager) {
    const { result } = await createRbacRolesWorkflow(container).run({ input: { roles: [{ name: "Catalog Manager", description: MANAGER_DESCRIPTION }] } })
    manager = result[0]
  } else if (manager.description !== MANAGER_DESCRIPTION) {
    await updateRbacRolesWorkflow(container).run({ input: { selector: { id: manager.id }, update: { description: MANAGER_DESCRIPTION } } })
  }
  const assigned = await rbac.listRbacRolePolicies({ role_id: manager.id })
  const missing = policies.filter((id) => !assigned.some((link) => link.policy_id === id))
  if (missing.length) await createRbacRolePoliciesWorkflow(container).run({ input: { actor_id: adminId, policies: missing.map((id) => ({ role_id: manager.id, policy_id: id })) } })
  // The role holds exactly the table's permissions: anything it no longer
  // grants (for example reservation writes) is removed from the role.
  const obsolete = assigned.filter((link) => !policies.includes(link.policy_id))
  if (obsolete.length) await deleteRbacRolePoliciesWorkflow(container).run({ input: { role_policy_ids: obsolete.map((link) => link.id) } })
  container.resolve(ContainerRegistrationKeys.LOGGER).info(`Catalog Manager role ready: ${manager.id}. Assign it through native admin role management, then sign in again.`)
}
