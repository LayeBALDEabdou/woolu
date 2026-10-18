"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Point d'accroche pour un futur outil de suivi d'erreurs.
    console.error(error)
  }, [error])

  return (
    <main id="contenu" className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="max-w-md text-muted-foreground">
        La page n&apos;a pas pu s&apos;afficher. Aucune opération n&apos;a été effectuée de votre côté.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </main>
  )
}
