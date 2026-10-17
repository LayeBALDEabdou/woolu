import type { StatusTone } from "@/components/data-display/status-badge"
import type {
  DeliveryMethod,
  TransactionEventType,
  TransactionKind,
  TransactionPeriod,
  TransactionSort,
  TransactionStatus,
} from "../types"
import type { TransactionAction } from "./transitions"

interface StatusPresentation {
  label: string
  /** Variante du libellé quand la transaction est une prestation de service. */
  serviceLabel?: string
  description: string
  tone: StatusTone
}

export const STATUS_PRESENTATION: Record<TransactionStatus, StatusPresentation> = {
  created: {
    label: "Créée",
    description: "La proposition est prête mais n'a pas encore été envoyée au client.",
    tone: "neutral",
  },
  pending_acceptance: {
    label: "En attente d'acceptation",
    description: "Le client doit accepter ou refuser les conditions proposées.",
    tone: "pending",
  },
  pending_payment: {
    label: "En attente de paiement",
    description: "Les conditions sont acceptées. Le client doit effectuer le paiement.",
    tone: "pending",
  },
  payment_confirmed: {
    label: "Paiement confirmé",
    description: "Le serveur a confirmé le paiement. Le vendeur peut livrer.",
    tone: "info",
  },
  in_progress: {
    label: "Livraison en cours",
    serviceLabel: "Réalisation en cours",
    description: "Le vendeur ou prestataire a démarré la livraison ou la prestation.",
    tone: "info",
  },
  awaiting_confirmation: {
    label: "En attente de confirmation",
    description: "La livraison est déclarée terminée. Le client doit confirmer ou signaler un problème.",
    tone: "pending",
  },
  disputed: {
    label: "Litige en cours",
    description: "Une réclamation est ouverte. Les fonds restent bloqués jusqu'à la décision.",
    tone: "warning",
  },
  completed: {
    label: "Terminée",
    description: "La transaction est clôturée et la libération des fonds a été autorisée.",
    tone: "success",
  },
  cancelled: {
    label: "Annulée",
    description: "La transaction a été annulée avant tout paiement confirmé.",
    tone: "muted",
  },
  refunded: {
    label: "Remboursée",
    description: "Le remboursement du client a été décidé par Wóolu.",
    tone: "danger",
  },
}

export function getStatusLabel(status: TransactionStatus, kind?: TransactionKind): string {
  const presentation = STATUS_PRESENTATION[status]
  return kind === "service" && presentation.serviceLabel
    ? presentation.serviceLabel
    : presentation.label
}

/** Étapes du parcours nominal affichées dans la frise de progression. */
export const NOMINAL_STEPS: readonly TransactionStatus[] = [
  "created",
  "pending_acceptance",
  "pending_payment",
  "payment_confirmed",
  "in_progress",
  "awaiting_confirmation",
  "completed",
]

export const KIND_LABELS: Record<TransactionKind, string> = {
  product: "Vente de produit",
  service: "Prestation de service",
}

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  hand_delivery: "Remise en main propre",
  courier: "Livreur / coursier",
  carrier: "Transporteur (avec suivi)",
  on_site: "Prestation sur place",
  remote: "Prestation à distance",
}

export const DELIVERY_METHODS_BY_KIND: Record<TransactionKind, readonly DeliveryMethod[]> = {
  product: ["hand_delivery", "courier", "carrier"],
  service: ["on_site", "remote"],
}

export const EVENT_LABELS: Record<TransactionEventType, string> = {
  created: "Transaction créée",
  sent_to_client: "Proposition envoyée au client",
  terms_accepted: "Conditions acceptées par le client",
  terms_refused: "Conditions refusées par le client",
  cancelled: "Transaction annulée",
  payment_initiated: "Facture de paiement générée",
  payment_failed: "Échec du paiement",
  payment_expired: "Facture expirée",
  payment_confirmed: "Paiement confirmé par le serveur",
  escrow_held: "Fonds bloqués (séquestre confirmé)",
  delivery_started: "Livraison / prestation démarrée",
  delivery_completed: "Livraison / prestation déclarée terminée",
  receipt_confirmed: "Réception confirmée par le client",
  dispute_opened: "Réclamation ouverte",
  dispute_resolved: "Litige tranché par Wóolu",
  funds_released: "Libération des fonds autorisée",
  refunded: "Remboursement autorisé",
}

export const ACTION_LABELS: Record<TransactionAction, string> = {
  send_to_client: "Envoyer au client",
  accept_terms: "Accepter les conditions",
  refuse_terms: "Refuser",
  cancel: "Annuler la transaction",
  pay: "Procéder au paiement",
  start_delivery: "Déclarer l'expédition",
  mark_delivered: "Déclarer la livraison terminée",
  confirm_receipt: "Confirmer la réception",
  open_dispute: "Signaler un problème",
}

export function getActionLabel(action: TransactionAction, kind: TransactionKind): string {
  if (kind === "service") {
    if (action === "start_delivery") return "Démarrer la prestation"
    if (action === "mark_delivered") return "Déclarer la prestation réalisée"
    if (action === "confirm_receipt") return "Confirmer la prestation"
  }
  return ACTION_LABELS[action]
}

export const PERIOD_LABELS: Record<TransactionPeriod, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "3 derniers mois",
  all: "Toutes les dates",
}

export const SORT_LABELS: Record<TransactionSort, string> = {
  created_desc: "Plus récentes",
  created_asc: "Plus anciennes",
  amount_desc: "Montant décroissant",
  amount_asc: "Montant croissant",
  deadline_asc: "Échéance la plus proche",
}
