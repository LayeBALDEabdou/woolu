import type { TransactionSummary } from "@/features/transactions/types"
import type { PaymentAttempt } from "./types"

/** Tentative encore en cours (adresse de dépôt créée, paiement non confirmé). */
export function findPendingAttempt(attempts: PaymentAttempt[]): PaymentAttempt | undefined {
  return attempts.find((attempt) => attempt.status === "pending")
}

/**
 * Un nouveau paiement peut être initié si la transaction attend un paiement
 * et qu'aucune facture n'est déjà en attente.
 */
export function canInitiatePayment(
  transaction: Pick<TransactionSummary, "status">,
  attempts: PaymentAttempt[],
): boolean {
  return transaction.status === "pending_payment" && !findPendingAttempt(attempts)
}

/**
 * Les fonds ne sont présentés comme bloqués que si le backend a confirmé le séquestre.
 * Un paiement confirmé ne suffit pas à lui seul.
 */
export function areFundsHeld(transaction: Pick<TransactionSummary, "escrow">): boolean {
  return transaction.escrow.status === "held" && transaction.escrow.updatedAt !== null
}
