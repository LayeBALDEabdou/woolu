"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useServices } from "@/components/providers/services-provider"
import { queryKeys } from "@/lib/api/query-keys"
import type { LoginInput, RegisterInput, Session, UpdateProfileInput } from "./types"

export function useSession() {
  const { auth } = useServices()
  return useQuery({ queryKey: queryKeys.session, queryFn: () => auth.getSession(), staleTime: 60_000 })
}

/** Utilisateur connecté ; à n'utiliser que sous <AuthGuard>, qui garantit la présence d'une session. */
export function useCurrentUser() {
  const { data } = useSession()
  if (!data) throw new Error("useCurrentUser nécessite une session active (voir AuthGuard).")
  return data.user
}

/** Après un changement d'identité, on purge tout le cache pour ne rien montrer de l'ancien compte. */
function useStartSession() {
  const queryClient = useQueryClient()
  return (session: Session) => {
    queryClient.clear()
    queryClient.setQueryData(queryKeys.session, session)
  }
}

export function useLogin() {
  const { auth } = useServices()
  const startSession = useStartSession()
  return useMutation({ mutationFn: (input: LoginInput) => auth.login(input), onSuccess: startSession })
}

export function useRegister() {
  const { auth } = useServices()
  const startSession = useStartSession()
  return useMutation({ mutationFn: (input: RegisterInput) => auth.register(input), onSuccess: startSession })
}

export function useSwitchDemoAccount() {
  const { demo } = useServices()
  const startSession = useStartSession()
  return useMutation({
    mutationFn: (userId: string) => {
      if (!demo) throw new Error("Mode démonstration inactif.")
      return demo.switchAccount(userId)
    },
    onSuccess: startSession,
  })
}

export function useLogout() {
  const { auth } = useServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => auth.logout(),
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(queryKeys.session, null)
    },
  })
}

export function useUpdateProfile() {
  const { auth } = useServices()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => auth.updateProfile(input),
    onSuccess: (user) => {
      queryClient.setQueryData<Session | null>(queryKeys.session, (session) =>
        session ? { ...session, user } : session,
      )
    },
  })
}
