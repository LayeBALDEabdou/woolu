"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback/states"
import { PageHeader } from "@/components/layout/page-header"
import { formatDate } from "@/lib/formatters/date"
import { useDisputes } from "../hooks"
import { DISPUTE_REASON_LABELS } from "../presentation"
import { DisputeStatusBadge } from "./dispute-status-badge"

export function DisputesListView() {
  const query = useDisputes()
  return (
    <>
      <PageHeader
        title="Réclamations"
        description="Les dossiers ouverts sur vos transactions. Tant qu'un dossier est actif, les fonds restent bloqués."
      />
      {query.isPending ? (
        <LoadingRows rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="Aucune réclamation"
          description="Si un produit ou un service ne correspond pas aux conditions, vous pourrez signaler un problème depuis la transaction."
        />
      ) : (
        <ul className="space-y-3">
          {query.data.map((dispute) => (
            <li key={dispute.id}>
              <Link
                href={`/reclamations/${dispute.id}`}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-brand-500/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tabular text-xs font-medium text-muted-foreground">{dispute.reference}</span>
                    <DisputeStatusBadge status={dispute.status} />
                  </div>
                  <p className="truncate font-medium text-foreground">{dispute.transactionTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {DISPUTE_REASON_LABELS[dispute.reason]} · ouverte le {formatDate(dispute.createdAt)} · mise à jour le{" "}
                    {formatDate(dispute.updatedAt)}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
