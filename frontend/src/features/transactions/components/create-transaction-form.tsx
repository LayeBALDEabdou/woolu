"use client"

import { useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { ArrowLeft, Loader2, PackageOpen, Wrench } from "lucide-react"
import { toast } from "sonner"
import { DetailList } from "@/components/data-display/detail-list"
import { TextField, TextareaField } from "@/components/forms/form-fields"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserRole } from "@/features/auth/types"
import { BUSINESS_RULES } from "@/lib/config/business-rules"
import { formatDate, todayInAppTimeZone } from "@/lib/formatters/date"
import { formatMoney, xof } from "@/lib/formatters/money"
import { handleFormError } from "@/lib/forms"
import { KIND_LABELS } from "../domain/presentation"
import { useCreateTransaction } from "../hooks"
import {
  type CreateTransactionFormValues,
  type CreateTransactionParsed,
  createTransactionSchema,
  defaultCreateTransactionValues,
  toCreateTransactionInput,
} from "../schemas/create-transaction-schema"
import { TRANSACTION_KINDS } from "../types"

const EDITABLE_FIELDS = [
  "kind",
  "title",
  "description",
  "clientName",
  "clientContact",
  "amount",
  "currency",
  "deadline",
  "specialConditions",
  "claimWindowDays",
] as const

const KIND_ICONS = { product: PackageOpen, service: Wrench } as const

