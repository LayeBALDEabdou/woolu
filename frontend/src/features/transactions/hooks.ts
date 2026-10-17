"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useServices } from "@/components/providers/services-provider"
import { queryKeys } from "@/lib/api/query-keys"
import type { CreateTransactionInput, Transaction, TransactionListParams } from "./types"

export function useTransactions(params: TransactionListParams) {
  const { transactions } = useServices()
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => transactions.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useTransaction(id: string) {
  const { transactions } = useServices()
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => transactions.get(id),
  })
}

export function useDashboardSummary() {
  const { transactions } = useServices()
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: () => transactions.getDashboardSummary() })
}

/**
 * Après toute mutation sur une transaction : la réponse serveur devient la vérité
 * pour le détail, et les vues dérivées (listes, tableau de bord, notifications) sont rafraîchies.
 */
export function useApplyTransactionUpdate() {
  const queryClient = useQueryClient()
  return (transaction: Transaction) => {
    queryClient.setQueryData(queryKeys.transactions.detail(transaction.id), transaction)
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all })
  }
}

export function useCreateTransaction() {
  const { transactions } = useServices()
  const applyUpdate = useApplyTransactionUpdate()
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => transactions.create(input),
    onSuccess: applyUpdate,
  })
}

type SimpleAction =
  | { type: "send_to_client" }
  | { type: "accept_terms" }
  | { type: "refuse_terms"; reason: string | null }
  | { type: "cancel"; reason: string | null }

export function useTransactionAction(id: string) {
  const { transactions } = useServices()
  const applyUpdate = useApplyTransactionUpdate()
  return useMutation({
    mutationFn: (action: SimpleAction) => {
      switch (action.type) {
        case "send_to_client":
          return transactions.sendToClient(id)
        case "accept_terms":
          return transactions.acceptTerms(id)
        case "refuse_terms":
          return transactions.refuseTerms(id, action.reason)
        case "cancel":
          return transactions.cancel(id, action.reason)
      }
    },
    onSuccess: applyUpdate,
  })
}
