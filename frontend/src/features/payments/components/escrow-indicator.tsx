import { CircleDashed, Lock, LockOpen, ShieldAlert, Undo2 } from "lucide-react"
import { formatDateTime } from "@/lib/formatters/date"
import { cn } from "@/lib/utils"
import type { TransactionSummary } from "@/features/transactions/types"
import { areFundsHeld } from "../rules"

/**
 * Affiche l'état des fonds tel que CONFIRMÉ par le backend.
 * « Fonds bloqués » n'apparaît que si le séquestre est confirmé (escrow.status === "held").
 */
export function EscrowIndicator({
  transaction,
  className,
}: {
  transaction: Pick<TransactionSummary, "escrow" | "status">
  className?: string
}) {
  const { escrow, status } = transaction
  const base = "flex items-start gap-3 rounded-xl border p-4 text-sm"

  if (areFundsHeld(transaction)) {
    return (
      <div className={cn(base, "border-brand-500/30 bg-brand-50", className)} data-testid="escrow-held">
        <Lock className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
        <div>
          <p className="font-semibold text-brand-900">Fonds bloqués</p>
          <p className="text-muted-foreground">
            Séquestre confirmé par le serveur le {formatDateTime(escrow.updatedAt!)}. Les fonds ne
            seront libérés qu&apos;après confirmation du client ou décision de Wóolu.
          </p>
        </div>
      </div>
    )
  }

  if (escrow.status === "released") {
    return (
      <div className={cn(base, "bg-card", className)}>
        <LockOpen className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
        <div>
          <p className="font-semibold text-foreground">Libération des fonds autorisée</p>
          <p className="text-muted-foreground">
            {escrow.updatedAt ? `Confirmée par le serveur le ${formatDateTime(escrow.updatedAt)}.` : null}
          </p>
        </div>
      </div>
    )
  }

  if (escrow.status === "refunded") {
    return (
      <div className={cn(base, "border-destructive/20 bg-danger-surface", className)}>
        <Undo2 className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <div>
          <p className="font-semibold text-foreground">Remboursement autorisé</p>
          <p className="text-muted-foreground">
            {escrow.updatedAt ? `Confirmé par le serveur le ${formatDateTime(escrow.updatedAt)}.` : null}
          </p>
        </div>
      </div>
    )
  }

  // Paiement confirmé mais séquestre non encore confirmé : on ne prétend pas que les fonds sont bloqués.
  if (status === "payment_confirmed" || status === "in_progress" || status === "awaiting_confirmation") {
    return (
      <div className={cn(base, "border-warning/30 bg-warning-surface", className)}>
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning-foreground" aria-hidden />
        <div>
          <p className="font-semibold text-warning-foreground">Séquestre en attente de confirmation</p>
          <p className="text-warning-foreground/90">
            Le serveur n&apos;a pas encore confirmé le blocage des fonds. Ne livrez pas avant cette confirmation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(base, "bg-card", className)}>
      <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-semibold text-foreground">Aucun fonds bloqué</p>
        <p className="text-muted-foreground">Aucun paiement n&apos;a été confirmé pour cette transaction.</p>
      </div>
    </div>
  )
}
