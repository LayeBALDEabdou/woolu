import type { UserRole } from "@/features/auth/types"
import type { ClaimWindowDays } from "@/lib/config/business-rules"
import type { CurrencyCode, ISODateOnly, ISODateString, Money } from "@/types/common"

export const TRANSACTION_KINDS = ["product", "service"] as const
export type TransactionKind = (typeof TRANSACTION_KINDS)[number]

/**
 * Cycle de vie d'une transaction. L'ordre reflète le parcours nominal.
 * Les transitions autorisées sont définies dans domain/transitions.ts.
 */
export const TRANSACTION_STATUSES = [
  "created",
  "pending_acceptance",
  "pending_payment",
  "payment_confirmed",
  "in_progress",
  "awaiting_confirmation",
  "disputed",
  "completed",
  "cancelled",
  "refunded",
] as const
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]

/** Rôle d'un utilisateur au sein d'une transaction donnée. */
export type PartyRole = "merchant" | "client"

export interface PartySummary {
  /** null si la personne n'a pas encore de compte Wóolu (invitation en attente). */
  userId: string | null
  fullName: string
  email: string | null
  phone: string | null
  role: UserRole
}

/**
 * État du séquestre tel que CONFIRMÉ par le backend.
 * « held » est la seule valeur autorisant l'affichage « fonds bloqués ».
 */
export type EscrowStatus = "not_started" | "held" | "released" | "refunded"

export interface EscrowState {
  status: EscrowStatus
  /** Horodatage de la confirmation par le backend du dernier changement d'état. */
  updatedAt: ISODateString | null
}

export const TRANSACTION_EVENT_TYPES = [
  "created",
  "sent_to_client",
  "terms_accepted",
  "terms_refused",
  "cancelled",
  "payment_initiated",
  "payment_failed",
  "payment_expired",
  "payment_confirmed",
  "escrow_held",
  "delivery_started",
  "delivery_completed",
  "receipt_confirmed",
  "dispute_opened",
  "dispute_resolved",
  "funds_released",
  "refunded",
] as const
export type TransactionEventType = (typeof TRANSACTION_EVENT_TYPES)[number]

export interface TransactionEvent {
  id: string
  type: TransactionEventType
  at: ISODateString
  actor: PartyRole | "system"
  actorName: string | null
  note: string | null
}

export const DELIVERY_METHODS = [
  "hand_delivery",
  "courier",
  "carrier",
  "on_site",
  "remote",
] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

export interface DeliveryInfo {
  method: DeliveryMethod
  carrier: string | null
  trackingNumber: string | null
  note: string | null
  startedAt: ISODateString
  completedAt: ISODateString | null
  completionNote: string | null
}

export interface TransactionSummary {
  id: string
  reference: string
  title: string
  kind: TransactionKind
  amount: Money
  status: TransactionStatus
  merchant: PartySummary
  client: PartySummary
  /** Date limite de livraison / d'exécution. */
  deadline: ISODateOnly
  createdAt: ISODateString
  updatedAt: ISODateString
  escrow: EscrowState
  activeDisputeId: string | null
}

export interface Transaction extends TransactionSummary {
  description: string
  specialConditions: string | null
  claimWindowDays: ClaimWindowDays
  merchantAcceptedAt: ISODateString | null
  clientAcceptedAt: ISODateString | null
  delivery: DeliveryInfo | null
  disputeIds: string[]
  events: TransactionEvent[]
}

export interface CreateTransactionInput {
  title: string
  kind: TransactionKind
  description: string
  clientName: string
  clientContact: string
  amount: number
  currency: CurrencyCode
  deadline: ISODateOnly
  specialConditions: string | null
  claimWindowDays: ClaimWindowDays
  /** Acceptation explicite des conditions par le vendeur / prestataire. */
  merchantAcceptsTerms: true
}

export const TRANSACTION_PERIODS = ["7d", "30d", "90d", "all"] as const
export type TransactionPeriod = (typeof TRANSACTION_PERIODS)[number]

export const TRANSACTION_SORTS = [
  "created_desc",
  "created_asc",
  "amount_desc",
  "amount_asc",
  "deadline_asc",
] as const
export type TransactionSort = (typeof TRANSACTION_SORTS)[number]

export interface TransactionListParams {
  search?: string
  status?: TransactionStatus | "all"
  period?: TransactionPeriod
  sort?: TransactionSort
  page?: number
  pageSize?: number
}

export interface ActivityItem {
  id: string
  transactionId: string
  transactionReference: string
  transactionTitle: string
  event: TransactionEvent
}

export interface DashboardSummary {
  totalCount: number
  pendingCount: number
  inProgressCount: number
  completedCount: number
  openDisputesCount: number
  /** Somme des montants dont le séquestre est confirmé (escrow « held ») par le serveur. */
  fundsHeld: Money
  fundsHeldCount: number
  /** Transactions sur lesquelles l'utilisateur connecté a une action à mener. */
  needsAttention: TransactionSummary[]
  recentActivity: ActivityItem[]
}
