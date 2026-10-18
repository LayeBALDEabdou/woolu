import type { StatusTone } from "@/components/data-display/status-badge"
import type { TransactionKind } from "@/features/transactions/types"
import type { DisputeOutcome, DisputeReason, DisputeStatus } from "./types"

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  not_received: "Produit non reçu",
  not_as_described: "Produit non conforme",
  service_not_performed: "Service non réalisé",
  significant_delay: "Retard important",
  other: "Autre problème",
}

/** Motifs pertinents selon la nature de la transaction. */
export const DISPUTE_REASONS_BY_KIND: Record<TransactionKind, readonly DisputeReason[]> = {
  product: ["not_received", "not_as_described", "significant_delay", "other"],
  service: ["service_not_performed", "significant_delay", "other"],
}

export const DISPUTE_STATUS_PRESENTATION: Record<
  DisputeStatus,
  { label: string; description: string; tone: StatusTone }
> = {
  open: {
    label: "Ouverte",
    description: "La réclamation est enregistrée. Le vendeur ou prestataire est invité à répondre.",
    tone: "warning",
  },
  awaiting_response: {
    label: "En attente de réponse",
    description: "Wóolu attend des informations complémentaires de l'une des parties.",
    tone: "pending",
  },
  under_review: {
    label: "En examen",
    description: "L'équipe Wóolu examine les éléments fournis par les deux parties.",
    tone: "info",
  },
  resolved: {
    label: "Résolue",
    description: "Une décision a été prise par l'équipe Wóolu.",
    tone: "success",
  },
  closed: {
    label: "Clôturée",
    description: "Le dossier est clos.",
    tone: "muted",
  },
}

export const DISPUTE_OUTCOME_LABELS: Record<DisputeOutcome, string> = {
  release_to_merchant: "Libération des fonds au vendeur / prestataire",
  refund_client: "Remboursement du client",
}

export function isDisputeActive(status: DisputeStatus): boolean {
  return status === "open" || status === "awaiting_response" || status === "under_review"
}
