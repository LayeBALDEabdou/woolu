import type { PartyRole } from "@/features/transactions/types"
import type { ISODateString } from "@/types/common"

export const DISPUTE_REASONS = [
  "not_received",
  "not_as_described",
  "service_not_performed",
  "significant_delay",
  "other",
] as const
export type DisputeReason = (typeof DISPUTE_REASONS)[number]

export const DISPUTE_STATUSES = [
  "open",
  "awaiting_response",
  "under_review",
  "resolved",
  "closed",
] as const
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number]

export type DisputeAuthor = PartyRole | "woolu"

export interface DisputeMessage {
  id: string
  author: DisputeAuthor
  authorName: string
  body: string
  createdAt: ISODateString
}

/** Décision prise par l'équipe Wóolu (jamais par le frontend). */
export type DisputeOutcome = "release_to_merchant" | "refund_client"

export interface DisputeDecision {
  outcome: DisputeOutcome
  summary: string
  decidedAt: ISODateString
}

export interface DisputeStatusChange {
  status: DisputeStatus
  at: ISODateString
}

export interface Dispute {
  id: string
  reference: string
  transactionId: string
  transactionReference: string
  transactionTitle: string
  reason: DisputeReason
  description: string
  status: DisputeStatus
  openedByName: string
  merchantUserId: string | null
  merchantName: string
  clientUserId: string | null
  clientName: string
  messages: DisputeMessage[]
  history: DisputeStatusChange[]
  decision: DisputeDecision | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface OpenDisputeInput {
  transactionId: string
  reason: DisputeReason
  description: string
}
