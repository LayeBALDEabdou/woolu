import type { PartyRole, TransactionStatus, TransactionSummary } from "../types"

/**
 * Graphe complet des transitions de statut autorisées.
 * Toute transition absente de ce graphe est incohérente et doit être refusée.
 * Le backend reste l'autorité : ce modèle sert à l'affichage et au backend simulé.
 */
export const STATUS_TRANSITIONS: Record<TransactionStatus, readonly TransactionStatus[]> = {
  created: ["pending_acceptance", "cancelled"],
  pending_acceptance: ["pending_payment", "cancelled"],
  // Seule la confirmation serveur du paiement fait passer à « payment_confirmed ».
  pending_payment: ["payment_confirmed", "cancelled"],
  payment_confirmed: ["in_progress", "disputed"],
  in_progress: ["awaiting_confirmation", "completed", "disputed"],
  awaiting_confirmation: ["completed", "disputed"],
  // L'issue d'un litige est décidée exclusivement par le backend.
  disputed: ["completed", "refunded"],
  completed: [],
  cancelled: [],
  refunded: [],
}

export const TERMINAL_STATUSES: readonly TransactionStatus[] = ["completed", "cancelled", "refunded"]

export function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to)
}

export function isTerminalStatus(status: TransactionStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

/** Actions qu'un utilisateur peut déclencher depuis l'interface. */
export const TRANSACTION_ACTIONS = [
  "send_to_client",
  "accept_terms",
  "refuse_terms",
  "cancel",
  "pay",
  "start_delivery",
  "mark_delivered",
  "confirm_receipt",
  "open_dispute",
] as const
export type TransactionAction = (typeof TRANSACTION_ACTIONS)[number]

interface ActionRule {
  /** Statut visé, ou null si l'action ne change pas directement le statut (ex. paiement). */
  to: TransactionStatus | null
  /** Statuts depuis lesquels chaque partie peut déclencher l'action. */
  allowedFrom: Partial<Record<PartyRole, readonly TransactionStatus[]>>
}

export const ACTION_RULES: Record<TransactionAction, ActionRule> = {
  send_to_client: { to: "pending_acceptance", allowedFrom: { merchant: ["created"] } },
  accept_terms: { to: "pending_payment", allowedFrom: { client: ["pending_acceptance"] } },
  refuse_terms: { to: "cancelled", allowedFrom: { client: ["pending_acceptance"] } },
  cancel: {
    to: "cancelled",
    allowedFrom: {
      merchant: ["created", "pending_acceptance", "pending_payment"],
      client: ["pending_payment"],
    },
  },
  // Le paiement crée une tentative ; seul le serveur confirme et change le statut.
  pay: { to: null, allowedFrom: { client: ["pending_payment"] } },
  start_delivery: { to: "in_progress", allowedFrom: { merchant: ["payment_confirmed"] } },
  mark_delivered: { to: "awaiting_confirmation", allowedFrom: { merchant: ["in_progress"] } },
  confirm_receipt: {
    to: "completed",
    allowedFrom: { client: ["in_progress", "awaiting_confirmation"] },
  },
  open_dispute: {
    to: "disputed",
    allowedFrom: { client: ["payment_confirmed", "in_progress", "awaiting_confirmation"] },
  },
}

export interface Viewer {
  userId: string
}

/** Rôle de l'utilisateur dans la transaction, ou null s'il n'y est pas partie prenante. */
export function getPartyRole(
  transaction: Pick<TransactionSummary, "merchant" | "client">,
  viewer: Viewer,
): PartyRole | null {
  if (transaction.merchant.userId === viewer.userId) return "merchant"
  if (transaction.client.userId === viewer.userId) return "client"
  return null
}

type ActionContext = Pick<
  TransactionSummary,
  "status" | "merchant" | "client" | "escrow" | "activeDisputeId"
>

export type ActionCheck = { allowed: true } | { allowed: false; reason: string }

/**
 * Vérifie si une action est permise pour cet utilisateur dans l'état courant.
 * Retourne une raison lisible lorsqu'elle est refusée (affichée à l'utilisateur).
 */
export function checkAction(
  action: TransactionAction,
  transaction: ActionContext,
  viewer: Viewer,
): ActionCheck {
  const partyRole = getPartyRole(transaction, viewer)
  if (!partyRole) {
    return { allowed: false, reason: "Vous n'êtes pas partie prenante de cette transaction." }
  }
  const rule = ACTION_RULES[action]
  const allowedStatuses = rule.allowedFrom[partyRole]
  if (!allowedStatuses) {
    return { allowed: false, reason: "Cette action n'est pas disponible pour votre rôle." }
  }
  if (!allowedStatuses.includes(transaction.status)) {
    return {
      allowed: false,
      reason: "Cette action n'est pas possible dans l'état actuel de la transaction.",
    }
  }
  if (rule.to && !canTransition(transaction.status, rule.to)) {
    return { allowed: false, reason: "Transition de statut incohérente." }
  }
  if (action === "open_dispute" && transaction.activeDisputeId) {
    return { allowed: false, reason: "Une réclamation est déjà en cours pour cette transaction." }
  }
  if (action === "confirm_receipt" && transaction.escrow.status !== "held") {
    return {
      allowed: false,
      reason: "Le séquestre des fonds n'est pas confirmé par le serveur.",
    }
  }
  return { allowed: true }
}

export function getAvailableActions(
  transaction: ActionContext,
  viewer: Viewer,
): TransactionAction[] {
  return TRANSACTION_ACTIONS.filter((action) => checkAction(action, transaction, viewer).allowed)
}

/** Actions qui demandent une intervention de l'utilisateur (hors annulation). */
export function needsViewerAttention(transaction: ActionContext, viewer: Viewer): boolean {
  return getAvailableActions(transaction, viewer).some((action) => action !== "cancel")
}
