"use client"

import { useMutation } from "@tanstack/react-query"
import { useServices } from "@/components/providers/services-provider"
import { useApplyTransactionUpdate } from "@/features/transactions/hooks"
import type { CompleteDeliveryInput, StartDeliveryInput } from "./services/delivery-service"

export function useStartDelivery(transactionId: string) {
  const { deliveries } = useServices()
  const applyUpdate = useApplyTransactionUpdate()
  return useMutation({
    mutationFn: (input: StartDeliveryInput) => deliveries.start(transactionId, input),
    onSuccess: applyUpdate,
  })
}

export function useCompleteDelivery(transactionId: string) {
  const { deliveries } = useServices()
  const applyUpdate = useApplyTransactionUpdate()
  return useMutation({
    mutationFn: (input: CompleteDeliveryInput) => deliveries.complete(transactionId, input),
    onSuccess: applyUpdate,
  })
}

export function useConfirmReceipt(transactionId: string) {
  const { deliveries } = useServices()
  const applyUpdate = useApplyTransactionUpdate()
  return useMutation({
    mutationFn: () => deliveries.confirmReceipt(transactionId),
    onSuccess: applyUpdate,
  })
}
