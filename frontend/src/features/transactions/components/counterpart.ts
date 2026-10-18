import type { PartySummary, TransactionSummary } from "../types"

/** L'autre partie de la transaction, vue par l'utilisateur connecté. */
export function getCounterpart(transaction: Pick<TransactionSummary, "merchant" | "client">, viewerId: string): PartySummary {
  return transaction.merchant.userId === viewerId ? transaction.client : transaction.merchant
}
