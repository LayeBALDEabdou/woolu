"use client"

import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback/states"
import { PageHeader } from "@/components/layout/page-header"
import { usePaymentHistory } from "../hooks"
import { PaymentAttemptsTable } from "./payment-attempts-table"

export function PaymentsHistoryView() {
  const query = usePaymentHistory()
  return (
    <>
      <PageHeader
        title="Paiements"
        description="Toutes les tentatives de paiement liées à vos transactions, telles qu'enregistrées par le serveur."
      />
      {query.isPending ? (
        <LoadingRows rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="Aucun paiement" description="Les paiements apparaîtront ici dès qu'une facture aura été générée." />
      ) : (
        <PaymentAttemptsTable attempts={query.data} showTransaction />
      )}
    </>
  )
}
