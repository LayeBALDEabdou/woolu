"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useServices } from "@/components/providers/services-provider"
import { queryKeys } from "@/lib/api/query-keys"
import type { PaymentMethod } from "./types"

/** Fréquence de relecture du statut tant qu'un dépôt est en attente côté serveur. */
export const PAYMENT_POLL_INTERVAL_MS = 5_000

export function useTransactionPayments(transactionId: string) {
  const { payments } = useServices()
  return useQuery({
    queryKey: queryKeys.payments.byTransaction(transactionId),
    queryFn: () => payments.listForTransaction(transactionId),
    // Le statut n'est jamais déduit localement : on relit le serveur tant qu'un paiement est en attente.
    refetchInterval: (query) =>
      query.state.data?.some((attempt) => attempt.status === "pending") ? PAYMENT_POLL_INTERVAL_MS : false,
  })
}

export function usePaymentHistory() {
  const { payments } = useServices()
  return useQuery({ queryKey: queryKeys.payments.history, queryFn: () => payments.listHistory() })
}

export function useInitiatePayment(transactionId: string) {
  const { payments } = useServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (method: PaymentMethod) => payments.initiate(transactionId, method),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(transactionId) })
    },
  })
}
