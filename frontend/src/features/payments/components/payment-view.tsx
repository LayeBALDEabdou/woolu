"use client"

import Link from "next/link"
import { useEffect } from "react"
import { AlertTriangle, CheckCircle2, Loader2, ReceiptText, RefreshCw, Zap } from "lucide-react"
import { toast } from "sonner"
import { Amount } from "@/components/data-display/amount"
import { DemoSimulatorPanel } from "@/components/demo/demo-simulator-panel"
import { EmptyState, ErrorState, PageLoading } from "@/components/feedback/states"
import { PageHeader } from "@/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrentUser } from "@/features/auth/hooks"
import { checkAction } from "@/features/transactions/domain/transitions"
import { useTransaction } from "@/features/transactions/hooks"
import { getErrorMessage } from "@/lib/api/errors"
import { useInitiatePayment, useTransactionPayments } from "../hooks"
import { PAYMENT_METHOD_LABELS } from "../presentation"
import { canInitiatePayment, findPendingAttempt } from "../rules"
import { EscrowIndicator } from "./escrow-indicator"
import { DepositDisplay } from "./deposit-display"
import { PaymentAttemptsTable } from "./payment-attempts-table"

export function PaymentView({ transactionId }: { transactionId: string }) {
  const user = useCurrentUser()
  const transactionQuery = useTransaction(transactionId)
  const paymentsQuery = useTransactionPayments(transactionId)
  const initiate = useInitiatePayment(transactionId)
  const refetchTransaction = transactionQuery.refetch
  useEffect(() => {
    if (paymentsQuery.data?.some((attempt) => attempt.status === "confirmed")) {
      void refetchTransaction()
    }
  }, [paymentsQuery.data, refetchTransaction])

  if (transactionQuery.isPending || paymentsQuery.isPending) return <PageLoading />
  if (transactionQuery.isError) return <ErrorState error={transactionQuery.error} onRetry={() => void transactionQuery.refetch()} />
  if (paymentsQuery.isError) return <ErrorState error={paymentsQuery.error} onRetry={() => void paymentsQuery.refetch()} />

  const transaction = transactionQuery.data
  const attempts = paymentsQuery.data
  const pending = findPendingAttempt(attempts)
  const lastAttempt = attempts[0]
  const payCheck = checkAction("pay", transaction, { userId: user.id })
  const canStart = payCheck.allowed && canInitiatePayment(transaction, attempts)
  const paymentConfirmed = attempts.some((attempt) => attempt.status === "confirmed")

  const startPayment = () =>
    initiate.mutate("usdc", {
      onSuccess: () => toast.success("Adresse de paiement créée. Envoyez les USDC pour continuer."),
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <>
      <PageHeader
        back={{ href: `/transactions/${transaction.id}`, label: "Retour à la transaction" }}
        title="Paiement"
        description={`${transaction.reference} · ${transaction.title}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {paymentConfirmed ? (
            <Card className="border-brand-500/30">
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-start gap-3" role="status">
                  <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-brand-700" aria-hidden />
                  <div>
                    <p className="text-lg font-semibold text-brand-900">Paiement confirmé par le serveur</p>
                    <p className="text-sm text-muted-foreground">
                      Le vendeur ou prestataire est notifié et peut démarrer la livraison.
                    </p>
                  </div>
                </div>
                <EscrowIndicator transaction={transaction} />
                <Button asChild variant="outline">
                  <Link href={`/transactions/${transaction.id}`}>Suivre la transaction</Link>
                </Button>
              </CardContent>
            </Card>
          ) : pending ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-4 text-brand-700" aria-hidden />
                  Dépôt USDC à effectuer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <DepositDisplay attempt={pending} />
                <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  <Loader2 className="size-4 animate-spin text-brand-700" aria-hidden />
                  En attente de la confirmation du paiement par le serveur. Cette page se met à jour automatiquement.
                </div>
              </CardContent>
            </Card>
          ) : !payCheck.allowed ? (
            <EmptyState
              title="Paiement indisponible"
              description={payCheck.reason}
              action={
                <Button asChild variant="outline">
                  <Link href={`/transactions/${transaction.id}`}>Retour à la transaction</Link>
                </Button>
              }
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Régler la transaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {lastAttempt && (lastAttempt.status === "failed" || lastAttempt.status === "expired") ? (
                  <Alert variant={lastAttempt.status === "failed" ? "destructive" : "default"}>
                    <AlertTriangle aria-hidden />
                    <AlertTitle>
                      {lastAttempt.status === "failed"
                        ? "Le dernier paiement a échoué"
                        : "La dernière demande de paiement a expiré"}
                    </AlertTitle>
                    <AlertDescription>
                      {lastAttempt.failureReason ?? "Aucun fonds n'a été reçu."} Vous pouvez créer une nouvelle adresse.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">Méthode de paiement</legend>
                  <div className="flex items-center gap-3 rounded-xl border-2 border-brand-600 bg-brand-50/60 p-4">
                    <Zap className="size-5 text-brand-700" aria-hidden />
                    <div className="flex-1">
                      <p className="font-medium">{PAYMENT_METHOD_LABELS.usdc}</p>
                      <p className="text-xs text-muted-foreground">Seule méthode prise en charge actuellement.</p>
                    </div>
                    <CheckCircle2 className="size-5 text-brand-700" aria-label="Sélectionnée" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envoyez uniquement des USDC sur le réseau Solana. Mobile Money n&apos;est pas disponible.
                  </p>
                </fieldset>

                <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                  En continuant, le serveur Wóolu crée une adresse de dépôt Bitnob et calcule le montant USDC. Le paiement
                  ne sera considéré comme effectué qu&apos;après confirmation du dépôt par le serveur.
                </div>

                <Button size="lg" onClick={startPayment} disabled={!canStart || initiate.isPending} className="w-full sm:w-auto">
                  {initiate.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : lastAttempt ? (
                    <RefreshCw aria-hidden />
                  ) : (
                    <ReceiptText aria-hidden />
                  )}
                  {lastAttempt ? "Créer une nouvelle adresse" : "Obtenir l'adresse de paiement"}
                </Button>
              </CardContent>
            </Card>
          )}

          <section aria-labelledby="attempts-title" className="space-y-3">
            <h2 id="attempts-title" className="font-semibold">
              Historique des tentatives
            </h2>
            {attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune tentative pour le moment.</p>
            ) : (
              <PaymentAttemptsTable attempts={attempts} />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">{transaction.title}</p>
              <p className="text-muted-foreground">
                {transaction.kind === "service" ? "Prestataire" : "Vendeur"} : {transaction.merchant.fullName}
              </p>
              <div className="flex items-end justify-between border-t pt-3">
                <span className="text-muted-foreground">Montant à payer</span>
                <Amount value={transaction.amount} className="text-xl font-semibold text-brand-900" />
              </div>
              <p className="text-xs text-muted-foreground">Frais de service : non définis à ce stade.</p>
            </CardContent>
          </Card>
          <DemoSimulatorPanel pendingAttempt={pending ?? null} />
        </div>
      </div>
    </>
  )
}
