import { Check, CircleSlash, Scale, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { NOMINAL_STEPS, getStatusLabel } from "../domain/presentation"
import type { TransactionKind, TransactionStatus } from "../types"

/** Dernière étape nominale atteinte avant un état « hors parcours » (litige, annulation, remboursement). */
function lastNominalIndex(status: TransactionStatus, reachedStatuses: TransactionStatus[]): number {
  const direct = NOMINAL_STEPS.indexOf(status)
  if (direct >= 0) return direct
  return Math.max(...reachedStatuses.map((s) => NOMINAL_STEPS.indexOf(s)).filter((i) => i >= 0), 0)
}

const OFF_TRACK = {
  disputed: { icon: Scale, label: "Litige en cours", tone: "border-warning/40 bg-warning-surface text-warning-foreground" },
  cancelled: { icon: CircleSlash, label: "Transaction annulée", tone: "border-border bg-muted text-muted-foreground" },
  refunded: { icon: Undo2, label: "Remboursement autorisé", tone: "border-destructive/30 bg-danger-surface text-destructive" },
} as const

interface TransactionProgressProps {
  status: TransactionStatus
  kind: TransactionKind
  /** Statuts effectivement traversés (déduits de l'historique) pour situer un état hors parcours. */
  reachedStatuses: TransactionStatus[]
}

export function TransactionProgress({ status, kind, reachedStatuses }: TransactionProgressProps) {
  const current = lastNominalIndex(status, reachedStatuses)
  const offTrack = status in OFF_TRACK ? OFF_TRACK[status as keyof typeof OFF_TRACK] : null

  return (
    <div className="space-y-3">
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Progression de la transaction">
        {NOMINAL_STEPS.map((step, index) => {
          const done = index < current || (index === current && status === "completed")
          const isCurrent = index === current && !done && !offTrack
          const label = getStatusLabel(step, kind)
          return (
            <li key={step} className="min-w-0" aria-current={isCurrent ? "step" : undefined}>
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  done ? "bg-brand-600" : isCurrent ? "bg-brand-500/60" : "bg-border",
                )}
              />
              <p
                className={cn(
                  "mt-2 hidden text-[0.7rem] leading-tight md:block",
                  isCurrent ? "font-semibold text-foreground" : done ? "text-foreground/80" : "text-muted-foreground",
                )}
              >
                {done ? <Check className="mr-0.5 inline size-3 text-brand-600" aria-hidden /> : null}
                {label}
              </p>
              <span className="sr-only md:hidden">
                {label} : {done ? "terminé" : isCurrent ? "en cours" : "à venir"}
              </span>
            </li>
          )
        })}
      </ol>
      {offTrack ? (
        <p className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium", offTrack.tone)}>
          <offTrack.icon className="size-4" aria-hidden />
          {offTrack.label}
        </p>
      ) : null}
    </div>
  )
}
