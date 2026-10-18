import type { ISODateString, Money } from "@/types/common"

/** Méthodes de paiement disponibles côté backend. */
export const PAYMENT_METHODS = ["usdc"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_ATTEMPT_STATUSES = ["pending", "confirmed", "failed", "expired"] as const
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number]

/** Adresse USDC et montant demandés par le serveur auprès de Bitnob. */
export interface UsdcDeposit {
  address: string
  network: "solana"
  amountUsdc: string
  receivedUsdc: string
  reference: string
}

export interface PaymentAttempt {
  id: string
  transactionId: string
  transactionReference: string
  transactionTitle: string
  method: PaymentMethod
  status: PaymentAttemptStatus
  amount: Money
  deposit: UsdcDeposit
  createdAt: ISODateString
  updatedAt: ISODateString
  confirmedAt: ISODateString | null
  failureReason: string | null
  /** Positionné par le backend : true si la facture est fictive (mode démo / bac à sable). */
  isSimulated: boolean
}
