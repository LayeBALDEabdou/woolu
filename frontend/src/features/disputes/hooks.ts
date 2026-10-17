"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useServices } from "@/components/providers/services-provider"
import { queryKeys } from "@/lib/api/query-keys"
import type { OpenDisputeInput } from "./types"

export function useDisputes() {
  const { disputes } = useServices()
  return useQuery({ queryKey: queryKeys.disputes.list, queryFn: () => disputes.list() })
}

export function useDispute(id: string) {
  const { disputes } = useServices()
  return useQuery({ queryKey: queryKeys.disputes.detail(id), queryFn: () => disputes.get(id) })
}

function useInvalidateDisputeViews() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [queryKeys.disputes.all, queryKeys.transactions.all, queryKeys.dashboard, queryKeys.notifications.all]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }
}

export function useOpenDispute() {
  const { disputes } = useServices()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateDisputeViews()
  return useMutation({
    mutationFn: (input: OpenDisputeInput) => disputes.open(input),
    onSuccess: (dispute) => {
      queryClient.setQueryData(queryKeys.disputes.detail(dispute.id), dispute)
      invalidate()
    },
  })
}

export function useReplyToDispute(id: string) {
  const { disputes } = useServices()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateDisputeViews()
  return useMutation({
    mutationFn: (body: string) => disputes.reply(id, body),
    onSuccess: (dispute) => {
      queryClient.setQueryData(queryKeys.disputes.detail(dispute.id), dispute)
      invalidate()
    },
  })
}
