"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useServices } from "@/components/providers/services-provider"
import { useSession } from "@/features/auth/hooks"
import { queryKeys } from "@/lib/api/query-keys"
import type { NotificationPreferences } from "./types"

export function useNotifications() {
  const { notifications } = useServices()
  const { data: session } = useSession()
  return useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => notifications.list(),
    // Pas d'appel tant que la session n'est pas établie (la navigation est rendue avant l'AuthGuard).
    enabled: Boolean(session),
    refetchInterval: 30_000,
  })
}

export function useUnreadCount(): number {
  const { data } = useNotifications()
  return data?.filter((notification) => !notification.readAt).length ?? 0
}

export function useMarkNotificationRead() {
  const { notifications } = useServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id?: string) => (id ? notifications.markRead(id) : notifications.markAllRead()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list }),
  })
}

export function useNotificationPreferences() {
  const { notifications } = useServices()
  return useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: () => notifications.getPreferences(),
  })
}

export function useUpdateNotificationPreferences() {
  const { notifications } = useServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (preferences: NotificationPreferences) => notifications.updatePreferences(preferences),
    onSuccess: (preferences) => queryClient.setQueryData(queryKeys.notifications.preferences, preferences),
  })
}
