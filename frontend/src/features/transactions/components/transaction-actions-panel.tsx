"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertTriangle, CreditCard, Info, Send, ThumbsUp, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Amount } from "@/components/data-display/amount"
import { DetailList } from "@/components/data-display/detail-list"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CompleteDeliveryDialog } from "@/features/deliveries/components/complete-delivery-dialog"
import { ConfirmReceiptDialog } from "@/features/deliveries/components/confirm-receipt-dialog"
import { StartDeliveryDialog } from "@/features/deliveries/components/start-delivery-dialog"
import { getErrorMessage } from "@/lib/api/errors"
import { formatDate } from "@/lib/formatters/date"
import { getActionLabel } from "../domain/presentation"
import { type TransactionAction, getAvailableActions, getPartyRole } from "../domain/transitions"
import { useTransactionAction } from "../hooks"
import type { PartyRole, Transaction } from "../types"

/** Explique ce qui est attendu lorsque l'utilisateur n'a aucune action à mener. */
function waitingMessage(transaction: Transaction, role: PartyRole | null): string {
  const other = role === "merchant" ? transaction.client.fullName : transaction.merchant.fullName
  switch (transaction.status) {
    case "created":
      return "La proposition n'a pas encore été envoyée."
    case "pending_acceptance":
      return `En attente de la réponse de ${other} sur les conditions proposées.`
    case "pending_payment":
      return "Le client doit effectuer le paiement. Vous serez notifié dès que le serveur l'aura confirmé."
    case "payment_confirmed":
      return `Paiement confirmé. ${other} doit maintenant démarrer la livraison ou la prestation.`
    case "in_progress":
      return "Livraison ou prestation en cours."
    case "awaiting_confirmation":
      return `Le client dispose de ${transaction.claimWindowDays} jours pour confirmer la réception ou signaler un problème.`
    case "disputed":
      return "Une réclamation est en cours : les fonds restent bloqués jusqu'à la décision de l'équipe Wóolu."
    case "completed":
      return "Transaction terminée. La libération des fonds a été autorisée."
    case "cancelled":
      return "Cette transaction a été annulée."
    case "refunded":
      return "Le remboursement du client a été autorisé à l'issue du litige."
  }
}

function ReasonField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        Motif <span className="font-normal text-muted-foreground">(facultatif)</span>
      </Label>
      <Textarea id={id} rows={3} maxLength={500} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

