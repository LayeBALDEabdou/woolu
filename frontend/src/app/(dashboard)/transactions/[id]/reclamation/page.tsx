import type { Metadata } from "next"
import { Suspense } from "react"
import { PageLoading } from "@/components/feedback/states"
import { OpenDisputeView } from "@/features/disputes/components/open-dispute-view"

export const metadata: Metadata = { title: "Signaler un problème" }

export default function OpenDisputePage({ params }: PageProps<"/transactions/[id]/reclamation">) {
  return (
    <Suspense fallback={<PageLoading />}>
      {params.then(({ id }) => (
        <OpenDisputeView transactionId={id} />
      ))}
    </Suspense>
  )
}
