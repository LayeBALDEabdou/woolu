"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FlaskConical, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useServices } from "@/components/providers/services-provider"
import { Button } from "@/components/ui/button"
import type { PaymentAttempt } from "@/features/payments/types"
import { getErrorMessage } from "@/lib/api/errors"
import type { DemoSimulator } from "@/lib/services/types"

type SimulatorCommand = (demo: DemoSimulator) => Promise<void>

interface DemoSimulatorPanelProps {
  pendingAttempt?: PaymentAttempt | null
  activeDisputeId?: string | null
}

/**
 * Panneau réservé au mode démonstration. Chaque bouton représente un ÉVÉNEMENT SERVEUR
 * (webhook Bitnob, décision de l'équipe Wóolu), jamais une action de l'utilisateur.
 */
export function DemoSimulatorPanel({ pendingAttempt, activeDisputeId }: DemoSimulatorPanelProps) {
  const { demo } = useServices()
  const queryClient = useQueryClient()
  const simulate = useMutation({
    mutationFn: async ({ command }: { command: SimulatorCommand; label: string }) => {
      if (!demo) throw new Error("Mode démonstration inactif.")
      await command(demo)
    },
    onSuccess: (_data, { label }) => {
      toast.info(`Événement serveur simulé : ${label}`)
      void queryClient.invalidateQueries()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (!demo || (!pendingAttempt && !activeDisputeId)) return null

  const button = (label: string, command: SimulatorCommand, variant: "outline" | "destructive" = "outline") => (
    <Button
      size="sm"
      variant={variant}
      disabled={simulate.isPending}
      onClick={() => simulate.mutate({ command, label })}
      className="justify-start"
    >
      {simulate.isPending && simulate.variables?.label === label ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {label}
    </Button>
  )

  return (
    <aside
      aria-labelledby="demo-simulator-title"
      className="space-y-3 rounded-xl border-2 border-dashed border-warning/50 bg-warning-surface/50 p-4"
      data-testid="demo-simulator"
    >
      <div className="space-y-1">
        <h2 id="demo-simulator-title" className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
          <FlaskConical className="size-4" aria-hidden />
          Simulateur backend (démo)
        </h2>
        <p className="text-xs text-warning-foreground/90">
          Ces boutons imitent des événements reçus par le serveur. En production, ils n&apos;existent pas : le
          paiement est confirmé par Bitnob et les litiges sont tranchés par l&apos;équipe Wóolu.
        </p>
      </div>
      {pendingAttempt ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-warning-foreground">Webhook de paiement</p>
          {button("Paiement reçu et vérifié", (d) => d.confirmPayment(pendingAttempt.id))}
          {button("Paiement échoué", (d) => d.failPayment(pendingAttempt.id))}
          {button("Facture expirée", (d) => d.expirePayment(pendingAttempt.id))}
        </div>
      ) : null}
      {activeDisputeId ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-warning-foreground">Équipe Wóolu</p>
          {button("Demander des précisions", (d) => d.requestDisputeInformation(activeDisputeId))}
          {button("Passer le dossier en examen", (d) => d.startDisputeReview(activeDisputeId))}
          {button("Décider : libérer les fonds au vendeur", (d) => d.decideDispute(activeDisputeId, "release_to_merchant"))}
          {button("Décider : rembourser le client", (d) => d.decideDispute(activeDisputeId, "refund_client"))}
        </div>
      ) : null}
    </aside>
  )
}
