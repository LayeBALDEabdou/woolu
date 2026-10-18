"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Info, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { Amount } from "@/components/data-display/amount"
import { EmptyState, ErrorState, PageLoading } from "@/components/feedback/states"
import { TextareaField } from "@/components/forms/form-fields"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCurrentUser } from "@/features/auth/hooks"
import { checkAction } from "@/features/transactions/domain/transitions"
import { useTransaction } from "@/features/transactions/hooks"
import { handleFormError } from "@/lib/forms"
import { useOpenDispute } from "../hooks"
import { DISPUTE_REASONS_BY_KIND, DISPUTE_REASON_LABELS } from "../presentation"
import { type OpenDisputeValues, openDisputeSchema } from "../schemas/dispute-schemas"

type Parsed = ReturnType<typeof openDisputeSchema.parse>

export function OpenDisputeView({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const user = useCurrentUser()
  const transactionQuery = useTransaction(transactionId)
  const openDispute = useOpenDispute()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OpenDisputeValues, unknown, Parsed>({
    resolver: zodResolver(openDisputeSchema),
    defaultValues: { description: "", confirmAccuracy: false },
  })

  if (transactionQuery.isPending) return <PageLoading />
  if (transactionQuery.isError) return <ErrorState error={transactionQuery.error} onRetry={() => void transactionQuery.refetch()} />

  const transaction = transactionQuery.data
  const check = checkAction("open_dispute", transaction, { userId: user.id })
  const back = { href: `/transactions/${transaction.id}`, label: "Retour à la transaction" }

  if (!check.allowed) {
    return (
      <>
        <PageHeader back={back} title="Signaler un problème" />
        <EmptyState
          icon={<Lock className="size-5" aria-hidden />}
          title="Réclamation impossible"
          description={check.reason}
          action={
            transaction.activeDisputeId ? (
              <Button asChild>
                <Link href={`/reclamations/${transaction.activeDisputeId}`}>Voir la réclamation en cours</Link>
              </Button>
            ) : null
          }
        />
      </>
    )
  }

  const onSubmit = handleSubmit(({ reason, description }) =>
    openDispute.mutate(
      { transactionId: transaction.id, reason, description },
      {
        onSuccess: (dispute) => {
          toast.success(`Réclamation ${dispute.reference} ouverte. Les fonds restent bloqués.`)
          router.push(`/reclamations/${dispute.id}`)
        },
        onError: (error) => handleFormError(error, setError, ["reason", "description"]),
      },
    ),
  )

  return (
    <>
      <PageHeader
        back={back}
        title="Signaler un problème"
        description={
          <>
            {transaction.reference} · {transaction.title} · <Amount value={transaction.amount} />
          </>
        }
      />
      <div className="mb-6 flex gap-3 rounded-xl border border-warning/30 bg-warning-surface p-4 text-sm text-warning-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          L&apos;ouverture d&apos;une réclamation bloque la libération des fonds. Le vendeur sera notifié et pourra
          répondre. La décision finale revient à l&apos;équipe Wóolu.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate aria-label="Ouverture d'une réclamation" className="max-w-2xl rounded-xl border bg-card p-5">
        <FieldGroup>
          <FieldSet>
            <FieldLegend variant="label">Motif</FieldLegend>
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-2">
                  {DISPUTE_REASONS_BY_KIND[transaction.kind].map((reason) => (
                    <FieldLabel key={reason} htmlFor={`reason-${reason}`}>
                      <Field orientation="horizontal">
                        <RadioGroupItem value={reason} id={`reason-${reason}`} aria-invalid={errors.reason ? true : undefined} />
                        <span className="text-sm font-medium">{DISPUTE_REASON_LABELS[reason]}</span>
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.reason ? <FieldError>{errors.reason.message}</FieldError> : null}
          </FieldSet>

          <TextareaField
            label="Description du problème"
            description="Décrivez ce qui ne correspond pas aux conditions acceptées : faits, dates, échanges avec le vendeur."
            rows={6}
            error={errors.description?.message}
            {...register("description")}
          />

          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Pièces justificatives (photos, documents) : l&apos;envoi de fichiers n&apos;est pas encore disponible.
            Conservez-les, l&apos;équipe Wóolu pourra vous les demander.
          </div>

          <Controller
            control={control}
            name="confirmAccuracy"
            render={({ field }) => (
              <Field orientation="horizontal" data-invalid={errors.confirmAccuracy ? true : undefined}>
                <Checkbox
                  id="confirmAccuracy"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-invalid={errors.confirmAccuracy ? true : undefined}
                />
                <FieldLabel htmlFor="confirmAccuracy" className="font-normal">
                  Je certifie que les informations fournies sont exactes.
                </FieldLabel>
              </Field>
            )}
          />
          {errors.confirmAccuracy ? <FieldError>{errors.confirmAccuracy.message}</FieldError> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline" size="lg">
              <Link href={back.href}>Annuler</Link>
            </Button>
            <Button type="submit" size="lg" disabled={openDispute.isPending}>
              {openDispute.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Ouvrir la réclamation
            </Button>
          </div>
        </FieldGroup>
      </form>
    </>
  )
}
