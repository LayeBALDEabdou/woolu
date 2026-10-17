"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Gavel, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { DetailList } from "@/components/data-display/detail-list"
import { DemoSimulatorPanel } from "@/components/demo/demo-simulator-panel"
import { ErrorState, PageLoading } from "@/components/feedback/states"
import { TextareaField } from "@/components/forms/form-fields"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrentUser } from "@/features/auth/hooks"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatDateTime } from "@/lib/formatters/date"
import { handleFormError } from "@/lib/forms"
import { cn } from "@/lib/utils"
import { useDispute, useReplyToDispute } from "../hooks"
import {
  DISPUTE_OUTCOME_LABELS,
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_PRESENTATION,
  isDisputeActive,
} from "../presentation"
import { type DisputeReplyValues, disputeReplySchema } from "../schemas/dispute-schemas"
import type { Dispute, DisputeAuthor } from "../types"
import { DisputeStatusBadge } from "./dispute-status-badge"

const AUTHOR_LABELS: Record<DisputeAuthor, string> = {
  client: "Client",
  merchant: "Vendeur / prestataire",
  woolu: "Équipe Wóolu",
}

function ReplyForm({ dispute }: { dispute: Dispute }) {
  const reply = useReplyToDispute(dispute.id)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DisputeReplyValues>({ resolver: zodResolver(disputeReplySchema), defaultValues: { body: "" } })

  const onSubmit = handleSubmit(({ body }) =>
    reply.mutate(body, {
      onSuccess: () => {
        toast.success("Message envoyé.")
        reset()
      },
      onError: (error) => handleFormError(error, setError, ["body"]),
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 border-t pt-4" aria-label="Répondre sur le dossier">
      <TextareaField label="Votre réponse" rows={3} error={errors.body?.message} {...register("body")} />
      <div className="flex justify-end">
        <Button type="submit" disabled={reply.isPending}>
          {reply.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Envoyer
        </Button>
      </div>
    </form>
  )
}

export function DisputeDetailView({ id }: { id: string }) {
  const user = useCurrentUser()
  const query = useDispute(id)

  if (query.isPending) return <PageLoading />
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title={isApiError(query.error) && query.error.code === "NOT_FOUND" ? "Réclamation introuvable" : undefined}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const dispute = query.data
  const active = isDisputeActive(dispute.status)
  const viewerRole: DisputeAuthor | null =
    dispute.clientUserId === user.id ? "client" : dispute.merchantUserId === user.id ? "merchant" : null

  return (
    <>
      <PageHeader
        back={{ href: "/reclamations", label: "Réclamations" }}
        title={`Réclamation ${dispute.reference}`}
        description={
          <>
            Transaction{" "}
            <Link href={`/transactions/${dispute.transactionId}`} className="font-medium text-brand-700 hover:underline">
              {dispute.transactionReference} · {dispute.transactionTitle}
            </Link>
          </>
        }
        actions={<DisputeStatusBadge status={dispute.status} className="h-7 text-sm" />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {dispute.decision ? (
            <Card className="border-brand-500/30 bg-brand-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="size-4 text-brand-700" aria-hidden />
                  Décision de l&apos;équipe Wóolu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-base font-semibold text-brand-900">{DISPUTE_OUTCOME_LABELS[dispute.decision.outcome]}</p>
                <p className="text-foreground/90">{dispute.decision.summary}</p>
                <p className="text-xs text-muted-foreground">Rendue le {formatDateTime(dispute.decision.decidedAt)}</p>
              </CardContent>
            </Card>
          ) : (
            <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              {DISPUTE_STATUS_PRESENTATION[dispute.status].description} Les fonds restent bloqués jusqu&apos;à la
              décision.
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Problème signalé</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  { label: "Motif", value: DISPUTE_REASON_LABELS[dispute.reason] },
                  { label: "Ouverte par", value: `${dispute.openedByName} le ${formatDate(dispute.createdAt)}` },
                  { label: "Description", value: <span className="whitespace-pre-line">{dispute.description}</span>, wide: true },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Échanges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dispute.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
              ) : (
                <ol className="space-y-3">
                  {dispute.messages.map((message) => {
                    const mine = message.author === viewerRole
                    return (
                      <li
                        key={message.id}
                        className={cn(
                          "max-w-[90%] rounded-xl p-3 text-sm",
                          message.author === "woolu"
                            ? "mx-auto max-w-full border border-brand-500/30 bg-brand-50"
                            : mine
                              ? "ml-auto bg-brand-800 text-white"
                              : "bg-muted",
                        )}
                      >
                        <p className={cn("mb-1 text-xs font-medium", mine ? "text-brand-100" : "text-muted-foreground")}>
                          {message.authorName}
                          {message.author === "woolu" ? "" : ` · ${AUTHOR_LABELS[message.author]}`} ·{" "}
                          {formatDateTime(message.createdAt)}
                        </p>
                        <p className="whitespace-pre-line">{message.body}</p>
                      </li>
                    )
                  })}
                </ol>
              )}
              {active && viewerRole ? (
                <ReplyForm dispute={dispute} />
              ) : (
                <p className="border-t pt-4 text-sm text-muted-foreground">Ce dossier n&apos;accepte plus de messages.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique du dossier</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {dispute.history.map((change, index) => (
                  <li key={`${change.status}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                    <DisputeStatusBadge status={change.status} />
                    <time dateTime={change.at} className="text-xs text-muted-foreground">
                      {formatDateTime(change.at)}
                    </time>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Client : </span>
                {dispute.clientName}
              </p>
              <p>
                <span className="text-muted-foreground">Vendeur / prestataire : </span>
                {dispute.merchantName}
              </p>
            </CardContent>
          </Card>
          <DemoSimulatorPanel activeDisputeId={active ? dispute.id : null} />
        </div>
      </div>
    </>
  )
}
