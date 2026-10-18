"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ErrorState, PageLoading } from "@/components/feedback/states"
import { useSession } from "../hooks"

/**
 * Protège l'espace connecté côté interface. Ce n'est PAS une frontière de sécurité :
 * le backend refuse toute requête non authentifiée, quelle que soit l'interface.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const session = useSession()
  const isAnonymous = session.isSuccess && session.data === null

  useEffect(() => {
    if (isAnonymous) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      router.replace(`/connexion?redirect=${redirect}`)
    }
  }, [isAnonymous, router])

  if (session.isError) return <ErrorState error={session.error} onRetry={() => void session.refetch()} />
  if (!session.data) return <PageLoading />
  return <>{children}</>
}
