import type { HttpClient } from "@/lib/api/http-client"
import type { DeliveryMethod, Transaction } from "@/features/transactions/types"

export interface StartDeliveryInput {
  method: DeliveryMethod
  carrier: string | null
  trackingNumber: string | null
  note: string | null
}

export interface CompleteDeliveryInput {
  note: string | null
}

export interface DeliveryService {
  start(transactionId: string, input: StartDeliveryInput): Promise<Transaction>
  complete(transactionId: string, input: CompleteDeliveryInput): Promise<Transaction>
  /** Confirmation définitive du client : le backend autorise ensuite la libération des fonds. */
  confirmReceipt(transactionId: string): Promise<Transaction>
}

export function createHttpDeliveryService(http: HttpClient): DeliveryService {
  const path = (id: string) => `/api/transactions/${encodeURIComponent(id)}`
  return {
    start: (id, input) => http.post(`${path(id)}/delivery/start`, input),
    complete: (id, input) => http.post(`${path(id)}/delivery/complete`, input),
    confirmReceipt: (id) => http.post(`${path(id)}/confirm-receipt`),
  }
}
