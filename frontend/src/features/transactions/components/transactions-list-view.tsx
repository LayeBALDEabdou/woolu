"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react"
import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback/states"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/features/auth/hooks"
import { isMerchantRole } from "@/features/auth/roles"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useTransactions } from "../hooks"
import { TransactionFilters, type TransactionFiltersValue } from "./transaction-filters"
import { TransactionsTable } from "./transactions-table"

const PAGE_SIZE = 8

const DEFAULT_FILTERS: TransactionFiltersValue = { search: "", status: "all", period: "all", sort: "created_desc" }

export function TransactionsListView() {
  const user = useCurrentUser()
  const isMerchant = isMerchantRole(user.role)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const search = useDebouncedValue(filters.search)

  const query = useTransactions({ ...filters, search, page, pageSize: PAGE_SIZE })
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)

  const onFiltersChange = (next: TransactionFiltersValue) => {
    setFilters(next)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Toutes les transactions dont vous êtes partie prenante."
        actions={
          isMerchant ? (
            <Button asChild>
              <Link href="/transactions/nouvelle">
                <Plus aria-hidden />
                Nouvelle transaction
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="space-y-4">
        <TransactionFilters value={filters} onChange={onFiltersChange} />

        <div aria-live="polite" className="flex min-h-5 items-center gap-2 text-sm text-muted-foreground">
          {query.data ? (
            <span>
              {query.data.total} transaction{query.data.total > 1 ? "s" : ""}
            </span>
          ) : null}
          {query.isFetching && !query.isPending ? <Loader2 className="size-3.5 animate-spin" aria-label="Actualisation" /> : null}
        </div>

        {query.isPending ? (
          <LoadingRows rows={5} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.items.length === 0 ? (
          isFiltered ? (
            <EmptyState
              title="Aucun résultat"
              description="Aucune transaction ne correspond à ces critères."
              action={
                <Button variant="outline" onClick={() => onFiltersChange(DEFAULT_FILTERS)}>
                  Réinitialiser les filtres
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Aucune transaction pour le moment"
              description={
                isMerchant
                  ? "Créez votre première transaction pour la proposer à un client."
                  : "Les propositions que vous recevrez d'un vendeur ou prestataire apparaîtront ici."
              }
              action={
                isMerchant ? (
                  <Button asChild>
                    <Link href="/transactions/nouvelle">Créer une transaction</Link>
                  </Button>
                ) : null
              }
            />
          )
        ) : (
          <>
            <TransactionsTable transactions={query.data.items} viewerId={user.id} />
            {totalPages > 1 ? (
              <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft aria-hidden />
                  Précédente
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {page} sur {totalPages}
                </p>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Suivante
                  <ChevronRight aria-hidden />
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
