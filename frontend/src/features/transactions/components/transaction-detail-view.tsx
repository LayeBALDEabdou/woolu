"use client"

import Link from "next/link"
import { CalendarClock, FileText, Scale } from "lucide-react"
import { Amount } from "@/components/data-display/amount"
import { DetailList } from "@/components/data-display/detail-list"
import { StatusBadge } from "@/components/data-display/status-badge"
import { DemoSimulatorPanel } from "@/components/demo/demo-simulator-panel"
import { ErrorState, PageLoading } from "@/components/feedback/states"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrentUser } from "@/features/auth/hooks"
import { DeliveryCard } from "@/features/deliveries/components/delivery-card"
import { EscrowIndicator } from "@/features/payments/components/escrow-indicator"
import { useTransactionPayments } from "@/features/payments/hooks"
import { PAYMENT_STATUS_PRESENTATION } from "@/features/payments/presentation"
import { findPendingAttempt } from "@/features/payments/rules"
import { isApiError } from "@/lib/api/errors"
import { daysUntil, formatDate, formatDateTime } from "@/lib/formatters/date"
import { statusesReachedFromEvents } from "../domain/history"
import { KIND_LABELS } from "../domain/presentation"
import { isTerminalStatus } from "../domain/transitions"
import { useTransaction } from "../hooks"
import type { Transaction } from "../types"
import { PartiesCard } from "./parties-card"
import { TransactionActionsPanel } from "./transaction-actions-panel"
import { TransactionProgress } from "./transaction-progress"
import { TransactionStatusBadge } from "./transaction-status-badge"
import { TransactionTimeline } from "./transaction-timeline"

function DeadlineInfo({ transaction }: { transaction: Transaction }) {
  const deadline = `${transaction.deadline}T23:59:59Z`
  const remaining = daysUntil(deadline)
  const overdue = remaining < 0 && !isTerminalStatus(transaction.status)
  return (
    <span className={overdue ? "font-medium text-destructive" : undefined}>
      {formatDate(deadline)}
      {!isTerminalStatus(transaction.status)
        ? overdue
          ? ` · dépassée de ${Math.abs(remaining)} j`
          : ` · dans ${remaining} j`
        : null}
    </span>
  )
}

function PaymentSummary({ transaction }: { transaction: Transaction }) {
  const payments = useTransactionPayments(transaction.id)
  const latest = payments.data?.[0]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paiement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <EscrowIndicator transaction={transaction} />
        {latest ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Dernière tentative · {formatDateTime(latest.createdAt)}</span>
            <StatusBadge tone={PAYMENT_STATUS_PRESENTATION[latest.status].tone}>
              {PAYMENT_STATUS_PRESENTATION[latest.status].label}
            </StatusBadge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune tentative de paiement.</p>
        )}
        {payments.data && payments.data.length > 0 ? (
          <Link href={`/transactions/${transaction.id}/paiement`} className="text-sm font-medium text-brand-700 hover:underline">
            Détail des paiements ({payments.data.length})
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DemoPanelForTransaction({ transaction }: { transaction: Transaction }) {
  const payments = useTransactionPayments(transaction.id)
  return (
    <DemoSimulatorPanel
      pendingAttempt={payments.data ? findPendingAttempt(payments.data) : null}
      activeDisputeId={transaction.activeDisputeId}
    />
  )
}

export function TransactionDetailView({ id }: { id: string }) {
  const user = useCurrentUser()
  const query = useTransaction(id)

  if (query.isPending) return <PageLoading />
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title={isApiError(query.error) && query.error.code === "NOT_FOUND" ? "Transaction introuvable" : undefined}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const transaction = query.data
  const isService = transaction.kind === "service"

  return (
    <>
      <PageHeader
        back={{ href: "/transactions", label: "Transactions" }}
        title={transaction.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="tabular font-medium text-foreground">{transaction.reference}</span>
            <span aria-hidden>·</span>
            {KIND_LABELS[transaction.kind]}
            <span aria-hidden>·</span>
            créée le {formatDate(transaction.createdAt)}
          </span>
        }
        actions={<TransactionStatusBadge status={transaction.status} kind={transaction.kind} className="h-7 text-sm" />}
      />

      <div className="mb-6 rounded-xl border bg-card p-4">
        <TransactionProgress
          status={transaction.status}
          kind={transaction.kind}
          reachedStatuses={statusesReachedFromEvents(transaction.events)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <TransactionActionsPanel transaction={transaction} viewerId={user.id} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-brand-700" aria-hidden />
                Conditions convenues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">Montant convenu</span>
                <Amount value={transaction.amount} className="text-2xl font-semibold text-brand-900" />
              </div>
              <DetailList
                items={[
                  {
                    label: isService ? "Description du service" : "Description du produit",
                    value: <span className="whitespace-pre-line">{transaction.description}</span>,
                    wide: true,
                  },
                  {
                    label: isService ? "Date limite d'exécution" : "Date limite de livraison",
                    value: <DeadlineInfo transaction={transaction} />,
                  },
                  { label: "Délai de réclamation", value: `${transaction.claimWindowDays} jours après livraison` },
                  { label: "Conditions particulières", value: transaction.specialConditions ?? "Aucune", wide: true },
                ]}
              />
            </CardContent>
          </Card>

          <DeliveryCard transaction={transaction} />

          {transaction.disputeIds.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="size-4 text-warning" aria-hidden />
                  Réclamations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {transaction.disputeIds.map((disputeId) => (
                    <li key={disputeId}>
                      <Link href={`/reclamations/${disputeId}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {disputeId === transaction.activeDisputeId ? "Réclamation en cours" : "Réclamation clôturée"} — voir le dossier
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-brand-700" aria-hidden />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionTimeline events={transaction.events} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PaymentSummary transaction={transaction} />
          <PartiesCard transaction={transaction} viewerId={user.id} />
          <DemoPanelForTransaction transaction={transaction} />
        </div>
      </div>
    </>
  )
}
