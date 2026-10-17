import type { HttpClient } from "@/lib/api/http-client"
import type { PaymentAttempt, PaymentMethod } from "../types"

/**
 * Paiements. Le navigateur ne parle JAMAIS directement à Bitnob :
 * le backend crée la facture, reçoit les webhooks et confirme le paiement.
 */
export interface PaymentService {
  listForTransaction(transactionId: string): Promise<PaymentAttempt[]>
  listHistory(): Promise<PaymentAttempt[]>
  /** Demande au backend de générer une facture. Ne marque jamais un paiement comme réussi. */
  initiate(transactionId: string, method: PaymentMethod): Promise<PaymentAttempt>
  /** Relit l'état d'une tentative tel que connu du serveur. */
  getAttempt(attemptId: string): Promise<PaymentAttempt>
}

export function createHttpPaymentService(http: HttpClient): PaymentService {
  return {
    listForTransaction: (transactionId) =>
      http.get(`/api/transactions/${encodeURIComponent(transactionId)}/payments`),
    listHistory: () => http.get("/api/payments"),
    initiate: (transactionId, method) =>
      http.post(`/api/transactions/${encodeURIComponent(transactionId)}/payments`, { method }),
    getAttempt: (attemptId) => http.get(`/api/payments/${encodeURIComponent(attemptId)}`),
  }
}
