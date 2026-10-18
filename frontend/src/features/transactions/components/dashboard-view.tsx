"use client"

import Link from "next/link"
import { AlertCircle, ArrowRight } from "lucide-react"
import { Amount } from "@/components/data-display/amount"
import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback/states"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useServices } from "@/components/providers/services-provider"
import { useCurrentUser } from "@/features/auth/hooks"
import { isMerchantRole } from "@/features/auth/roles"
import { formatDate, formatRelative } from "@/lib/formatters/date"
import { EVENT_LABELS, getActionLabel } from "../domain/presentation"
import { getAvailableActions } from "../domain/transitions"
import { useDashboardSummary } from "../hooks"
import { getCounterpart } from "./counterpart"
import { DashboardOverview } from "./dashboard-overview"
import { TransactionStatusBadge } from "./transaction-status-badge"

export function DashboardView() {
  const user = useCurrentUser()
  const { demo } = useServices()
  const summary = useDashboardSummary()
  const isMerchant = isMerchantRole(user.role)
  const firstName = user.fullName.split(" ")[0]

  return (
    <>
      <PageHeader
        title={`Bonjour ${firstName}`}
        description={
          isMerchant
            ? "Suivez vos ventes et prestations, et les actions qui vous attendent."
            : "Suivez vos achats, vos paiements et les propositions qui vous sont adressées."
        }
      />

      {summary.isPending ? (
        <LoadingRows rows={3} />
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <div className="space-y-8">
          <DashboardOverview summary={summary.data} isMerchant={isMerchant} isDemo={Boolean(demo)} />

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-warning" aria-hidden />
                  À traiter
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary.data.needsAttention.length === 0 ? (
                  <EmptyState
                    title="Rien à traiter pour le moment"
                    description="Les transactions qui attendent une action de votre part apparaîtront ici."
                  />
                ) : (
                  <ul className="divide-y">
                    {summary.data.needsAttention.map((transaction) => {
                      const nextAction = getAvailableActions(transaction, { userId: user.id }).find((a) => a !== "cancel")
                      return (
                        <li key={transaction.id}>
                          <Link
                            href={`/transactions/${transaction.id}`}
                            className="-mx-2 flex flex-col gap-2 rounded-lg px-2 py-3 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium text-foreground">{transaction.title}</p>
                                <TransactionStatusBadge status={transaction.status} kind={transaction.kind} />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {transaction.reference} · {getCounterpart(transaction, user.id).fullName} · échéance{" "}
                                {formatDate(transaction.deadline)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 sm:shrink-0">
                              <Amount value={transaction.amount} className="text-sm font-semibold" />
                              {nextAction ? (
                                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                                  {getActionLabel(nextAction, transaction.kind)}
                                  <ArrowRight className="size-4" aria-hidden />
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune activité pour le moment.</p>
                ) : (
                  <ol className="space-y-4">
                    {summary.data.recentActivity.map((item) => (
                      <li key={item.id} className="flex gap-3">
                        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />
                        <div className="min-w-0 text-sm">
                          <p className="text-foreground">{EVENT_LABELS[item.event.type]}</p>
                          <Link
                            href={`/transactions/${item.transactionId}`}
                            className="block truncate text-muted-foreground hover:text-brand-700 hover:underline"
                          >
                            {item.transactionReference} · {item.transactionTitle}
                          </Link>
                          <p className="text-xs text-muted-foreground">{formatRelative(item.event.at)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </>
  )
}