export function TransactionActionsPanel({ transaction, viewerId }: { transaction: Transaction; viewerId: string }) {
  const actions = getAvailableActions(transaction, { userId: viewerId })
  const role = getPartyRole(transaction, { userId: viewerId })
  const mutation = useTransactionAction(transaction.id)
  const [reason, setReason] = useState("")
  const has = (action: TransactionAction) => actions.includes(action)

  const run = (input: Parameters<typeof mutation.mutateAsync>[0], success: string) =>
    mutation.mutateAsync(input).then(
      () => {
        toast.success(success)
        setReason("")
      },
      (error: unknown) => {
        toast.error(getErrorMessage(error))
        throw error
      },
    )

  const primary = actions.filter((a) => a !== "cancel" && a !== "refuse_terms")

  return (
    <Card className="border-brand-500/25" aria-labelledby="actions-title">
      <CardHeader>
        <CardTitle id="actions-title">{primary.length > 0 ? "Votre prochaine étape" : "Où en est-on ?"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {primary.length === 0 ? (
          <p className="flex gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {waitingMessage(transaction, role)}
          </p>
        ) : null}

        {transaction.status === "disputed" && transaction.activeDisputeId ? (
          <Button asChild variant="outline">
            <Link href={`/reclamations/${transaction.activeDisputeId}`}>Voir la réclamation</Link>
          </Button>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {has("send_to_client") ? (
            <ConfirmDialog
              trigger={
                <Button size="lg">
                  <Send aria-hidden />
                  {getActionLabel("send_to_client", transaction.kind)}
                </Button>
              }
              title="Envoyer la proposition au client"
              description={`${transaction.client.fullName} pourra consulter les conditions et les accepter ou les refuser. Elles ne pourront plus être modifiées.`}
              confirmLabel="Envoyer"
              pending={mutation.isPending}
              onConfirm={() => run({ type: "send_to_client" }, "Proposition envoyée au client.")}
            />
          ) : null}

          {has("accept_terms") ? (
            <ConfirmDialog
              trigger={
                <Button size="lg">
                  <ThumbsUp aria-hidden />
                  {getActionLabel("accept_terms", transaction.kind)}
                </Button>
              }
              title="Accepter les conditions"
              description="En acceptant, vous vous engagez sur les conditions ci-dessous. Vous pourrez ensuite procéder au paiement."
              confirmLabel="J'accepte les conditions"
              acknowledgement="J'ai lu la description, le montant, la date limite et les conditions particulières, et je les accepte."
              pending={mutation.isPending}
              onConfirm={() => run({ type: "accept_terms" }, "Conditions acceptées. Vous pouvez procéder au paiement.")}
            >
              <DetailList
                className="rounded-lg border p-3"
                items={[
                  { label: "Montant", value: <Amount value={transaction.amount} className="font-semibold" /> },
                  { label: "Date limite", value: formatDate(`${transaction.deadline}T12:00:00Z`) },
                  { label: "Délai de réclamation", value: `${transaction.claimWindowDays} jours après livraison` },
                  { label: "Conditions particulières", value: transaction.specialConditions ?? "Aucune", wide: true },
                ]}
              />
            </ConfirmDialog>
          ) : null}

          {has("pay") ? (
            <Button asChild size="lg">
              <Link href={`/transactions/${transaction.id}/paiement`}>
                <CreditCard aria-hidden />
                {getActionLabel("pay", transaction.kind)}
              </Link>
            </Button>
          ) : null}

          {has("start_delivery") ? <StartDeliveryDialog transaction={transaction} /> : null}
          {has("mark_delivered") ? <CompleteDeliveryDialog transaction={transaction} /> : null}
          {has("confirm_receipt") ? <ConfirmReceiptDialog transaction={transaction} /> : null}

          {has("open_dispute") ? (
            <Button asChild size="lg" variant="outline" className="border-warning/40 text-warning-foreground hover:bg-warning-surface">
              <Link href={`/transactions/${transaction.id}/reclamation`}>
                <AlertTriangle aria-hidden />
                {getActionLabel("open_dispute", transaction.kind)}
              </Link>
            </Button>
          ) : null}

          {has("refuse_terms") ? (
            <ConfirmDialog
              trigger={
                <Button size="lg" variant="outline">
                  <XCircle aria-hidden />
                  {getActionLabel("refuse_terms", transaction.kind)}
                </Button>
              }
              title="Refuser la proposition"
              description="La transaction sera annulée. Le vendeur ou prestataire en sera informé."
              confirmLabel="Refuser la proposition"
              variant="destructive"
              pending={mutation.isPending}
              onConfirm={() => run({ type: "refuse_terms", reason: reason.trim() || null }, "Proposition refusée.")}
            >
              <ReasonField id="refuse-reason" value={reason} onChange={setReason} />
            </ConfirmDialog>
          ) : null}

          {has("cancel") ? (
            <ConfirmDialog
              trigger={
                <Button size="lg" variant="ghost" className="text-destructive hover:bg-danger-surface hover:text-destructive">
                  {getActionLabel("cancel", transaction.kind)}
                </Button>
              }
              title="Annuler la transaction"
              description="Cette action est définitive. L'autre partie sera notifiée. Aucun paiement n'a été confirmé : aucun remboursement n'est nécessaire."
              confirmLabel="Annuler la transaction"
              variant="destructive"
              acknowledgement="Je comprends que l'annulation est définitive."
              pending={mutation.isPending}
              onConfirm={() => run({ type: "cancel", reason: reason.trim() || null }, "Transaction annulée.")}
            >
              <ReasonField id="cancel-reason" value={reason} onChange={setReason} />
            </ConfirmDialog>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
