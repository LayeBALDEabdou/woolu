import type { ISODateString, Money } from "@/types/common"

/** Méthodes de paiement. Seul Lightning (via Bitnob, côté backend) est prévu à ce stade. */
export const PAYMENT_METHODS = ["lightning"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_ATTEMPT_STATUSES = ["pending", "confirmed", "failed", "expired"] as const
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number]

/** Facture Lightning générée par le backend (via Bitnob). */
export interface LightningInvoice {
  /** Chaîne BOLT11 à encoder dans le QR code. */
  paymentRequest: string
  /** Montant converti par le backend ; le frontend ne fait aucune conversion. */
  amountSats: number
  expiresAt: ISODateString
}

export interface PaymentAttempt {
  id: string
  transactionId: string
  transactionReference: string
  transactionTitle: string
  method: PaymentMethod
  status: PaymentAttemptStatus
  amount: Money
  invoice: LightningInvoice | null
  createdAt: ISODateString
  updatedAt: ISODateString
  confirmedAt: ISODateString | null
  failureReason: string | null
  /** Positionné par le backend : true si la facture est fictive (mode démo / bac à sable). */
  isSimulated: boolean
}
