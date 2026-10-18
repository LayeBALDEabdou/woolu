import Link from "next/link"
import { Lock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/formatters/money"
import { cn } from "@/lib/utils"
import type { DashboardSummary } from "../types"

interface DashboardOverviewProps {
  summary: DashboardSummary
  isMerchant: boolean
  isDemo: boolean
}

const PHASES = [
  { key: "pending", label: "En attente", color: "bg-warning", href: "/transactions" },
  { key: "inProgress", label: "En cours", color: "bg-brand-600", href: "/transactions" },
  { key: "disputed", label: "En litige", color: "bg-destructive", href: "/reclamations" },
  { key: "completed", label: "Terminées", color: "bg-brand-800", href: "/transactions" },
  { key: "other", label: "Annulées ou remboursées", color: "bg-input", href: "/transactions" },
] as const

/**
 * Vue d'ensemble : ce qui compte d'abord (l'argent actuellement bloqué), puis la répartition
 * des transactions par phase. Les chiffres proviennent du résumé renvoyé par le serveur.
 */
export function DashboardOverview({ summary, isMerchant, isDemo }: DashboardOverviewProps) {
  const counts = {
    pending: summary.pendingCount,
    inProgress: summary.inProgressCount,
    disputed: summary.openDisputesCount,
    completed: summary.completedCount,
    other: Math.max(
      0,
      summary.totalCount -
        summary.pendingCount -
        summary.inProgressCount -
        summary.openDisputesCount -
        summary.completedCount,
    ),
  }
  const total = summary.totalCount

  return (
    <section aria-label="Vue d'ensemble" className="gap-4 lg:grid-cols-[1.1fr_1fr] grid">
      <div className="gap-6 p-6 sm:p-7 flex flex-col justify-between rounded-[1.75rem] bg-brand-800 text-brand-50">
        <div className="gap-4 flex items-start justify-between">
          <p className="gap-2 text-sm flex items-center text-brand-100/85">
            <Lock className="size-4 text-mint" aria-hidden />
            {isMerchant ? "En attente de libération pour vous" : "Bloqués en votre faveur"}
          </p>
          {isDemo ? (
            <span className="px-2.5 py-0.5 text-xs rounded-full bg-brand-900/60 text-mint">
              Fictif
            </span>
          ) : null}
        </div>
        <div>
          <p className="type-poster tabular text-5xl font-bold text-white sm:text-6xl">
            {formatMoney(summary.fundsHeld)}
          </p>
          <p className="mt-2 text-sm text-brand-100/80">
            {summary.fundsHeldCount === 0
              ? "Aucun fonds bloqué pour le moment."
              : `Séquestre confirmé par le serveur sur ${summary.fundsHeldCount} transaction${summary.fundsHeldCount > 1 ? "s" : ""}.`}
          </p>
        </div>
        {isMerchant ? (
          <Button asChild className="hover:bg-white self-start bg-mint text-brand-900">
            <Link href="/transactions/nouvelle">
              <Plus aria-hidden />
              Nouvelle transaction
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 hover:text-white self-start bg-transparent"
          >
            <Link href="/transactions">Voir mes transactions</Link>
          </Button>
        )}
      </div>

      <div className="gap-5 p-6 sm:p-7 flex flex-col rounded-[1.75rem] border bg-card">
        <div className="gap-3 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Vos transactions</h2>
          <Link
            href="/transactions"
            className="tabular text-3xl font-bold font-heading text-brand-900 hover:underline"
          >
            {total}
            <span className="sr-only"> transactions au total</span>
          </Link>
        </div>
        {total > 0 ? (
          <div aria-hidden className="h-3 gap-1 flex overflow-hidden rounded-full">
            {PHASES.filter((phase) => counts[phase.key] > 0).map((phase) => (
              <span
                key={phase.key}
                className={cn("h-full rounded-full", phase.color)}
                style={{ flexGrow: counts[phase.key] }}
              />
            ))}
          </div>
        ) : null}
        <ul className="gap-x-4 gap-y-3 text-sm grid grid-cols-2">
          {PHASES.map((phase) => (
            <li key={phase.key}>
              <Link href={phase.href} className="group gap-2 flex items-center">
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", phase.color)} />
                <span className="text-muted-foreground group-hover:text-foreground">
                  {phase.label}
                </span>
                <span className="tabular font-semibold ml-auto text-foreground">
                  {counts[phase.key]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {isDemo ? (
          <p className="text-xs text-muted-foreground">
            Chiffres calculés à partir des données fictives.
          </p>
        ) : null}
      </div>
    </section>
  )
}
