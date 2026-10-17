import type { Metadata } from "next"
import { Suspense } from "react"
import { PageLoading } from "@/components/feedback/states"
import { DisputeDetailView } from "@/features/disputes/components/dispute-detail-view"

export const metadata: Metadata = { title: "Réclamation" }

export default function DisputePage({ params }: PageProps<"/reclamations/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      {params.then(({ id }) => (
        <DisputeDetailView id={id} />
      ))}
    </Suspense>
  )
}
