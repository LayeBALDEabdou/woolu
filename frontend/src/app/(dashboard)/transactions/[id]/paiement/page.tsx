import type { Metadata } from "next"
import { Suspense } from "react"
import { PageLoading } from "@/components/feedback/states"
import { PaymentView } from "@/features/payments/components/payment-view"

export const metadata: Metadata = { title: "Paiement" }

export default function PaymentPage({ params }: PageProps<"/transactions/[id]/paiement">) {
  return (
    <Suspense fallback={<PageLoading />}>
      {params.then(({ id }) => (
        <PaymentView transactionId={id} />
      ))}
    </Suspense>
  )
}