export function CreateTransactionForm({ role }: { role: UserRole }) {
  const router = useRouter()
  const createTransaction = useCreateTransaction()
  const [schema] = useState(() => createTransactionSchema())
  const [step, setStep] = useState<"edit" | "review">("edit")
  const headingRef = useRef<HTMLHeadingElement>(null)

  const form = useForm<CreateTransactionFormValues, unknown, CreateTransactionParsed>({
    resolver: zodResolver(schema),
    defaultValues: defaultCreateTransactionValues(role === "prestataire" ? "service" : "product"),
    mode: "onTouched",
  })
  const {
    register,
    control,
    handleSubmit,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = form

  const minDeadline = useMemo(() => {
    const date = new Date(`${todayInAppTimeZone()}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + 1)
    return date.toISOString().slice(0, 10)
  }, [])

  const goToReview = async () => {
    const valid = await trigger(EDITABLE_FIELDS)
    if (!valid) {
      toast.error("Certains champs sont à corriger.")
      return
    }
    setStep("review")
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  const preview = step === "review" ? schema.safeParse({ ...getValues(), merchantAcceptsTerms: true }) : null

  const onSubmit = handleSubmit((values) =>
    createTransaction.mutate(toCreateTransactionInput(values), {
      onSuccess: (transaction) => {
        toast.success(`Transaction ${transaction.reference} créée. Vérifiez-la puis envoyez-la au client.`)
        router.push(`/transactions/${transaction.id}`)
      },
      onError: (error) => {
        setStep("edit")
        handleFormError(error, setError, EDITABLE_FIELDS)
      },
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Création d'une transaction" className="space-y-6">
      <ol className="flex gap-2 text-sm" aria-label="Étapes">
        {(["edit", "review"] as const).map((s, index) => (
          <li
            key={s}
            aria-current={step === s ? "step" : undefined}
            className={
              step === s
                ? "rounded-full bg-brand-800 px-3 py-1 font-medium text-white"
                : "rounded-full bg-muted px-3 py-1 text-muted-foreground"
            }
          >
            {index + 1}. {s === "edit" ? "Conditions" : "Récapitulatif"}
          </li>
        ))}
      </ol>

      <div hidden={step !== "edit"} className="space-y-6">
        <section className="rounded-xl border bg-card p-5">
          <FieldGroup>
            <FieldSet>
              <FieldLegend variant="label">Type de transaction</FieldLegend>
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-2">
                    {TRANSACTION_KINDS.map((kind) => {
                      const Icon = KIND_ICONS[kind]
                      return (
                        <FieldLabel key={kind} htmlFor={`kind-${kind}`}>
                          <Field orientation="horizontal">
                            <RadioGroupItem value={kind} id={`kind-${kind}`} />
                            <Icon className="size-4 text-brand-700" aria-hidden />
                            <span className="text-sm font-medium">{KIND_LABELS[kind]}</span>
                          </Field>
                        </FieldLabel>
                      )
                    })}
                  </RadioGroup>
                )}
              />
            </FieldSet>
            <TextField
              label="Titre de la transaction"
              placeholder="Ex. : Réfrigérateur 2 portes 300 L"
              error={errors.title?.message}
              {...register("title")}
            />
            <TextareaField
              label="Description du produit ou du service"
              description="Caractéristiques, état, quantité, livrables… Soyez précis : cette description fait foi en cas de litige."
              rows={5}
              error={errors.description?.message}
              {...register("description")}
            />
          </FieldGroup>
        </section>

        <section className="rounded-xl border bg-card p-5" aria-labelledby="client-section">
          <h2 id="client-section" className="mb-4 font-semibold">
            Client ou bénéficiaire
          </h2>
          <FieldGroup className="sm:grid sm:grid-cols-2">
            <TextField label="Nom complet" autoComplete="off" error={errors.clientName?.message} {...register("clientName")} />
            <TextField
              label="E-mail ou téléphone"
              autoComplete="off"
              placeholder="client@exemple.sn ou 77 123 45 67"
              description="Le client recevra la proposition sur son compte Wóolu."
              error={errors.clientContact?.message}
              {...register("clientContact")}
            />
          </FieldGroup>
        </section>

        <section className="rounded-xl border bg-card p-5" aria-labelledby="terms-section">
          <h2 id="terms-section" className="mb-4 font-semibold">
            Montant, délais et conditions
          </h2>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-[2fr_1fr_2fr]">
              <TextField
                label="Montant"
                inputMode="numeric"
                placeholder="25 000"
                description={`Entre ${formatMoney(xof(BUSINESS_RULES.minTransactionAmountXof))} et ${formatMoney(xof(BUSINESS_RULES.maxTransactionAmountXof))}.`}
                error={errors.amount?.message}
                {...register("amount")}
              />
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="currency">Devise</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="currency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>Seul le franc CFA est disponible.</FieldDescription>
                  </Field>
                )}
              />
              <TextField
                label="Date limite de livraison ou d'exécution"
                type="date"
                min={minDeadline}
                error={errors.deadline?.message}
                {...register("deadline")}
              />
            </div>
            <TextareaField
              label="Conditions particulières"
              optional
              rows={3}
              placeholder="Ex. : livraison à Dakar uniquement, garantie 6 mois…"
              error={errors.specialConditions?.message}
              {...register("specialConditions")}
            />
            <FieldSet>
              <FieldLegend variant="label">Politique de réclamation</FieldLegend>
              <FieldDescription>
                Délai dont dispose le client après la livraison pour confirmer la réception ou signaler un problème.
              </FieldDescription>
              <Controller
                control={control}
                name="claimWindowDays"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
                    {BUSINESS_RULES.claimWindowOptions.map((days) => (
                      <FieldLabel key={days} htmlFor={`claim-${days}`}>
                        <Field orientation="horizontal">
                          <RadioGroupItem value={String(days)} id={`claim-${days}`} />
                          <span className="text-sm font-medium">{days} jours</span>
                        </Field>
                      </FieldLabel>
                    ))}
                  </RadioGroup>
                )}
              />
              {errors.claimWindowDays ? <FieldError>{errors.claimWindowDays.message}</FieldError> : null}
            </FieldSet>
          </FieldGroup>
        </section>

        <div className="flex justify-end">
          <Button type="button" size="lg" onClick={goToReview}>
            Vérifier le récapitulatif
          </Button>
        </div>
      </div>

      {step === "review" && preview?.success ? (
        <section aria-labelledby="recap-title" className="space-y-5">
          <div className="rounded-xl border bg-card p-5">
            <h2 id="recap-title" ref={headingRef} tabIndex={-1} className="mb-4 text-lg font-semibold outline-none">
              Récapitulatif avant création
            </h2>
            <DetailList
              items={[
                { label: "Type", value: KIND_LABELS[preview.data.kind] },
                { label: "Titre", value: preview.data.title },
                { label: "Description", value: <span className="whitespace-pre-line">{preview.data.description}</span>, wide: true },
                { label: "Client", value: `${preview.data.clientName} (${preview.data.clientContact})` },
                {
                  label: "Montant",
                  value: <strong className="tabular text-base text-brand-900">{formatMoney(xof(preview.data.amount))}</strong>,
                },
                { label: "Date limite", value: formatDate(`${preview.data.deadline}T12:00:00Z`) },
                { label: "Délai de réclamation", value: `${preview.data.claimWindowDays} jours après livraison` },
                { label: "Conditions particulières", value: preview.data.specialConditions ?? "Aucune", wide: true },
              ]}
            />
          </div>

          <Controller
            control={control}
            name="merchantAcceptsTerms"
            render={({ field }) => (
              <Field orientation="horizontal" data-invalid={errors.merchantAcceptsTerms ? true : undefined} className="rounded-xl border bg-brand-50/60 p-4">
                <Checkbox
                  id="merchantAcceptsTerms"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-invalid={errors.merchantAcceptsTerms ? true : undefined}
                />
                <FieldLabel htmlFor="merchantAcceptsTerms" className="font-normal">
                  Je confirme l&apos;exactitude de ces informations et j&apos;accepte ces conditions. Le client
                  devra les accepter à son tour avant tout paiement.
                </FieldLabel>
              </Field>
            )}
          />
          {errors.merchantAcceptsTerms ? <FieldError>{errors.merchantAcceptsTerms.message}</FieldError> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep("edit")}>
              <ArrowLeft aria-hidden />
              Modifier
            </Button>
            <Button type="submit" size="lg" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Créer la transaction
            </Button>
          </div>
        </section>
      ) : null}
    </form>
  )
}
