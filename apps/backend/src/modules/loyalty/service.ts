import { InjectManager, InjectTransactionManager, MedusaContext, MedusaService } from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import type { EntityManager } from "@medusajs/framework/mikro-orm/postgresql"
import { PointsEntry } from "./models/points-entry"

class LoyaltyModuleService extends MedusaService({
  PointsEntry,
}) {
  // A database transaction fences every ledger writer even if its Redis lease
  // is lost. The lock is transaction-scoped and requires no second balance.
  @InjectManager()
  @InjectTransactionManager()
  async withCustomerTransaction<T>(customerId: string, work: (context: Context<EntityManager>) => Promise<T>, @MedusaContext() context: Context<EntityManager> = {}): Promise<T> {
    const manager = context.transactionManager!
    await manager.execute("set local lock_timeout = '5s'")
    await manager.execute("set local statement_timeout = '15s'")
    await manager.execute("set local idle_in_transaction_session_timeout = '15s'")
    await manager.execute("select pg_advisory_xact_lock(hashtextextended(?, 0))", [`loyalty:${customerId}`])
    return work(context)
  }

  @InjectManager()
  async pointsTotals(customerId: string, @MedusaContext() context: Context<EntityManager> = {}) {
    const manager = context.transactionManager ?? context.manager!
    const [row] = await manager.execute<{ balance: string, last_activity: string | null }[]>(
      "select coalesce(sum(points), 0) as balance, max(created_at) filter (where kind = 'earn') as last_activity from points_entry where customer_id = ? and deleted_at is null", [customerId])
    return { balance: Number(row.balance), lastActivity: row.last_activity ? new Date(row.last_activity) : null }
  }

  @InjectManager()
  async orderPointsTotal(orderId: string, @MedusaContext() context: Context<EntityManager> = {}) {
    const prefix = orderId.replace(/[\\%_]/g, "\\$&") + "/%"
    const [row] = await (context.transactionManager ?? context.manager!).execute<{ balance: string }[]>(
      "select coalesce(sum(points), 0) as balance from points_entry where deleted_at is null and ((kind = 'earn' and source_id = ?) or (kind = 'refund' and source_id like ?))", [orderId, prefix])
    return Number(row.balance)
  }

  @InjectManager()
  async customerPointPage(after: string, @MedusaContext() context: Context<EntityManager> = {}) {
    return (context.transactionManager ?? context.manager!).execute<{ customer_id: string, balance: string, last_activity: string | null }[]>(
      "select customer_id, sum(points) as balance, max(created_at) filter (where kind = 'earn') as last_activity from points_entry where customer_id > ? and deleted_at is null group by customer_id order by customer_id limit 500", [after])
  }
}

export default LoyaltyModuleService
