import type { Metadata } from "next"
import { Suspense } from "react"
import { PageLoading } from "@/components/feedback/states"
import { TransactionDetailView } from "@/features/transactions/components/transaction-detail-view"

export const metadata: Metadata = { title: "Détail de la transaction" }

export default function TransactionPage({ params }: PageProps<"/transactions/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      {params.then(({ id }) => (
        <TransactionDetailView id={id} />
      ))}
    </Suspense>
  )
}
