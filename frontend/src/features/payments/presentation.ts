import type { StatusTone } from "@/components/data-display/status-badge"
import type { PaymentAttemptStatus, PaymentMethod } from "./types"

export const PAYMENT_STATUS_PRESENTATION: Record<
  PaymentAttemptStatus,
  { label: string; tone: StatusTone }
> = {
  pending: { label: "En attente", tone: "pending" },
  confirmed: { label: "Confirmé", tone: "success" },
  failed: { label: "Échoué", tone: "danger" },
  expired: { label: "Expiré", tone: "muted" },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  usdc: "USDC sur Solana (via Bitnob)",
}
